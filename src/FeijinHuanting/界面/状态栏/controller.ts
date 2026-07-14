import { Schema, type Schema as CasinoSchema } from '../../schema';
import type { GameAction, GameAdapter, GameEvent, GameKind, Player } from './games';
import { blackjackValue, fromSmallChips, gameAdapters, isRouletteWinner, ROULETTE_ODDS } from './games';

type RuntimeAdapter = GameAdapter<any, any>;
type AtomicOptions = {
  userMessage: string;
  events: GameEvent[];
  draft: CasinoSchema;
  allowCharacterUpdates?: boolean;
};

let transactionLocked = false;

function messageResult(result: string | GenerateToolCallResult): string {
  if (typeof result === 'string') return result;
  if (result.content) return result.content;
  throw new Error('模型返回了无法作为正文使用的工具调用');
}

function cloneMvuAt(messageId: number): Mvu.MvuData {
  return klona(Mvu.getMvuData({ type: 'message', message_id: messageId }));
}

function assertLatestFloor(): number {
  const current = getCurrentMessageId();
  const latest = getLastMessageId();
  if (current !== latest) throw new Error('历史楼层只读，请在最新楼层继续操作');
  return current;
}

function canonicalEventText(events: GameEvent[]): string {
  return events.map((event, index) => `${index + 1}. ${event.text}`).join('\n');
}

async function commitAtomic(options: AtomicOptions): Promise<void> {
  if (transactionLocked) throw new Error('上一项操作仍在处理，请勿重复点击');
  transactionLocked = true;
  try {
    const sourceMessageId = assertLatestFloor();
    const sourceMvu = cloneMvuAt(sourceMessageId);
    const protectedDraft = klona(options.draft);
    protectedDraft.$牌局隐藏状态.事务 = {
      ID: crypto.randomUUID(),
      状态: '生成中',
      前置楼层ID: sourceMessageId,
      错误: '',
    };
    const prompt = [
      options.userMessage,
      '',
      '请依据下列前端权威事件续写即时正文。不得改写牌、骰点、轮盘结果、合法动作、赔率、筹码结算或胜负。',
      canonicalEventText(options.events),
      '只在确有可见事件时更新当前互动人物、衣着、已知信息或当前赌约。结尾保留MVU更新与<StatusPlaceHolderImpl/>。',
    ].join('\n');
    const generated = messageResult(await generate({ user_input: prompt, should_stream: false }));
    const parsed = await Mvu.parseMessage(generated, { ...sourceMvu, stat_data: klona(protectedDraft) });
    const parsedStat = Schema.parse(parsed?.stat_data ?? protectedDraft);
    const finalStat = klona(protectedDraft);
    if (options.allowCharacterUpdates !== false) {
      finalStat.人物.活动角色 = parsedStat.人物.活动角色;
      finalStat.赌约 = parsedStat.赌约;
    }
    finalStat.$牌局隐藏状态.事务.状态 = '可提交';
    const finalData = { ...sourceMvu, stat_data: Schema.parse(finalStat) };
    const assistantMessage = generated.includes('<StatusPlaceHolderImpl/>') ? generated : `${generated}\n<StatusPlaceHolderImpl/>`;
    await createChatMessages([
      { role: 'user', message: options.userMessage, data: sourceMvu },
      { role: 'assistant', message: assistantMessage, data: finalData },
    ], { refresh: 'all' });
  } finally {
    transactionLocked = false;
  }
}

function adapterOf(kind: GameKind): RuntimeAdapter {
  return gameAdapters[kind] as RuntimeAdapter;
}

function runtimeFrom(stat: CasinoSchema): any {
  const serialized = stat.$牌局隐藏状态.随机结果.运行时状态;
  if (typeof serialized !== 'string' || !serialized) throw new Error('牌局运行时状态不存在，请重新开局');
  return JSON.parse(serialized);
}

function currentActor(kind: GameKind, state: any): string | undefined {
  if (kind === '骰子比大小') return state.phase === 'settled' ? undefined : state.players?.find((player: Player) => player.isUser)?.id;
  if (kind === '德州扑克') return state.seats?.[state.actingIndex]?.id;
  if (kind === '二十一点') {
    if (state.phase === 'insurance') return state.insurancePending?.[0];
    return state.hands?.[state.activeHand]?.playerId;
  }
  if (kind === '欧式轮盘') return state.phase === 'betting' ? state.players?.find((player: Player) => player.isUser)?.id : undefined;
  return undefined;
}

async function isolatedNpcDecision(adapter: RuntimeAdapter, state: any, actorId: string): Promise<GameAction> {
  const legal = adapter.legalActions(state, actorId);
  const fallback = adapter.npcDecision(state, actorId);
  if (!legal.length) return fallback;
  try {
    const response = messageResult(await generateRaw({
      should_silence: true,
      max_chat_history: 0,
      ordered_prompts: [
        { role: 'system', content: '你只为当前NPC选择一个合法牌局动作。你看不到也不得推测其他人的未公开手牌。只输出JSON。' },
        { role: 'user', content: JSON.stringify({ view: adapter.npcView(state, actorId), legalActions: legal }) },
      ],
      json_schema: {
        name: 'casino_npc_action',
        value: {
          type: 'object',
          properties: { id: { type: 'string', enum: legal.map(item => item.id) }, amount: { type: 'integer' } },
          required: ['id'],
          additionalProperties: false,
        },
      },
    }));
    const parsed = JSON.parse(response) as { id: string; amount?: number };
    const action: GameAction = { id: parsed.id, actorId, amount: parsed.amount };
    const match = legal.find(item => item.id === action.id);
    if (!match) return fallback;
    if (match.needsAmount && (action.amount === undefined || action.amount < (match.min ?? 0) || action.amount > (match.max ?? action.amount))) return fallback;
    return action;
  } catch (error) {
    console.warn('[绯金幻庭] NPC隔离决策失败，改用本地合法策略', error);
    return fallback;
  }
}

function syncPublic(stat: CasinoSchema, kind: GameKind, state: any, adapter: RuntimeAdapter, events: GameEvent[]): void {
  stat.$牌局隐藏状态.随机结果.运行时状态 = JSON.stringify(state);
  stat.$牌局隐藏状态.牌堆 = state.deck ?? [];
  stat.$牌局隐藏状态.未公开手牌 = state.hands ?? {};
  stat.$牌局隐藏状态.庄家暗牌 = state.dealer?.[1] ?? '';
  stat._牌局公开状态.玩法 = kind;
  stat._牌局公开状态.牌局阶段 = state.phase ?? '进行中';
  stat._牌局公开状态.可操作楼层ID = getLastMessageId() + 2;
  stat._牌局公开状态.当前行动角色ID = currentActor(kind, state) ?? '';
  stat._牌局公开状态.合法动作 = (currentActor(kind, state) ? adapter.legalActions(state, currentActor(kind, state)!) : []).map(action => ({
    ID: action.id,
    标签: action.label,
    最小值: action.min ?? 0,
    最大值: action.max ?? 0,
    步长: action.step ?? 1,
    需要数值: action.needsAmount ?? false,
  }));
  const base = stat._牌局公开状态.事件日志.length;
  stat._牌局公开状态.事件日志.push(...events.map((event, index) => ({ 序号: base + index + 1, 类型: event.type, 文本: event.text, 时间: new Date().toISOString() })));
  const runtimePlayers: Player[] = state.seats ?? state.players ?? [];
  const user = runtimePlayers.find(player => player.isUser || player.id === 'user');
  if (user) stat.资产.玩家筹码 = fromSmallChips(user.chips);
  stat._牌局公开状态.座次 = Object.fromEntries(runtimePlayers.map((player, index) => [String(index + 1), {
    角色ID: player.id,
    显示名: player.name,
    座位号: index + 1,
    筹码: player.chips,
    本轮投入: (player as any).streetBet ?? 0,
    总投入: (player as any).totalBet ?? 0,
    状态: (player as any).folded ? '已弃牌' : (player as any).allIn ? '已全下' : currentActor(kind, state) === player.id ? '行动中' : '等待',
  }]));
  for (const player of runtimePlayers) {
    if (player.id !== 'user' && stat.人物.活动角色[player.id]) stat.人物.活动角色[player.id].所持筹码 = fromSmallChips(player.chips);
  }
  if (kind === '骰子比大小') stat._牌局公开状态.骰点 = state.rolls ?? {};
  if (kind === '德州扑克') {
    const view: any = adapter.publicView(state);
    stat._牌局公开状态.公开牌 = view.board ?? [];
    stat._牌局公开状态.底池 = { 主池: view.pots?.[0]?.amount ?? 0, 边池: (view.pots ?? []).slice(1).map((pot: any) => ({ 金额: pot.amount, 可争夺角色ID: pot.eligible })) };
    stat._牌局公开状态.德州扑克.当前下注 = state.currentBet ?? 0;
    stat._牌局公开状态.德州扑克.最小加注至 = (state.currentBet ?? 0) + (state.lastFullRaise ?? 0);
    stat._牌局公开状态.德州扑克.牌型 = Object.fromEntries(Object.entries(state.scores ?? {}).map(([id, score]: [string, any]) => [id, score.label]));
    stat._牌局公开状态.德州扑克.已公开手牌 = state.phase === 'settled' ? state.hands : {};
  }
  if (kind === '二十一点') {
    stat._牌局公开状态.二十一点.玩家各手 = Object.fromEntries((state.hands ?? []).map((hand: any) => [hand.id, { 角色ID: hand.playerId, 牌: hand.cards, 点数: blackjackValue(hand.cards).total, 下注: hand.bet, 状态: hand.state, 天然黑杰克: hand.state === 'blackjack' }]));
    stat._牌局公开状态.二十一点.庄家明牌 = state.phase === 'settled' ? state.dealer : [state.dealer?.[0]].filter(Boolean);
    stat._牌局公开状态.二十一点.保险开放 = state.phase === 'insurance';
  }
  if (kind === '欧式轮盘') {
    stat._牌局公开状态.轮盘结果 = state.result ?? null;
    stat._牌局公开状态.欧式轮盘.开放下注 = state.phase === 'betting';
    stat._牌局公开状态.欧式轮盘.下注 = Object.fromEntries((state.bets ?? []).map((bet: any) => {
      const netOdds = ROULETTE_ODDS[bet.type as keyof typeof ROULETTE_ODDS] ?? 1;
      const won = state.result === null ? false : isRouletteWinner(bet, state.result);
      return [bet.id, {
        注型: bet.type,
        覆盖号码: bet.numbers ?? [],
        选择: bet.choice ?? '',
        筹码: bet.amount,
        净赔率: netOdds,
        结果: state.result === null ? '待定' : won ? '赢' : '输',
        派彩: won ? bet.amount * (netOdds + 1) : 0,
      }];
    }));
  }
}

export async function selectOpeningChips(preset: '稳健100万美元' | '豪客300万美元' | '自定义', smallChips: number): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  if (source.资产.筹码预设 !== '未选择') throw new Error('入场筹码已经确认');
  const draft = klona(source);
  draft.资产.筹码预设 = preset;
  draft.资产.玩家筹码 = { 大筹码: Math.floor(smallChips / 10), 小筹码: smallChips % 10 };
  draft.系统.阶段 = '自由探索';
  await commitAtomic({
    userMessage: `我选择${preset === '自定义' ? `${smallChips}枚小筹码等值的自定义入场资金` : preset}，确认入场。`,
    events: [{ type: 'opening', text: `入场资金已确认：${draft.资产.玩家筹码.大筹码}枚大筹码、${draft.资产.玩家筹码.小筹码}枚小筹码；现在随机生成首位迎宾女性` }],
    draft,
  });
}

export async function startGame(kind: GameKind, players: Player[], config: Record<string, unknown>): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  const draft = klona(source);
  const adapter = adapterOf(kind);
  const state = adapter.initialize({ players, ...config });
  draft.系统.当前玩法 = kind;
  draft.系统.阶段 = '牌局进行';
  draft._牌局公开状态.牌局ID = crypto.randomUUID();
  const opponentName = typeof config.opponentName === 'string' ? config.opponentName : '';
  const opponentRole = typeof config.opponentRole === 'string' ? config.opponentRole : '';
  const matchup = opponentName ? `；互动对手为${opponentName}${opponentRole ? `（${opponentRole}）` : ''}` : '';
  const events: GameEvent[] = [{ type: 'start', text: `${kind}牌局已初始化${matchup}` }, ...(state.events ?? [])];
  syncPublic(draft, kind, state, adapter, events);
  await commitAtomic({ userMessage: `确认与${opponentName || '当前对手'}开始${kind}。`, events, draft });
}

export async function commitGameAction(action: GameAction, utterance = ''): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  const kind = source.系统.当前玩法;
  if (kind === '无') throw new Error('当前没有进行中的牌局');
  const adapter = adapterOf(kind);
  let state = runtimeFrom(source);
  const userId = action.actorId;
  const initial = adapter.applyAction(state, action);
  state = initial.state;
  const events = [...initial.events];
  let guard = 0;
  while (!initial.finished && guard < 40) {
    const actorId = currentActor(kind, state);
    if (!actorId || actorId === userId) break;
    const npcAction = await isolatedNpcDecision(adapter, state, actorId);
    const result = adapter.applyAction(state, npcAction);
    state = result.state;
    events.push(...result.events);
    if (result.finished) break;
    guard += 1;
  }
  if (guard >= 40) throw new Error('NPC行动轮次超过安全上限，牌局未提交');
  const draft = klona(source);
  syncPublic(draft, kind, state, adapter, events);
  if (state.phase === 'settled') draft.系统.阶段 = '牌局结算';
  const userText = utterance.trim() ? `${utterance.trim()}\n[牌局动作：${action.id}${action.amount ? ` ${action.amount}` : ''}]` : `[牌局动作：${action.id}${action.amount ? ` ${action.amount}` : ''}]`;
  await commitAtomic({ userMessage: userText, events, draft });
}

export async function facilityAction(message: string): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  await commitAtomic({ userMessage: message, events: [{ type: 'facility', text: message }], draft: source });
}

export async function goToRegion(region: CasinoSchema['系统']['当前区域']): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  const draft = klona(source);
  draft.系统.当前区域 = region;
  draft.系统.当前房间 = region === '镜门大堂' ? '迎宾门厅' : '主入口';
  draft.系统.阶段 = '自由探索';
  draft.系统.当前玩法 = '无';
  await commitAtomic({
    userMessage: `我前往${region}。`,
    events: [{ type: 'travel', text: `<user>抵达${region}；生成1至3名符合区域职能的女性` }],
    draft,
  });
}

export async function findRole(role: '荷官' | '安保' | '服务人员' | '其他工作人员' | '赌客'): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  await commitAtomic({
    userMessage: `我在${source.系统.当前区域}寻找一名${role}并与她交谈。`,
    events: [{ type: 'find-role', text: `生成一名符合当前区域职能的女性${role}，加入当前互动；她具有接受赌局邀请的资格` }],
    draft: source,
  });
}

export async function proposeWager(opponentId: string, userStake: string, opponentStake: string, condition: string): Promise<void> {
  const source = Schema.parse(cloneMvuAt(assertLatestFloor()).stat_data);
  const opponent = source.人物.活动角色[opponentId];
  if (!opponent) throw new Error('请选择一名当前互动女性');
  const draft = klona(source);
  draft.系统.阶段 = '赌约协商';
  draft.赌约.当前赌约 = {
    ID: draft.赌约.当前赌约.ID || crypto.randomUUID(),
    双方: { 甲方: '<user>', 乙方: opponentId },
    各自押注: { 甲方: userStake.trim(), 乙方: opponentStake.trim() },
    胜负条件: condition.trim(),
    确认状态: { 甲方: true, 乙方: false },
    状态: '协商中',
    胜者: '',
    结果: '',
    履行状态: '无需履行',
  };
  await commitAtomic({
    userMessage: `我向${opponent.姓名}提出赌约：我押上“${userStake}”，希望她押上“${opponentStake}”，胜负条件是“${condition}”。`,
    events: [{ type: 'wager', text: `<user>已确认自己的提议，等待${opponent.姓名}答复` }],
    draft,
  });
}

export function isBusy(): boolean { return transactionLocked; }

<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <section class="game-panel">
    <header class="section-head">
      <div><p class="fh-kicker">LIVE TABLE</p><h2>{{ data.系统.当前玩法 === '无' ? '选择牌局' : data.系统.当前玩法 }}</h2></div>
      <span :class="{ live: data.系统.当前玩法 !== '无' }">{{ data._牌局公开状态.牌局阶段 }}</span>
    </header>

    <div v-if="data.系统.当前玩法 === '无'" class="setup fh-card">
      <div class="fh-grid two">
        <label class="fh-label">玩法<select v-model="game" class="fh-select"><option v-for="item in games" :key="item">{{ item }}</option></select></label>
        <label v-if="game !== '德州扑克'" class="fh-label">互动对象<select v-model="opponentId" class="fh-select"><option value="">请选择</option><option v-for="[id, woman] in opponents" :key="id" :value="id">{{ woman.姓名 }} · {{ woman.身份 }}</option></select></label>
        <div v-else class="holdem-opponents"><span class="fh-label">德州对手（1–5名）</span><div><button v-for="[id, woman] in opponents" :key="id" type="button" class="fh-pill" :class="{ active: holdemOpponentIds.includes(id) }" @click="toggleHoldemOpponent(id)">{{ woman.姓名 }}</button></div></div>
        <label v-if="game === '骰子比大小' || game === '二十一点'" class="fh-label">基础下注（小筹码）<input v-model.number="stake" class="fh-input" type="number" :step="game === '二十一点' ? 2 : 1" min="1" /></label>
        <div class="rule-note"><strong>{{ ruleTitle }}</strong><span>{{ ruleNote }}</span></div>
      </div>
      <p class="all-roles">荷官、安保、服务人员、其他工作人员与赌客均可成为对手。</p>
      <p v-if="error" class="fh-error">{{ error }}</p>
      <button type="button" class="fh-button primary" :disabled="busy || !canStart" @click="start">确认牌局设置</button>
    </div>

    <template v-else>
      <div class="table-visual fh-card" :class="gameClass">
        <div v-if="data.系统.当前玩法 === '骰子比大小'" class="dice-board">
          <div v-for="seat in seats" :key="seat.角色ID" class="dice-side"><span>{{ seat.显示名 }}</span><div class="dice-row"><b v-for="(point, i) in data._牌局公开状态.骰点[seat.角色ID] ?? []" :key="i" class="die">{{ point }}</b><i v-if="!(data._牌局公开状态.骰点[seat.角色ID]?.length)">待掷</i></div></div>
        </div>
        <div v-else-if="data.系统.当前玩法 === '德州扑克'" class="poker-board">
          <div class="community"><span v-for="card in data._牌局公开状态.公开牌" :key="card" class="card">{{ card }}</span><span v-for="i in Math.max(0, 5 - data._牌局公开状态.公开牌.length)" :key="`empty-${i}`" class="card empty">◆</span></div>
          <div class="pot">主池 {{ data._牌局公开状态.底池.主池 }} · 边池 {{ data._牌局公开状态.底池.边池.length }}</div>
          <div class="seat-grid"><span v-for="seat in seats" :key="seat.角色ID" :class="{ acting: seat.角色ID === data._牌局公开状态.当前行动角色ID }">{{ seat.显示名 }}<b>{{ seat.筹码 }}</b><small>{{ seat.状态 }}</small></span></div>
        </div>
        <div v-else-if="data.系统.当前玩法 === '二十一点'" class="blackjack-board">
          <div class="dealer"><small>庄家</small><div><span v-for="card in data._牌局公开状态.二十一点.庄家明牌" :key="card" class="card">{{ card }}</span><span v-if="data.系统.阶段 !== '牌局结算'" class="card back">FH</span></div></div>
          <div class="hand-row"><div v-for="(hand, id) in data._牌局公开状态.二十一点.玩家各手" :key="id"><small>{{ hand.状态 }} · {{ hand.下注 }}</small><span v-for="card in hand.牌" :key="card" class="card">{{ card }}</span></div></div>
        </div>
        <div v-else class="roulette-board">
          <div class="wheel" :class="{ spinning: busy }"><span>{{ data._牌局公开状态.轮盘结果 ?? '·' }}</span></div>
          <div><strong>单零欧式轮盘</strong><p>{{ Object.keys(data._牌局公开状态.欧式轮盘.下注).length }} 笔下注 · 0至36等概率</p></div>
        </div>
      </div>

      <div v-if="isLatest" class="action-box fh-card">
        <div class="fh-pills"><button v-for="action in data._牌局公开状态.合法动作" :key="action.ID" type="button" class="fh-pill" :class="{ active: selectedAction === action.ID }" @click="choose(action)">{{ action.标签 }}</button></div>
        <div v-if="currentAction?.需要数值" class="amount-line"><input v-model.number="amount" type="range" :min="currentAction.最小值" :max="currentAction.最大值" :step="currentAction.步长" /><input v-model.number="amount" class="fh-input" type="number" :min="currentAction.最小值" :max="currentAction.最大值" /></div>
        <div v-if="data.系统.当前玩法 === '欧式轮盘' && selectedAction === 'place-bet'" class="roulette-choice">
          <label class="fh-label">注型<select v-model="rouletteType" class="fh-select"><option v-for="type in rouletteTypes" :key="type">{{ type }}</option></select></label>
          <label v-if="rouletteChoices.length" class="fh-label">选择<select v-model="rouletteChoice" class="fh-select"><option v-for="choice in rouletteChoices" :key="choice">{{ choice }}</option></select></label>
          <label v-else class="fh-label">覆盖号码<input v-model="rouletteText" class="fh-input" placeholder="例：1,2" /></label>
          <p>内盘号码以逗号分隔；分注、街注、角注、线注会在提交时校验几何关系。</p>
        </div>
        <textarea v-model="utterance" class="fh-textarea" placeholder="可附带一句台词或动作；输入与滑块不会触发生成"></textarea>
        <p v-if="error" class="fh-error">{{ error }}</p>
        <button type="button" class="fh-button primary" :disabled="busy || !selectedAction || data._牌局公开状态.当前行动角色ID !== 'user'" @click="act">{{ busy ? '正在原子结算…' : '确认动作' }}</button>
      </div>
      <p v-else class="readonly">这是历史楼层，牌局控件已自动只读。请在最新楼层继续。</p>
      <div class="event-strip"><p v-for="event in recentEvents" :key="event.序号"><span>{{ event.类型 }}</span>{{ event.文本 }}</p></div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Schema as CasinoSchema } from '../../../schema';
import { commitGameAction, startGame } from '../controller';
import type { RouletteBetType } from '../games';
import { toSmallChips } from '../games';

const props = defineProps<{ data: CasinoSchema }>();
const games = ['骰子比大小', '德州扑克', '二十一点', '欧式轮盘'] as const;
const game = ref<(typeof games)[number]>('骰子比大小');
const opponentId = ref('');
const holdemOpponentIds = ref<string[]>([]);
const stake = ref(2);
const busy = ref(false);
const error = ref('');
const selectedAction = ref('');
const amount = ref(1);
const utterance = ref('');
const rouletteTypes: RouletteBetType[] = ['单号', '分注', '街注', '三数注', '角注', '首四注', '线注', '列注', '打注', '红黑', '单双', '大小'];
const rouletteType = ref<RouletteBetType>('单号');
const rouletteText = ref('7');
const rouletteChoice = ref('');
const opponents = computed(() => Object.entries(props.data.人物.活动角色));
const seats = computed(() => Object.values(props.data._牌局公开状态.座次));
const isLatest = computed(() => getCurrentMessageId() === getLastMessageId());
const recentEvents = computed(() => props.data._牌局公开状态.事件日志.slice(-6).reverse());
const currentAction = computed(() => props.data._牌局公开状态.合法动作.find(item => item.ID === selectedAction.value));
const canStart = computed(() => {
  const hasOpponent = game.value === '德州扑克' ? holdemOpponentIds.value.length > 0 : !!opponentId.value;
  const validStake = !['骰子比大小', '二十一点'].includes(game.value) || (stake.value > 0 && (game.value !== '二十一点' || stake.value % 2 === 0));
  return hasOpponent && validStake;
});
const gameClass = computed(() => `game-${props.data.系统.当前玩法}`);
const ruleTitle = computed(() => ({ 骰子比大小: '2D6 · 1:1', 德州扑克: '2–6人无限注', 二十一点: '6副牌 · S17', 欧式轮盘: '单零 · 标准赔率' }[game.value]));
const ruleNote = computed(() => ({ 骰子比大小: '同点保持下注并重掷', 德州扑克: '小盲1、大盲2，支持全下与边池', 二十一点: '黑杰克3:2，初始下注须为偶数', 欧式轮盘: '支持内外盘标准注型' }[game.value]));
const rouletteChoices = computed(() => ({
  列注: ['第一列', '第二列', '第三列'],
  打注: ['1-12', '13-24', '25-36'],
  红黑: ['红', '黑'],
  单双: ['单', '双'],
  大小: ['小', '大'],
} as Partial<Record<RouletteBetType, string[]>>)[rouletteType.value] ?? []);

watch(() => props.data._牌局公开状态.合法动作, actions => {
  selectedAction.value = actions[0]?.ID ?? '';
  amount.value = actions[0]?.最小值 ?? 1;
}, { immediate: true, deep: true });
watch(opponents, list => {
  if (!list.some(([id]) => id === opponentId.value)) opponentId.value = list[0]?.[0] ?? '';
  holdemOpponentIds.value = holdemOpponentIds.value.filter(id => list.some(([candidate]) => candidate === id));
  if (!holdemOpponentIds.value.length && list[0]) holdemOpponentIds.value = [list[0][0]];
}, { immediate: true });
watch(rouletteType, type => {
  rouletteText.value = ({ 单号: '7', 分注: '1,2', 街注: '1,2,3', 三数注: '0,1,2', 角注: '1,2,4,5', 首四注: '0,1,2,3', 线注: '1,2,3,4,5,6' } as Partial<Record<RouletteBetType, string>>)[type] ?? '';
  rouletteChoice.value = rouletteChoices.value[0] ?? '';
}, { immediate: true });

function choose(action: CasinoSchema['_牌局公开状态']['合法动作'][number]) { selectedAction.value = action.ID; amount.value = action.最小值 || 1; }

function toggleHoldemOpponent(id: string) {
  if (holdemOpponentIds.value.includes(id)) holdemOpponentIds.value = holdemOpponentIds.value.filter(item => item !== id);
  else if (holdemOpponentIds.value.length < 5) holdemOpponentIds.value = [...holdemOpponentIds.value, id];
}

function rouletteNumbers(): number[] {
  if (!rouletteChoices.value.length) return rouletteText.value.split(/[,，\s]+/).map(Number).filter(Number.isInteger);
  if (rouletteType.value === '列注') {
    const offset = rouletteChoice.value === '第一列' ? 1 : rouletteChoice.value === '第二列' ? 2 : 3;
    return Array.from({ length: 12 }, (_, index) => index * 3 + offset);
  }
  if (rouletteType.value === '打注') {
    const start = rouletteChoice.value === '1-12' ? 1 : rouletteChoice.value === '13-24' ? 13 : 25;
    return Array.from({ length: 12 }, (_, index) => start + index);
  }
  if (rouletteType.value === '红黑') {
    const red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return rouletteChoice.value === '红' ? red : Array.from({ length: 36 }, (_, index) => index + 1).filter(number => !red.includes(number));
  }
  if (rouletteType.value === '单双') return Array.from({ length: 36 }, (_, index) => index + 1).filter(number => number % 2 === (rouletteChoice.value === '单' ? 1 : 0));
  return Array.from({ length: 18 }, (_, index) => (rouletteChoice.value === '小' ? 1 : 19) + index);
}

async function start() {
  const selectedIds = game.value === '德州扑克' ? holdemOpponentIds.value : [opponentId.value];
  const selectedOpponents = selectedIds.map(id => [id, props.data.人物.活动角色[id]] as const).filter((entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] => !!entry[1]);
  if (!selectedOpponents.length) return;
  busy.value = true; error.value = '';
  try {
    const user = { id: 'user', name: '<user>', chips: toSmallChips(props.data.资产.玩家筹码), isUser: true };
    const npcs = selectedOpponents.map(([id, opponent]) => ({ id, name: opponent.姓名, chips: Math.max(20, toSmallChips(opponent.所持筹码)) }));
    const players = game.value === '骰子比大小' ? [user, npcs[0]] : game.value === '德州扑克' ? [user, ...npcs] : [user];
    const opponentContext = { opponentId: selectedIds.join(','), opponentName: selectedOpponents.map(([, opponent]) => opponent.姓名).join('、'), opponentRole: selectedOpponents.map(([, opponent]) => opponent.身份).join('、') };
    const config = game.value === '骰子比大小' ? { ...opponentContext, stake: stake.value } : game.value === '二十一点' ? { ...opponentContext, bets: { user: stake.value } } : opponentContext;
    await startGame(game.value, players, config);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); }
  finally { busy.value = false; }
}

async function act() {
  busy.value = true; error.value = '';
  try {
    const payload = props.data.系统.当前玩法 === '欧式轮盘' && selectedAction.value === 'place-bet' ? { bet: { id: crypto.randomUUID(), playerId: 'user', type: rouletteType.value, numbers: rouletteNumbers(), choice: rouletteChoice.value, amount: amount.value } } : undefined;
    await commitGameAction({ id: selectedAction.value, actorId: 'user', amount: currentAction.value?.需要数值 ? amount.value : undefined, payload }, utterance.value);
  } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); }
  finally { busy.value = false; }
}
</script>

<style scoped>
.section-head { display:flex;align-items:end;justify-content:space-between;margin-bottom:10px;}.section-head h2{margin:3px 0 0;font-size:17px;font-weight:500;letter-spacing:.12em}.section-head>span{border:1px solid var(--fh-line);padding:4px 7px;color:var(--fh-muted);font-size:9px}.section-head>span.live{color:var(--fh-gold)}
.setup{display:grid;gap:12px}.rule-note{border:1px solid var(--fh-line);padding:9px;display:grid;gap:4px;align-content:center}.rule-note strong{color:var(--fh-gold);font-size:11px}.rule-note span,.all-roles{color:var(--fh-muted);font-size:10px}.all-roles{margin:0}
.holdem-opponents{grid-column:1/-1;display:grid;gap:7px}.holdem-opponents>div{display:flex;flex-wrap:wrap;gap:6px}
.table-visual{position:relative;background:radial-gradient(circle at center,rgba(95,16,29,.32),transparent 60%),#0b0809;animation:table-in .3s ease}.dice-board{display:grid;grid-template-columns:1fr 1fr;gap:18px}.dice-side{text-align:center}.dice-side>span{color:var(--fh-muted);font-size:10px}.dice-row{display:flex;justify-content:center;gap:8px;margin-top:10px}.die{width:48px;aspect-ratio:1;display:grid;place-items:center;border:1px solid var(--fh-gold);background:#efe3cd;color:#261819;font:700 22px Georgia;animation:dice-drop .38s ease}.dice-row i{color:var(--fh-muted);font-size:11px}
.community{display:flex;justify-content:center;gap:6px}.card{width:42px;aspect-ratio:.7;display:inline-grid;place-items:center;border:1px solid var(--fh-gold-soft);border-radius:3px;background:#eee2cc;color:#26171a;font:700 13px Georgia;margin:2px}.card.empty,.card.back{background:linear-gradient(135deg,#661424,#240b11);color:var(--fh-gold)}.pot{text-align:center;color:var(--fh-gold);font-size:10px;margin:8px}.seat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px}.seat-grid>span{border:1px solid var(--fh-line);padding:7px;display:grid;font-size:10px}.seat-grid b{color:var(--fh-gold)}.seat-grid small{color:var(--fh-muted)}.seat-grid .acting{box-shadow:inset 0 0 0 1px var(--fh-gold);animation:active-glow 1.4s infinite alternate}
.blackjack-board{display:grid;gap:14px}.dealer{text-align:center}.dealer small,.hand-row small{display:block;color:var(--fh-muted);font-size:9px}.hand-row{display:flex;justify-content:center;flex-wrap:wrap;gap:10px}.hand-row>div{border-top:1px solid var(--fh-line);padding-top:6px}
.roulette-board{display:flex;align-items:center;justify-content:center;gap:20px}.wheel{width:110px;aspect-ratio:1;border-radius:50%;border:7px double var(--fh-gold);display:grid;place-items:center;background:conic-gradient(#7e1527 0 10deg,#111 10deg 20deg,#7e1527 20deg 30deg,#111 30deg 40deg,#7e1527 40deg 50deg,#111 50deg 60deg,#17633c 60deg 70deg,#111 70deg 80deg,#7e1527 80deg 90deg,#111 90deg 100deg,#7e1527 100deg 110deg,#111 110deg 120deg,#7e1527 120deg 130deg,#111 130deg 140deg,#7e1527 140deg 150deg,#111 150deg 160deg,#7e1527 160deg 170deg,#111 170deg 180deg,#7e1527 180deg 190deg,#111 190deg 200deg,#7e1527 200deg 210deg,#111 210deg 220deg,#7e1527 220deg 230deg,#111 230deg 240deg,#7e1527 240deg 250deg,#111 250deg 260deg,#7e1527 260deg 270deg,#111 270deg 280deg,#7e1527 280deg 290deg,#111 290deg 300deg,#7e1527 300deg 310deg,#111 310deg 320deg,#7e1527 320deg 330deg,#111 330deg 340deg,#7e1527 340deg 350deg,#111 350deg 360deg)}.wheel span{width:56px;aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:#0d090a;color:var(--fh-gold);font:700 24px Georgia}.wheel.spinning{animation:spin .8s cubic-bezier(.2,.7,.2,1)}.roulette-board strong{color:var(--fh-gold)}.roulette-board p{color:var(--fh-muted);font-size:10px}
.action-box{margin-top:10px;display:grid;gap:9px}.amount-line{display:grid;grid-template-columns:1fr 95px;gap:8px;align-items:center}.roulette-choice{display:grid;grid-template-columns:120px 1fr;gap:10px;align-items:end}.roulette-choice p{grid-column:1/-1;margin:0;color:var(--fh-muted);font-size:9px}.readonly{border:1px dashed var(--fh-line);padding:10px;color:var(--fh-muted);font-size:11px}.event-strip{margin-top:10px;border-left:1px solid var(--fh-gold-soft);padding-left:9px}.event-strip p{margin:5px 0;color:var(--fh-muted);font-size:10px}.event-strip span{color:var(--fh-gold);margin-right:7px}
@keyframes spin{to{transform:rotate(720deg)}}@keyframes dice-drop{0%{transform:translateY(-12px) rotate(8deg);opacity:.2}100%{transform:none;opacity:1}}@keyframes active-glow{to{box-shadow:inset 0 0 0 1px var(--fh-gold),0 0 14px rgba(209,173,98,.22)}}@keyframes table-in{from{opacity:.3;transform:scale(.99)}}
@media(max-width:620px){.dice-board{gap:8px}.die{width:40px}.roulette-board{gap:10px}.wheel{width:88px}.amount-line,.roulette-choice{grid-template-columns:1fr}.card{width:35px}}
</style>

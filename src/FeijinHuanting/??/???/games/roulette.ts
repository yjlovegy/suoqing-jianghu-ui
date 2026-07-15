import type { AdapterResult, GameAdapter, GameEvent, Player } from './types';
import { assertAction, randomId, randomInt } from './types';

export type RouletteBetType = '单号' | '分注' | '街注' | '三数注' | '角注' | '首四注' | '线注' | '列注' | '打注' | '红黑' | '单双' | '大小';
export type RouletteBet = { id: string; playerId: string; type: RouletteBetType; numbers: number[]; choice?: string; amount: number };
export type RouletteConfig = { players: Player[] };
export type RouletteState = { players: Player[]; bets: RouletteBet[]; phase: 'betting' | 'settled'; result: number | null };

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const ROULETTE_ODDS: Record<RouletteBetType, number> = {
  单号: 35, 分注: 17, 街注: 11, 三数注: 11, 角注: 8, 首四注: 8, 线注: 5, 列注: 2, 打注: 2, 红黑: 1, 单双: 1, 大小: 1,
};

function rowOf(n: number): number { return Math.floor((n - 1) / 3); }
function colOf(n: number): number { return (n - 1) % 3; }

export function validateRouletteBet(bet: RouletteBet): boolean {
  const nums = [...new Set(bet.numbers)].sort((a, b) => a - b);
  if (!Number.isInteger(bet.amount) || bet.amount <= 0 || nums.some(n => n < 0 || n > 36)) return false;
  if (bet.type === '单号') return nums.length === 1;
  if (bet.type === '分注') {
    if (nums.includes(0)) return nums.length === 2 && [1, 2, 3].includes(nums[1]);
    return nums.length === 2 && ((rowOf(nums[0]) === rowOf(nums[1]) && Math.abs(colOf(nums[0]) - colOf(nums[1])) === 1) || (colOf(nums[0]) === colOf(nums[1]) && Math.abs(rowOf(nums[0]) - rowOf(nums[1])) === 1));
  }
  if (bet.type === '三数注') return _.isEqual(nums, [0, 1, 2]) || _.isEqual(nums, [0, 2, 3]);
  if (bet.type === '首四注') return _.isEqual(nums, [0, 1, 2, 3]);
  if (bet.type === '街注') return nums.length === 3 && nums[0] > 0 && nums.every(n => rowOf(n) === rowOf(nums[0])) && _.isEqual(nums, [nums[0], nums[0] + 1, nums[0] + 2]);
  if (bet.type === '角注') return nums.length === 4 && nums[0] > 0 && new Set(nums.map(rowOf)).size === 2 && new Set(nums.map(colOf)).size === 2;
  if (bet.type === '线注') return nums.length === 6 && nums[0] > 0 && new Set(nums.map(rowOf)).size === 2 && new Set(nums.map(colOf)).size === 3;
  if (bet.type === '列注') return nums.length === 12 && nums.every(n => n > 0 && colOf(n) === colOf(nums[0]));
  if (bet.type === '打注') return nums.length === 12 && ['1-12', '13-24', '25-36'].includes(bet.choice ?? '');
  if (['红黑', '单双', '大小'].includes(bet.type)) return nums.length === 18;
  return false;
}

export function isRouletteWinner(bet: RouletteBet, result: number): boolean {
  if (result === 0 && ['列注', '打注', '红黑', '单双', '大小'].includes(bet.type)) return false;
  if (bet.numbers.length) return bet.numbers.includes(result);
  if (bet.type === '红黑') return result !== 0 && ((bet.choice === '红' && RED.has(result)) || (bet.choice === '黑' && !RED.has(result)));
  if (bet.type === '单双') return result !== 0 && ((bet.choice === '单' && result % 2 === 1) || (bet.choice === '双' && result % 2 === 0));
  if (bet.type === '大小') return result !== 0 && ((bet.choice === '小' && result <= 18) || (bet.choice === '大' && result >= 19));
  return false;
}

export const rouletteAdapter: GameAdapter<RouletteState, RouletteConfig> = {
  kind: '欧式轮盘',
  initialize(config) { return { players: structuredClone(config.players), bets: [], phase: 'betting', result: null }; },
  legalActions(state, actorId) {
    const player = state.players.find(item => item.id === actorId);
    if (!player || state.phase !== 'betting') return [];
    return [{ id: 'place-bet', label: '加入下注', min: 1, max: player.chips, step: 1, needsAmount: true }, { id: 'spin', label: '封盘并转动轮盘' }];
  },
  applyAction(state, action, rng) {
    assertAction(this.legalActions(state, action.actorId), action);
    const next = structuredClone(state);
    if (action.id === 'place-bet') {
      const bet = action.payload?.bet as RouletteBet | undefined;
      if (!bet || bet.playerId !== action.actorId || bet.amount !== Math.floor(action.amount ?? 0) || !validateRouletteBet(bet)) throw new Error('轮盘下注组合不合法');
      const player = next.players.find(item => item.id === action.actorId)!;
      if (_.sumBy(next.bets.filter(item => item.playerId === player.id), 'amount') + bet.amount > player.chips) throw new Error('轮盘下注超过可用筹码');
      next.bets.push(bet);
      return { state: next, events: [{ type: 'bet', actorId: player.id, amount: bet.amount, text: `${player.name}下注${bet.type} ${bet.amount}枚小筹码` }], finished: false };
    }
    if (next.bets.length === 0) throw new Error('至少需要一笔下注才能转动轮盘');
    next.result = randomInt(0, 36, rng);
    next.phase = 'settled';
    const events: GameEvent[] = [{ type: 'spin', text: `轮盘落在 ${next.result}` }];
    for (const bet of next.bets) {
      const player = next.players.find(item => item.id === bet.playerId)!;
      player.chips -= bet.amount;
      if (isRouletteWinner(bet, next.result)) {
        const returned = bet.amount * (ROULETTE_ODDS[bet.type] + 1);
        player.chips += returned;
        events.push({ type: 'payout', actorId: player.id, amount: returned, text: `${player.name}的${bet.type}中奖，净赔率${ROULETTE_ODDS[bet.type]}比1` });
      }
    }
    return { state: next, events, finished: true };
  },
  npcView(state, actorId) { return { self: state.players.find(item => item.id === actorId), bets: state.bets, phase: state.phase, wheel: '0至36单零等概率' }; },
  npcDecision(state, actorId, rng) {
    const player = state.players.find(item => item.id === actorId)!;
    const number = randomInt(0, 36, rng);
    const amount = Math.max(1, Math.min(player.chips, 2));
    return { id: 'place-bet', actorId, amount, payload: { bet: { id: randomId(), playerId: actorId, type: '单号', numbers: [number], amount } } };
  },
  settle(state): AdapterResult<RouletteState> {
    if (state.phase !== 'settled') throw new Error('轮盘尚未结算');
    return { state, events: [], finished: true };
  },
  publicView(state) { return state; },
};

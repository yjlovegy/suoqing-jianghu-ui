import type { AdapterResult, GameAdapter, GameEvent, Player, RandomSource } from './types';
import { assertAction, randomInt } from './types';

export type DiceConfig = { players: [Player, Player]; stake: number };
export type DiceState = {
  players: [Player, Player];
  stake: number;
  rolls: Record<string, number[]>;
  rerolls: number;
  phase: 'ready' | 'reroll' | 'settled';
  winnerId: string;
};

function roll(rng?: RandomSource): number[] {
  return [randomInt(1, 6, rng), randomInt(1, 6, rng)];
}

export const diceAdapter: GameAdapter<DiceState, DiceConfig> = {
  kind: '骰子比大小',
  initialize(config) {
    if (config.players.length !== 2) throw new Error('骰子比大小必须恰好2人');
    if (!Number.isInteger(config.stake) || config.stake <= 0) throw new Error('下注必须是正整数枚小筹码');
    if (config.players.some(player => player.chips < config.stake)) throw new Error('至少一方筹码不足');
    return { players: structuredClone(config.players), stake: config.stake, rolls: {}, rerolls: 0, phase: 'ready', winnerId: '' };
  },
  legalActions(state, actorId) {
    if (!state.players.some(player => player.id === actorId) || state.phase === 'settled') return [];
    return state.phase === 'reroll' ? [{ id: 'reroll', label: '确认重掷' }] : [{ id: 'roll', label: '确认开掷' }];
  },
  applyAction(state, action, rng) {
    assertAction(this.legalActions(state, action.actorId), action);
    const next = structuredClone(state);
    next.rolls = Object.fromEntries(next.players.map(player => [player.id, roll(rng)]));
    const [a, b] = next.players;
    const aTotal = _.sum(next.rolls[a.id]);
    const bTotal = _.sum(next.rolls[b.id]);
    const events: GameEvent[] = next.players.map(player => ({ type: 'dice', actorId: player.id, text: `${player.name}掷出 ${next.rolls[player.id].join(' + ')} = ${_.sum(next.rolls[player.id])}` }));
    if (aTotal === bTotal) {
      next.phase = 'reroll';
      next.rerolls += 1;
      events.push({ type: 'tie', text: `双方同为${aTotal}点，保持原下注并重掷` });
      return { state: next, events, finished: false };
    }
    next.phase = 'settled';
    next.winnerId = aTotal > bTotal ? a.id : b.id;
    const winner = next.players.find(player => player.id === next.winnerId)!;
    const loser = next.players.find(player => player.id !== next.winnerId)!;
    winner.chips += next.stake;
    loser.chips -= next.stake;
    events.push({ type: 'settle', actorId: winner.id, amount: next.stake * 2, text: `${winner.name}获胜，按1比1结算` });
    return { state: next, events, finished: true };
  },
  npcView(state, actorId) {
    return { self: state.players.find(player => player.id === actorId), stake: state.stake, phase: state.phase, revealedRolls: state.rolls };
  },
  npcDecision(state, actorId) {
    const action = this.legalActions(state, actorId)[0];
    if (!action) throw new Error('NPC当前没有合法动作');
    return { id: action.id, actorId };
  },
  settle(state): AdapterResult<DiceState> {
    if (state.phase !== 'settled') throw new Error('骰局尚未分出胜负');
    return { state, events: [], finished: true };
  },
  publicView(state) {
    return { players: state.players, stake: state.stake, rolls: state.rolls, rerolls: state.rerolls, phase: state.phase, winnerId: state.winnerId };
  },
};

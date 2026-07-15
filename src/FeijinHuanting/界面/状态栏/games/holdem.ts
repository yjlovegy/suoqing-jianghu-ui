import type { Card, HandScore } from './cards';
import { compareScores, createDeck, evaluateHoldem } from './cards';
import type { AdapterResult, GameAdapter, GameEvent, LegalAction, Player } from './types';
import { assertAction } from './types';

export type HoldemPhase = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'settled';
export type HoldemSeat = Player & {
  folded: boolean;
  allIn: boolean;
  streetBet: number;
  totalBet: number;
  acted: boolean;
  lastAction: 'none' | 'check' | 'call' | 'bet' | 'raise' | 'all-in' | 'fold';
};
export type HoldemConfig = { players: Player[]; buttonIndex?: number; smallBlind?: number; bigBlind?: number };
export type HoldemState = {
  seats: HoldemSeat[];
  buttonIndex: number;
  smallBlind: number;
  bigBlind: number;
  phase: HoldemPhase;
  deck: Card[];
  hands: Record<string, Card[]>;
  board: Card[];
  burn: Card[];
  actingIndex: number;
  currentBet: number;
  lastFullRaise: number;
  events: GameEvent[];
  pots: { amount: number; eligible: string[] }[];
  scores: Record<string, HandScore>;
};

const active = (seat: HoldemSeat) => !seat.folded;
const canAct = (seat: HoldemSeat) => active(seat) && !seat.allIn && seat.chips > 0;
const nextIndex = (state: HoldemState, from: number) => {
  for (let offset = 1; offset <= state.seats.length; offset += 1) {
    const index = (from + offset) % state.seats.length;
    if (canAct(state.seats[index])) return index;
  }
  return -1;
};

function take(state: HoldemState): Card {
  const card = state.deck.shift();
  if (!card) throw new Error('牌堆已空');
  return card;
}

function postBlind(seat: HoldemSeat, amount: number): number {
  const paid = Math.min(seat.chips, amount);
  seat.chips -= paid;
  seat.streetBet += paid;
  seat.totalBet += paid;
  seat.allIn = seat.chips === 0;
  return paid;
}

function roundComplete(state: HoldemState): boolean {
  const actors = state.seats.filter(canAct);
  return actors.length === 0 || actors.every(seat => seat.acted && seat.streetBet === state.currentBet);
}

function remaining(state: HoldemState): HoldemSeat[] { return state.seats.filter(active); }

function beginNextStreet(state: HoldemState): GameEvent[] {
  const events: GameEvent[] = [];
  state.seats.forEach(seat => { seat.streetBet = 0; seat.acted = false; seat.lastAction = 'none'; });
  state.currentBet = 0;
  state.lastFullRaise = state.bigBlind;
  state.burn.push(take(state));
  if (state.phase === 'preflop') {
    state.board.push(take(state), take(state), take(state));
    state.phase = 'flop';
    events.push({ type: 'deal', text: `翻牌：${state.board.join(' ')}` });
  } else if (state.phase === 'flop') {
    state.board.push(take(state));
    state.phase = 'turn';
    events.push({ type: 'deal', text: `转牌：${state.board.at(-1)}` });
  } else if (state.phase === 'turn') {
    state.board.push(take(state));
    state.phase = 'river';
    events.push({ type: 'deal', text: `河牌：${state.board.at(-1)}` });
  } else {
    state.phase = 'showdown';
    state.actingIndex = -1;
    return events;
  }
  state.actingIndex = nextIndex(state, state.buttonIndex);
  return events;
}

export function buildSidePots(seats: HoldemSeat[]): { pots: { amount: number; eligible: string[] }[]; refunds: Record<string, number> } {
  const levels = [...new Set(seats.map(seat => seat.totalBet).filter(value => value > 0))].sort((a, b) => a - b);
  const pots: { amount: number; eligible: string[] }[] = [];
  const refunds: Record<string, number> = {};
  let previous = 0;
  for (const level of levels) {
    const contributors = seats.filter(seat => seat.totalBet >= level);
    const amount = (level - previous) * contributors.length;
    if (contributors.length === 1) refunds[contributors[0].id] = (refunds[contributors[0].id] ?? 0) + amount;
    else pots.push({ amount, eligible: contributors.filter(active).map(seat => seat.id) });
    previous = level;
  }
  return { pots, refunds };
}

export function settleHoldem(state: HoldemState): AdapterResult<HoldemState> {
  const next = structuredClone(state);
  const events: GameEvent[] = [];
  const contenders = remaining(next);
  const { pots, refunds } = buildSidePots(next.seats);
  for (const [id, amount] of Object.entries(refunds)) {
    next.seats.find(seat => seat.id === id)!.chips += amount;
    events.push({ type: 'refund', actorId: id, amount, text: `退回未被匹配的${amount}枚小筹码` });
  }
  next.pots = pots;
  if (contenders.length === 1) {
    const winner = contenders[0];
    const amount = _.sumBy(pots, 'amount');
    winner.chips += amount;
    events.push({ type: 'settle', actorId: winner.id, amount, text: `${winner.name}成为唯一未弃牌者，取得${amount}枚小筹码` });
  } else {
    for (const contender of contenders) next.scores[contender.id] = evaluateHoldem([...next.hands[contender.id], ...next.board]);
    for (const pot of pots) {
      const eligible = contenders.filter(seat => pot.eligible.includes(seat.id));
      let winners: HoldemSeat[] = [];
      for (const seat of eligible) {
        if (!winners.length) winners = [seat];
        else {
          const comparison = compareScores(next.scores[seat.id], next.scores[winners[0].id]);
          if (comparison > 0) winners = [seat];
          else if (comparison === 0) winners.push(seat);
        }
      }
      const share = Math.floor(pot.amount / winners.length);
      let odd = pot.amount % winners.length;
      const ordered = [...winners].sort((a, b) => ((next.seats.indexOf(a) - next.buttonIndex - 1 + next.seats.length) % next.seats.length) - ((next.seats.indexOf(b) - next.buttonIndex - 1 + next.seats.length) % next.seats.length));
      for (const winner of ordered) {
        const amount = share + (odd > 0 ? 1 : 0);
        odd -= odd > 0 ? 1 : 0;
        winner.chips += amount;
        events.push({ type: 'payout', actorId: winner.id, amount, text: `${winner.name}以${next.scores[winner.id].label}获得${amount}枚小筹码` });
      }
    }
  }
  next.phase = 'settled';
  next.actingIndex = -1;
  return { state: next, events, finished: true };
}

export const holdemAdapter: GameAdapter<HoldemState, HoldemConfig> = {
  kind: '德州扑克',
  initialize(config, rng) {
    if (config.players.length < 2 || config.players.length > 6) throw new Error('德州扑克仅支持2至6人');
    const bigBlind = config.bigBlind ?? 2;
    const smallBlind = config.smallBlind ?? 1;
    const seats: HoldemSeat[] = structuredClone(config.players).map(player => ({ ...player, folded: false, allIn: false, streetBet: 0, totalBet: 0, acted: false, lastAction: 'none' }));
    const buttonIndex = (config.buttonIndex ?? 0) % seats.length;
    const state: HoldemState = { seats, buttonIndex, smallBlind, bigBlind, phase: 'preflop', deck: createDeck(1, rng), hands: {}, board: [], burn: [], actingIndex: -1, currentBet: 0, lastFullRaise: bigBlind, events: [], pots: [], scores: {} };
    for (let round = 0; round < 2; round += 1) for (const seat of seats) (state.hands[seat.id] ??= []).push(take(state));
    const sbIndex = seats.length === 2 ? buttonIndex : (buttonIndex + 1) % seats.length;
    const bbIndex = (sbIndex + 1) % seats.length;
    postBlind(seats[sbIndex], smallBlind);
    state.currentBet = postBlind(seats[bbIndex], bigBlind);
    state.actingIndex = seats.length === 2 ? sbIndex : nextIndex(state, bbIndex);
    state.events.push({ type: 'blind', actorId: seats[sbIndex].id, amount: seats[sbIndex].streetBet, text: `${seats[sbIndex].name}支付小盲` }, { type: 'blind', actorId: seats[bbIndex].id, amount: seats[bbIndex].streetBet, text: `${seats[bbIndex].name}支付大盲` });
    return state;
  },
  legalActions(state, actorId) {
    const seat = state.seats[state.actingIndex];
    if (!seat || seat.id !== actorId || !canAct(seat) || ['showdown', 'settled'].includes(state.phase)) return [];
    const toCall = Math.max(0, state.currentBet - seat.streetBet);
    const raiseReopened = !seat.acted || seat.lastAction === 'check' || state.currentBet - seat.streetBet >= state.lastFullRaise;
    const actions: LegalAction[] = [{ id: 'fold', label: '弃牌' }];
    if (toCall === 0) actions.push({ id: 'check', label: '过牌' });
    else actions.push({ id: 'call', label: `跟注 ${Math.min(toCall, seat.chips)}` });
    if (raiseReopened && seat.chips > toCall) {
      const min = state.currentBet === 0 ? state.bigBlind : state.currentBet + state.lastFullRaise;
      const max = seat.streetBet + seat.chips;
      if (max >= min) actions.push({ id: state.currentBet === 0 ? 'bet' : 'raise', label: state.currentBet === 0 ? '下注' : '加注', min, max, step: 1, needsAmount: true });
    }
    if (seat.chips > 0 && (seat.chips <= toCall || raiseReopened)) actions.push({ id: 'all-in', label: `全下 ${seat.chips}` });
    return actions;
  },
  applyAction(state, action) {
    assertAction(this.legalActions(state, action.actorId), action);
    const next = structuredClone(state);
    const seat = next.seats[next.actingIndex];
    const events: GameEvent[] = [];
    const previousBet = next.currentBet;
    if (action.id === 'fold') { seat.folded = true; seat.acted = true; seat.lastAction = 'fold'; events.push({ type: 'fold', actorId: seat.id, text: `${seat.name}弃牌` }); }
    else if (action.id === 'check') { seat.acted = true; seat.lastAction = 'check'; events.push({ type: 'check', actorId: seat.id, text: `${seat.name}过牌` }); }
    else {
      const target = action.id === 'call' ? Math.min(next.currentBet, seat.streetBet + seat.chips) : action.id === 'all-in' ? seat.streetBet + seat.chips : Math.floor(action.amount!);
      const paid = Math.min(seat.chips, target - seat.streetBet);
      seat.chips -= paid; seat.streetBet += paid; seat.totalBet += paid; seat.allIn = seat.chips === 0; seat.acted = true; seat.lastAction = action.id as HoldemSeat['lastAction'];
      if (seat.streetBet > previousBet) {
        const raiseSize = seat.streetBet - previousBet;
        next.currentBet = seat.streetBet;
        if (raiseSize >= next.lastFullRaise) {
          next.lastFullRaise = raiseSize;
          next.seats.forEach(other => { if (other.id !== seat.id && canAct(other)) other.acted = false; });
        }
      }
      events.push({ type: action.id, actorId: seat.id, amount: paid, text: `${seat.name}${action.id === 'call' ? '跟注' : action.id === 'all-in' ? '全下' : action.id === 'bet' ? '下注' : '加注至'} ${seat.streetBet}` });
    }
    if (remaining(next).length === 1) return settleHoldem(next);
    if (roundComplete(next)) {
      const streetEvents = beginNextStreet(next);
      events.push(...streetEvents);
      if (next.phase === 'showdown') {
        const settled = settleHoldem(next);
        return { state: settled.state, events: [...events, ...settled.events], finished: true };
      }
    } else next.actingIndex = nextIndex(next, next.actingIndex);
    return { state: next, events, finished: false };
  },
  npcView(state, actorId) {
    return { self: state.seats.find(seat => seat.id === actorId), ownCards: state.hands[actorId], board: state.board, phase: state.phase, buttonIndex: state.buttonIndex, currentBet: state.currentBet, seats: state.seats, pots: buildSidePots(state.seats).pots };
  },
  npcDecision(state, actorId, rng = Math.random) {
    const legal = this.legalActions(state, actorId);
    if (!legal.length) throw new Error('NPC当前没有合法动作');
    const passive = legal.find(action => action.id === 'check') ?? legal.find(action => action.id === 'call') ?? legal[0];
    if (rng() < 0.18) {
      const aggressive = legal.find(action => action.id === 'raise' || action.id === 'bet');
      if (aggressive) return { id: aggressive.id, actorId, amount: aggressive.min };
    }
    return { id: passive.id, actorId };
  },
  settle: settleHoldem,
  publicView(state, viewerId) {
    return { seats: state.seats, buttonIndex: state.buttonIndex, blinds: { small: state.smallBlind, big: state.bigBlind }, phase: state.phase, board: state.board, actingIndex: state.actingIndex, currentBet: state.currentBet, pots: buildSidePots(state.seats).pots, hands: state.phase === 'settled' ? state.hands : viewerId ? { [viewerId]: state.hands[viewerId] } : {}, scores: state.scores, events: state.events };
  },
};

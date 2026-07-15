import type { Card } from './cards';
import { blackjackValue, createDeck } from './cards';
import type { AdapterResult, GameAdapter, GameEvent, Player } from './types';
import { assertAction, randomId } from './types';

export type BlackjackHand = {
  id: string;
  playerId: string;
  cards: Card[];
  bet: number;
  insurance: number;
  state: 'playing' | 'stood' | 'busted' | 'surrendered' | 'blackjack' | 'settled';
  splitAces: boolean;
  original: boolean;
};
export type BlackjackConfig = { players: Player[]; bets: Record<string, number> };
export type BlackjackState = {
  players: Player[];
  deck: Card[];
  dealer: Card[];
  hands: BlackjackHand[];
  activeHand: number;
  phase: 'insurance' | 'player' | 'dealer' | 'settled';
  insurancePending: string[];
  events: GameEvent[];
};

const cardPoint = (card: Card) => card[0] === 'A' ? 11 : ['T', 'J', 'Q', 'K'].includes(card[0]) ? 10 : Number(card[0]);
const natural = (cards: Card[]) => cards.length === 2 && blackjackValue(cards).total === 21;
const nextPlaying = (state: BlackjackState, from: number) => {
  for (let i = Math.max(0, from); i < state.hands.length; i += 1) if (state.hands[i].state === 'playing') return i;
  return -1;
};
function take(state: BlackjackState): Card {
  const card = state.deck.shift();
  if (!card) throw new Error('牌靴已空');
  return card;
}

function runDealer(state: BlackjackState): GameEvent[] {
  const events: GameEvent[] = [{ type: 'reveal', text: `庄家揭示暗牌：${state.dealer[1]}` }];
  while (blackjackValue(state.dealer).total < 17) {
    state.dealer.push(take(state));
    events.push({ type: 'dealer-hit', text: `庄家要牌：${state.dealer.at(-1)}` });
  }
  return events;
}

export function settleBlackjack(state: BlackjackState): AdapterResult<BlackjackState> {
  const next = structuredClone(state);
  const events: GameEvent[] = [];
  const dealerValue = blackjackValue(next.dealer).total;
  const dealerNatural = natural(next.dealer);
  for (const hand of next.hands) {
    const player = next.players.find(item => item.id === hand.playerId)!;
    if (hand.insurance > 0 && dealerNatural) {
      player.chips += hand.insurance * 3;
      events.push({ type: 'insurance', actorId: player.id, amount: hand.insurance * 3, text: `${player.name}的保险按2比1获胜` });
    }
    if (hand.state === 'surrendered') player.chips += hand.bet / 2;
    else if (hand.state === 'busted') { /* bet already collected */ }
    else if (hand.state === 'blackjack' && !dealerNatural) {
      player.chips += hand.bet + hand.bet * 1.5;
      events.push({ type: 'blackjack', actorId: player.id, amount: hand.bet * 1.5, text: `${player.name}天然黑杰克，净赢3比2` });
    } else if (dealerNatural && hand.state === 'blackjack') player.chips += hand.bet;
    else if (dealerNatural) { /* lose */ }
    else {
      const total = blackjackValue(hand.cards).total;
      if (dealerValue > 21 || total > dealerValue) {
        player.chips += hand.bet * 2;
        events.push({ type: 'win', actorId: player.id, amount: hand.bet * 2, text: `${player.name}的${total}点获胜` });
      } else if (total === dealerValue) {
        player.chips += hand.bet;
        events.push({ type: 'push', actorId: player.id, amount: hand.bet, text: `${player.name}与庄家同为${total}点，退回下注` });
      }
    }
    hand.state = 'settled';
  }
  next.phase = 'settled';
  next.activeHand = -1;
  return { state: next, events, finished: true };
}

function advance(state: BlackjackState, events: GameEvent[]): AdapterResult<BlackjackState> {
  state.activeHand = nextPlaying(state, state.activeHand + 1);
  if (state.activeHand >= 0) return { state, events, finished: false };
  state.phase = 'dealer';
  events.push(...runDealer(state));
  const settled = settleBlackjack(state);
  return { state: settled.state, events: [...events, ...settled.events], finished: true };
}

export const blackjackAdapter: GameAdapter<BlackjackState, BlackjackConfig> = {
  kind: '二十一点',
  initialize(config, rng) {
    if (!config.players.length) throw new Error('二十一点至少需要1名玩家');
    const state: BlackjackState = { players: structuredClone(config.players), deck: createDeck(6, rng), dealer: [], hands: [], activeHand: -1, phase: 'player', insurancePending: [], events: [] };
    for (const player of state.players) {
      const bet = Math.floor(config.bets[player.id] ?? 0);
      if (bet <= 0 || bet % 2 !== 0) throw new Error('二十一点初始下注必须是偶数枚小筹码');
      if (player.chips < bet) throw new Error(`${player.name}筹码不足`);
      player.chips -= bet;
      state.hands.push({ id: randomId(), playerId: player.id, cards: [], bet, insurance: 0, state: 'playing', splitAces: false, original: true });
    }
    for (let round = 0; round < 2; round += 1) {
      for (const hand of state.hands) hand.cards.push(take(state));
      state.dealer.push(take(state));
    }
    state.hands.forEach(hand => { if (natural(hand.cards)) hand.state = 'blackjack'; });
    if (state.dealer[0][0] === 'A') {
      state.phase = 'insurance';
      state.insurancePending = state.players.map(player => player.id);
    } else if (cardPoint(state.dealer[0]) === 10 && natural(state.dealer)) {
      state.phase = 'dealer';
      return settleBlackjack(state).state;
    } else state.activeHand = nextPlaying(state, 0);
    if (state.activeHand < 0 && state.phase === 'player') return settleBlackjack(state).state;
    return state;
  },
  legalActions(state, actorId) {
    if (state.phase === 'insurance' && state.insurancePending.includes(actorId)) {
      const hand = state.hands.find(item => item.playerId === actorId)!;
      const player = state.players.find(item => item.id === actorId)!;
      return [{ id: 'decline-insurance', label: '不买保险' }, ...(player.chips >= hand.bet / 2 ? [{ id: 'insurance', label: `保险 ${hand.bet / 2}` }] : [])];
    }
    const hand = state.hands[state.activeHand];
    if (state.phase !== 'player' || !hand || hand.playerId !== actorId || hand.state !== 'playing') return [];
    const player = state.players.find(item => item.id === actorId)!;
    const samePoint = hand.cards.length === 2 && cardPoint(hand.cards[0]) === cardPoint(hand.cards[1]);
    if (hand.splitAces) {
      return samePoint && state.hands.filter(item => item.playerId === actorId).length < 4 && player.chips >= hand.bet
        ? [{ id: 'split', label: `再次分A ${hand.bet}` }]
        : [];
    }
    const actions = [{ id: 'hit', label: '要牌' }, { id: 'stand', label: '停牌' }];
    if (hand.cards.length === 2 && player.chips >= hand.bet) actions.push({ id: 'double', label: `双倍 ${hand.bet}` });
    if (samePoint && state.hands.filter(item => item.playerId === actorId).length < 4 && player.chips >= hand.bet) actions.push({ id: 'split', label: `分牌 ${hand.bet}` });
    if (hand.original && hand.cards.length === 2) actions.push({ id: 'surrender', label: '晚投降' });
    return actions;
  },
  applyAction(state, action) {
    assertAction(this.legalActions(state, action.actorId), action);
    const next = structuredClone(state);
    const events: GameEvent[] = [];
    if (next.phase === 'insurance') {
      const hand = next.hands.find(item => item.playerId === action.actorId)!;
      if (action.id === 'insurance') {
        const player = next.players.find(item => item.id === action.actorId)!;
        hand.insurance = hand.bet / 2;
        player.chips -= hand.insurance;
        events.push({ type: 'insurance', actorId: player.id, amount: hand.insurance, text: `${player.name}购买保险` });
      }
      next.insurancePending = next.insurancePending.filter(id => id !== action.actorId);
      if (next.insurancePending.length) return { state: next, events, finished: false };
      if (natural(next.dealer)) {
        events.push({ type: 'blackjack', text: '庄家揭示天然黑杰克' });
        const settled = settleBlackjack(next);
        return { state: settled.state, events: [...events, ...settled.events], finished: true };
      }
      next.phase = 'player';
      next.activeHand = nextPlaying(next, 0);
      if (next.activeHand < 0) return advance(next, events);
      return { state: next, events, finished: false };
    }
    const hand = next.hands[next.activeHand];
    const player = next.players.find(item => item.id === action.actorId)!;
    if (action.id === 'hit') {
      hand.cards.push(take(next));
      const total = blackjackValue(hand.cards).total;
      events.push({ type: 'hit', actorId: player.id, text: `${player.name}要到${hand.cards.at(-1)}，当前${total}点` });
      if (total > 21) hand.state = 'busted';
      else if (total === 21) hand.state = 'stood';
    } else if (action.id === 'stand') hand.state = 'stood';
    else if (action.id === 'surrender') hand.state = 'surrendered';
    else if (action.id === 'double') {
      player.chips -= hand.bet; hand.bet *= 2; hand.cards.push(take(next));
      hand.state = blackjackValue(hand.cards).total > 21 ? 'busted' : 'stood';
    } else if (action.id === 'split') {
      player.chips -= hand.bet;
      const splitCard = hand.cards.pop()!;
      const splitAces = hand.cards[0][0] === 'A';
      const newHand: BlackjackHand = { ...structuredClone(hand), id: randomId(), cards: [splitCard], splitAces, original: false };
      hand.splitAces = splitAces; hand.original = false;
      hand.cards.push(take(next)); newHand.cards.push(take(next));
      if (splitAces) {
        hand.state = hand.cards[1][0] === 'A' ? 'playing' : 'stood';
        newHand.state = newHand.cards[1][0] === 'A' ? 'playing' : 'stood';
      }
      next.hands.splice(next.activeHand + 1, 0, newHand);
    }
    if (hand.state === 'playing') return { state: next, events, finished: false };
    return advance(next, events);
  },
  npcView(state, actorId) {
    const hand = state.hands[state.activeHand]?.playerId === actorId ? state.hands[state.activeHand] : state.hands.find(item => item.playerId === actorId);
    return { self: state.players.find(item => item.id === actorId), ownHand: hand, dealerUpCard: state.dealer[0], phase: state.phase, legalActions: this.legalActions(state, actorId) };
  },
  npcDecision(state, actorId) {
    const legal = this.legalActions(state, actorId);
    if (legal.some(item => item.id === 'decline-insurance')) return { id: 'decline-insurance', actorId };
    const hand = state.hands[state.activeHand];
    const total = blackjackValue(hand.cards).total;
    return { id: total >= 17 ? 'stand' : 'hit', actorId };
  },
  settle: settleBlackjack,
  publicView(state, viewerId) {
    return { players: state.players, hands: state.hands, dealer: state.phase === 'settled' ? state.dealer : [state.dealer[0], '??'], activeHand: state.activeHand, phase: state.phase, legalActions: viewerId ? this.legalActions(state, viewerId) : [] };
  },
};

import * as lodash from 'lodash';
import { blackjackValue, compareScores, evaluateHoldem } from '../界面/状态栏/games/cards';
import { blackjackAdapter, type BlackjackState } from '../界面/状态栏/games/blackjack';
import { fromSmallChips, toSmallChips } from '../界面/状态栏/games/chips';
import { diceAdapter } from '../界面/状态栏/games/dice';
import { buildSidePots, holdemAdapter, type HoldemSeat } from '../界面/状态栏/games/holdem';
import { isRouletteWinner, rouletteAdapter, ROULETTE_ODDS, validateRouletteBet } from '../界面/状态栏/games/roulette';

(globalThis as any)._ = lodash;

const assert = {
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected) throw new Error(`断言失败：${String(actual)} !== ${String(expected)}`);
  },
  deepEqual(actual: unknown, expected: unknown) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`深度断言失败：${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  },
  ok(value: unknown) {
    if (!value) throw new Error('真值断言失败');
  },
  throws(fn: () => unknown) {
    let thrown = false;
    try { fn(); } catch { thrown = true; }
    if (!thrown) throw new Error('预期函数抛出异常');
  },
};

assert.deepEqual(fromSmallChips(31), { 大筹码: 3, 小筹码: 1 });
assert.equal(toSmallChips({ 大筹码: 3, 小筹码: 1 }), 31);

const royal = evaluateHoldem(['AS', 'KS', 'QS', 'JS', 'TS', '2D', '3C']);
const wheel = evaluateHoldem(['AS', '2D', '3C', '4H', '5S', 'KD', 'QC']);
assert.equal(royal.label, '皇家同花顺');
assert.equal(wheel.label, '顺子');
assert.ok(compareScores(royal, wheel) > 0);
assert.deepEqual(blackjackValue(['AS', 'AH', '9C']).total, 21);
assert.deepEqual(blackjackValue(['AS', '6H']).soft, true);

const sideSeats: HoldemSeat[] = [
  { id: 'a', name: 'A', chips: 0, folded: false, allIn: true, streetBet: 0, totalBet: 100, acted: true, lastAction: 'all-in' },
  { id: 'b', name: 'B', chips: 0, folded: false, allIn: true, streetBet: 0, totalBet: 50, acted: true, lastAction: 'all-in' },
  { id: 'c', name: 'C', chips: 0, folded: true, allIn: true, streetBet: 0, totalBet: 20, acted: true, lastAction: 'fold' },
];
const sidePots = buildSidePots(sideSeats);
assert.deepEqual(sidePots.pots, [{ amount: 60, eligible: ['a', 'b'] }, { amount: 60, eligible: ['a', 'b'] }]);
assert.deepEqual(sidePots.refunds, { a: 50 });

const holdem = holdemAdapter.initialize({ players: [{ id: 'user', name: 'U', chips: 100, isUser: true }, { id: 'npc', name: 'N', chips: 100 }], buttonIndex: 0 }, () => 0.37);
const npcView = holdemAdapter.npcView(holdem, 'npc');
assert.deepEqual(npcView.ownCards, holdem.hands.npc);
assert.equal(JSON.stringify(npcView).includes(JSON.stringify(holdem.hands.user)), false);
assert.deepEqual(holdemAdapter.publicView(holdem), expectNoHands());

const reopen = structuredClone(holdem);
reopen.phase = 'flop';
reopen.actingIndex = 0;
reopen.currentBet = 170;
reopen.lastFullRaise = 100;
reopen.seats[0].streetBet = 100;
reopen.seats[0].chips = 500;
reopen.seats[0].acted = true;
reopen.seats[0].lastAction = 'call';
assert.equal(holdemAdapter.legalActions(reopen, 'user').some(action => action.id === 'raise'), false);
assert.equal(holdemAdapter.legalActions(reopen, 'user').some(action => action.id === 'all-in'), false);
reopen.currentBet = 200;
assert.equal(holdemAdapter.legalActions(reopen, 'user').some(action => action.id === 'raise'), true);

const dice = diceAdapter.initialize({ players: [{ id: 'user', name: 'U', chips: 10, isUser: true }, { id: 'npc', name: 'N', chips: 10 }], stake: 2 });
const tiedDice = diceAdapter.applyAction(dice, { id: 'roll', actorId: 'user' }, () => 0);
assert.equal(tiedDice.state.phase, 'reroll');
assert.equal(tiedDice.finished, false);

assert.equal(ROULETTE_ODDS.单号, 35);
assert.equal(ROULETTE_ODDS.首四注, 8);
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '三数注', numbers: [0, 1, 2], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '单号', numbers: [17], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '分注', numbers: [1, 2], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '街注', numbers: [1, 2, 3], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '角注', numbers: [1, 2, 4, 5], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '首四注', numbers: [0, 1, 2, 3], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '线注', numbers: [1, 2, 3, 4, 5, 6], amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '列注', numbers: Array.from({ length: 12 }, (_, index) => index * 3 + 1), amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '打注', numbers: Array.from({ length: 12 }, (_, index) => index + 1), choice: '1-12', amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '红黑', numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36], choice: '红', amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '单双', numbers: Array.from({ length: 18 }, (_, index) => index * 2 + 1), choice: '单', amount: 1 }));
assert.ok(validateRouletteBet({ id: 'x', playerId: 'user', type: '大小', numbers: Array.from({ length: 18 }, (_, index) => index + 19), choice: '大', amount: 1 }));
assert.ok(!validateRouletteBet({ id: 'x', playerId: 'user', type: '街注', numbers: [0, 1, 2], amount: 1 }));
assert.ok(!isRouletteWinner({ id: 'x', playerId: 'user', type: '红黑', numbers: [], choice: '红', amount: 1 }, 0));
const roulette = rouletteAdapter.initialize({ players: [{ id: 'user', name: 'U', chips: 20, isUser: true }] });
const withBet = rouletteAdapter.applyAction(roulette, { id: 'place-bet', actorId: 'user', amount: 2, payload: { bet: { id: 'r1', playerId: 'user', type: '单号', numbers: [0], amount: 2 } } });
const spun = rouletteAdapter.applyAction(withBet.state, { id: 'spin', actorId: 'user' }, () => 0);
assert.equal(spun.state.result, 0);
assert.equal(spun.state.players[0].chips, 90);

assert.throws(() => blackjackAdapter.initialize({ players: [{ id: 'user', name: 'U', chips: 20 }], bets: { user: 3 } }, () => 0.5));
const blackjack = blackjackAdapter.initialize({ players: [{ id: 'user', name: 'U', chips: 20, isUser: true }], bets: { user: 2 } }, () => 0.5);
assert.equal(blackjack.dealer.length, 2);
assert.equal((blackjackAdapter.publicView(blackjack) as any).dealer[1], '??');

const splitAces: BlackjackState = {
  players: [{ id: 'user', name: 'U', chips: 20, isUser: true }],
  deck: ['AS', '5C', '2D', '3D', '2C', 'KD'],
  dealer: ['9C', '7D'],
  hands: [{ id: 'h1', playerId: 'user', cards: ['AH', 'AD'], bet: 2, insurance: 0, state: 'playing', splitAces: false, original: true }],
  activeHand: 0,
  phase: 'player',
  insurancePending: [],
  events: [],
};
const onceSplit = blackjackAdapter.applyAction(splitAces, { id: 'split', actorId: 'user' });
assert.deepEqual(blackjackAdapter.legalActions(onceSplit.state, 'user').map(action => action.id), ['split']);
const twiceSplit = blackjackAdapter.applyAction(onceSplit.state, { id: 'split', actorId: 'user' });
assert.equal(twiceSplit.state.hands.length, 3);

function expectNoHands(): any {
  const view = holdemAdapter.publicView(holdem) as any;
  assert.deepEqual(view.hands, {});
  return view;
}

console.info('FeijinHuanting engine tests: PASS');

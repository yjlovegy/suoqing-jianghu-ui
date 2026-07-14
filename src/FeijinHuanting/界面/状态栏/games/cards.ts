import type { RandomSource } from './types';
import { shuffled } from './types';

export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUITS = ['C', 'D', 'H', 'S'] as const;
export type Card = `${(typeof RANKS)[number]}${(typeof SUITS)[number]}`;

export function createDeck(decks = 1, rng?: RandomSource): Card[] {
  const cards: Card[] = [];
  for (let deck = 0; deck < decks; deck += 1) {
    for (const rank of RANKS) for (const suit of SUITS) cards.push(`${rank}${suit}`);
  }
  return shuffled(cards, rng);
}

const rankValue = (card: Card) => RANKS.indexOf(card[0] as (typeof RANKS)[number]) + 2;

export type HandScore = {
  category: number;
  label: string;
  kickers: number[];
  cards: Card[];
};

function straightHigh(values: number[]): number {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let i = 0; i <= unique.length - 5; i += 1) {
    if (unique[i] - unique[i + 4] === 4) return unique[i];
  }
  return 0;
}

export function evaluateFive(cards: Card[]): HandScore {
  if (cards.length !== 5) throw new Error('五张牌评估器必须恰好接收5张牌');
  const values = cards.map(rankValue).sort((a, b) => b - a);
  const counts = _.countBy(values);
  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flush = cards.every(card => card[1] === cards[0][1]);
  const straight = straightHigh(values);
  if (flush && straight) return { category: 8, label: straight === 14 ? '皇家同花顺' : '同花顺', kickers: [straight], cards };
  if (groups[0].count === 4) return { category: 7, label: '四条', kickers: [groups[0].value, groups[1].value], cards };
  if (groups[0].count === 3 && groups[1].count === 2) return { category: 6, label: '葫芦', kickers: [groups[0].value, groups[1].value], cards };
  if (flush) return { category: 5, label: '同花', kickers: values, cards };
  if (straight) return { category: 4, label: '顺子', kickers: [straight], cards };
  if (groups[0].count === 3) return { category: 3, label: '三条', kickers: [groups[0].value, ...groups.slice(1).map(g => g.value).sort((a, b) => b - a)], cards };
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = [groups[0].value, groups[1].value].sort((a, b) => b - a);
    return { category: 2, label: '两对', kickers: [...pairs, groups[2].value], cards };
  }
  if (groups[0].count === 2) return { category: 1, label: '一对', kickers: [groups[0].value, ...groups.slice(1).map(g => g.value).sort((a, b) => b - a)], cards };
  return { category: 0, label: '高牌', kickers: values, cards };
}

export function compareScores(a: HandScore, b: HandScore): number {
  if (a.category !== b.category) return Math.sign(a.category - b.category);
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i += 1) {
    if ((a.kickers[i] ?? 0) !== (b.kickers[i] ?? 0)) return Math.sign((a.kickers[i] ?? 0) - (b.kickers[i] ?? 0));
  }
  return 0;
}

export function evaluateHoldem(cards: Card[]): HandScore {
  if (cards.length < 5 || cards.length > 7) throw new Error('德州评估器需要5至7张牌');
  let best: HandScore | undefined;
  for (let a = 0; a < cards.length - 4; a += 1)
    for (let b = a + 1; b < cards.length - 3; b += 1)
      for (let c = b + 1; c < cards.length - 2; c += 1)
        for (let d = c + 1; d < cards.length - 1; d += 1)
          for (let e = d + 1; e < cards.length; e += 1) {
            const score = evaluateFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareScores(score, best) > 0) best = score;
          }
  return best!;
}

export function blackjackValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const value = rankValue(card);
    if (value === 14) {
      aces += 1;
      total += 11;
    } else total += Math.min(value, 10);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

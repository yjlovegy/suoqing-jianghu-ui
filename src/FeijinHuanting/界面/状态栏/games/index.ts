export * from './types';
export * from './chips';
export * from './cards';
export * from './dice';
export * from './holdem';
export * from './blackjack';
export * from './roulette';

import { blackjackAdapter } from './blackjack';
import { diceAdapter } from './dice';
import { holdemAdapter } from './holdem';
import { rouletteAdapter } from './roulette';

export const gameAdapters = {
  骰子比大小: diceAdapter,
  德州扑克: holdemAdapter,
  二十一点: blackjackAdapter,
  欧式轮盘: rouletteAdapter,
};

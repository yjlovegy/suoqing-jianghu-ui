export type ChipBalance = { 大筹码: number; 小筹码: number };

export function toSmallChips(balance: ChipBalance): number {
  return Math.max(0, Math.floor(balance.大筹码)) * 10 + Math.max(0, Math.floor(balance.小筹码));
}

export function fromSmallChips(total: number): ChipBalance {
  const safe = Math.max(0, Math.floor(total));
  return { 大筹码: Math.floor(safe / 10), 小筹码: safe % 10 };
}

export function dollarsToChips(dollars: number): ChipBalance {
  if (!Number.isFinite(dollars) || dollars < 0 || dollars % 10_000 !== 0) {
    throw new Error('入场资金必须是1万美元的非负整数倍');
  }
  return fromSmallChips(dollars / 10_000);
}

export function transfer(total: number, delta: number): number {
  const next = Math.floor(total) + Math.floor(delta);
  if (next < 0) throw new Error('筹码不足');
  return next;
}

export type GameKind = '骰子比大小' | '德州扑克' | '二十一点' | '欧式轮盘';

export type Player = {
  id: string;
  name: string;
  chips: number;
  isUser?: boolean;
};

export type GameAction = {
  id: string;
  actorId: string;
  amount?: number;
  payload?: Record<string, unknown>;
};

export type LegalAction = {
  id: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  needsAmount?: boolean;
};

export type GameEvent = {
  type: string;
  text: string;
  actorId?: string;
  amount?: number;
};

export type AdapterResult<State> = {
  state: State;
  events: GameEvent[];
  finished: boolean;
};

export type RandomSource = () => number;

export type CryptoProvider = {
  randomUUID?: () => string;
  getRandomValues?: (values: Uint8Array) => Uint8Array;
};

export interface GameAdapter<State, Config = unknown> {
  readonly kind: GameKind;
  initialize(config: Config, rng?: RandomSource): State;
  legalActions(state: State, actorId: string): LegalAction[];
  applyAction(state: State, action: GameAction, rng?: RandomSource): AdapterResult<State>;
  npcView(state: State, actorId: string): Record<string, unknown>;
  npcDecision(state: State, actorId: string, rng?: RandomSource): GameAction;
  settle(state: State): AdapterResult<State>;
  publicView(state: State, viewerId?: string): Record<string, unknown>;
}

function runtimeCrypto(): CryptoProvider | undefined {
  return globalThis.crypto as unknown as CryptoProvider | undefined;
}

function randomBytes(length: number, provider = runtimeCrypto()): Uint8Array {
  const values = new Uint8Array(length);
  if (typeof provider?.getRandomValues === 'function') return provider.getRandomValues(values);
  for (let index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * 256);
  return values;
}

export function randomId(provider = runtimeCrypto()): string {
  if (typeof provider?.randomUUID === 'function') return provider.randomUUID.call(provider);
  const values = randomBytes(16, provider);
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;
  const hex = Array.from(values, value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function secureRandom(): number {
  const values = new Uint32Array(1);
  const provider = runtimeCrypto();
  if (typeof provider?.getRandomValues === 'function') {
    provider.getRandomValues(new Uint8Array(values.buffer));
    return values[0] / 0x1_0000_0000;
  }
  return Math.random();
}

export function randomInt(min: number, max: number, rng: RandomSource = secureRandom): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function shuffled<T>(items: readonly T[], rng: RandomSource = secureRandom): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function assertAction(legal: LegalAction[], action: GameAction): LegalAction {
  const found = legal.find(item => item.id === action.id);
  if (!found) throw new Error(`非法动作：${action.id}`);
  if (found.needsAmount) {
    const amount = Math.floor(action.amount ?? Number.NaN);
    if (!Number.isFinite(amount) || amount < (found.min ?? 0) || amount > (found.max ?? amount)) {
      throw new Error(`下注不在合法范围：${action.amount ?? '未填写'}`);
    }
    if (amount % (found.step ?? 1) !== 0) throw new Error(`下注必须按 ${found.step} 的步长调整`);
  }
  return found;
}

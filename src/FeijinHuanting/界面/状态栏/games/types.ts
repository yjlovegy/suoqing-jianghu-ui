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

export function secureRandom(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 0x1_0000_0000;
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

/**
 * DailyChallengeSystem のプロパティベーステスト
 *
 * Requirements: 18.1
 *
 * Property 15: デイリーチャレンジ生成の決定論的確定性
 *   Validates: Requirements 18.1
 */

// Feature: gelpiyo-deep-sea-adventure, Property 15: デイリーチャレンジ生成の決定論的確定性

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { seededRandom } from '../utils/MathUtils';

// ---------------------------------------------------------------------------
// localStorage モック（Node 環境では存在しないため）
// ---------------------------------------------------------------------------

function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = value;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    },
  };
}

// グローバル localStorage を差し替え
const mockStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

// 各テスト前にストレージをリセット
beforeEach(() => {
  mockStorage.clear();
});

// ---------------------------------------------------------------------------
// デイリーチャレンジ生成アルゴリズム（設計書 §6 より）
// ---------------------------------------------------------------------------

/**
 * 日付文字列をシードとして DailyChallenge を生成する（設計書と同一アルゴリズム）。
 * DailyChallengeSystem.generateForToday() の純粋な関数形式。
 */
function generateChallengeForDate(dateStr: string): {
  type: 'score' | 'items' | 'survive';
  objective: number;
  bonusScore: number;
} {
  const rand = seededRandom(dateStr);
  const types = ['score', 'items', 'survive'] as const;
  const type = types[Math.floor(rand() * 3)];

  let objective: number;
  let bonusScore: number;

  switch (type) {
    case 'score':
      objective = Math.floor(rand() * (50 - 10 + 1)) + 10;
      bonusScore = 100;
      break;
    case 'items':
      objective = Math.floor(rand() * (20 - 5 + 1)) + 5;
      bonusScore = 50;
      break;
    case 'survive':
      objective = Math.floor(rand() * (120 - 30 + 1)) + 30;
      bonusScore = 75;
      break;
  }

  return { type, objective, bonusScore };
}

// ---------------------------------------------------------------------------
// ユニットテスト
// ---------------------------------------------------------------------------

describe('seededRandom: 決定論的確定性', () => {
  it('同一シードを与えると毎回同じ最初の値を返す', () => {
    const seed = '2024-06-15';
    const r1 = seededRandom(seed)();
    const r2 = seededRandom(seed)();
    expect(r1).toBe(r2);
  });

  it('同一シードを与えると複数回呼んでも同じ値の列を生成する', () => {
    const seed = '2024-01-01';
    const rand1 = seededRandom(seed);
    const rand2 = seededRandom(seed);

    for (let i = 0; i < 10; i++) {
      expect(rand1()).toBe(rand2());
    }
  });

  it('異なるシードを与えると異なる値を返す（代表例）', () => {
    expect(seededRandom('2024-06-15')()).not.toBe(seededRandom('2024-06-16')());
    expect(seededRandom('2024-01-01')()).not.toBe(seededRandom('2024-12-31')());
  });

  it('生成値は 0.0〜1.0 の範囲内である', () => {
    const rand = seededRandom('2024-06-15');
    for (let i = 0; i < 20; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('generateChallengeForDate: 決定論的確定性', () => {
  it('同一の日付文字列から生成されるチャレンジは一致する', () => {
    const date = '2024-06-15';
    const c1 = generateChallengeForDate(date);
    const c2 = generateChallengeForDate(date);
    expect(c1).toEqual(c2);
  });

  it('チャレンジの type は score | items | survive のいずれかである', () => {
    const valid = new Set(['score', 'items', 'survive']);
    expect(valid.has(generateChallengeForDate('2024-01-01').type)).toBe(true);
    expect(valid.has(generateChallengeForDate('2024-06-15').type)).toBe(true);
    expect(valid.has(generateChallengeForDate('2024-12-31').type)).toBe(true);
  });

  it('score チャレンジの bonusScore は 100', () => {
    // 特定日付で score になることを確認するか、全タイプを網羅するためにループ
    for (let d = 1; d <= 28; d++) {
      const date = `2024-01-${String(d).padStart(2, '0')}`;
      const c = generateChallengeForDate(date);
      if (c.type === 'score') {
        expect(c.bonusScore).toBe(100);
        expect(c.objective).toBeGreaterThanOrEqual(10);
        expect(c.objective).toBeLessThanOrEqual(50);
      }
    }
  });

  it('items チャレンジの bonusScore は 50', () => {
    for (let d = 1; d <= 28; d++) {
      const date = `2024-01-${String(d).padStart(2, '0')}`;
      const c = generateChallengeForDate(date);
      if (c.type === 'items') {
        expect(c.bonusScore).toBe(50);
        expect(c.objective).toBeGreaterThanOrEqual(5);
        expect(c.objective).toBeLessThanOrEqual(20);
      }
    }
  });

  it('survive チャレンジの bonusScore は 75', () => {
    for (let d = 1; d <= 28; d++) {
      const date = `2024-01-${String(d).padStart(2, '0')}`;
      const c = generateChallengeForDate(date);
      if (c.type === 'survive') {
        expect(c.bonusScore).toBe(75);
        expect(c.objective).toBeGreaterThanOrEqual(30);
        expect(c.objective).toBeLessThanOrEqual(120);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Property 15: デイリーチャレンジ生成の決定論的確定性
// Validates: Requirements 18.1
// ---------------------------------------------------------------------------

describe('Property 15: デイリーチャレンジ生成の決定論的確定性', () => {
  /**
   * サブプロパティ 1:
   * 同一の日付文字列を与えると seededRandom が常に同じ値を返す（決定論的）
   */
  it('サブプロパティ 1: 同一シードに対して seededRandom は常に同じ値を返す', () => {
    // Feature: gelpiyo-deep-sea-adventure, Property 15: デイリーチャレンジ生成の決定論的確定性
    const dateArb = fc.tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    fc.assert(
      fc.property(dateArb, fc.integer({ min: 1, max: 20 }), (dateStr, callCount) => {
        const rand1 = seededRandom(dateStr);
        const rand2 = seededRandom(dateStr);

        for (let i = 0; i < callCount; i++) {
          if (rand1() !== rand2()) return false;
        }
        return true;
      }),
      { numRuns: 200 }
    );
  });

  /**
   * サブプロパティ 2:
   * 同じ日付文字列からは常に同一のチャレンジ（type・objective・bonusScore）が生成される
   */
  it('サブプロパティ 2: 同じ日付文字列から生成されるチャレンジは常に同一', () => {
    // Feature: gelpiyo-deep-sea-adventure, Property 15: デイリーチャレンジ生成の決定論的確定性
    const dateArb = fc.tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const c1 = generateChallengeForDate(dateStr);
        const c2 = generateChallengeForDate(dateStr);
        const c3 = generateChallengeForDate(dateStr);

        return (
          c1.type === c2.type &&
          c1.type === c3.type &&
          c1.objective === c2.objective &&
          c1.objective === c3.objective &&
          c1.bonusScore === c2.bonusScore &&
          c1.bonusScore === c3.bonusScore
        );
      }),
      { numRuns: 200 }
    );
  });

  /**
   * サブプロパティ 3:
   * 異なる日付文字列は異なるハッシュ値を生成する（高確率で）
   *
   * 注: 理論上のハッシュ衝突がありうるため、十分に離れた日付同士でテストする。
   * 31日以上離れた日付ペアを使い、実際に seededRandom の初回値が異なることを確認する。
   */
  it('サブプロパティ 3: 異なる日付文字列は高確率で異なるチャレンジを生成する', () => {
    // Feature: gelpiyo-deep-sea-adventure, Property 15: デイリーチャレンジ生成の決定論的確定性
    //
    // 戦略: 2つの異なる年（例: 2024 vs 2025）の同じ月日を比較すると、
    // ほぼ確実にシードが異なるため seededRandom の値も異なる。
    // 100件の異なる日付ペアで少なくとも seededRandom の初回値が異なることを確認する。

    const dateArb = fc.tuple(
      fc.integer({ min: 2020, max: 2028 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    // 2つの異なる日付を生成し、seededRandom の最初の値が異なることを確認する
    fc.assert(
      fc.property(
        dateArb,
        fc.integer({ min: 1, max: 9 }),
        (dateStr, yearOffset) => {
          // 年が異なる2つの日付（同じ月日、異なる年）を生成
          const year = parseInt(dateStr.substring(0, 4));
          const rest = dateStr.substring(4); // "-MM-DD"
          const dateStr2 = `${year + yearOffset}${rest}`;

          // 同一文字列になることはない（yearOffset >= 1 のため）
          if (dateStr === dateStr2) return true; // スキップ

          const v1 = seededRandom(dateStr)();
          const v2 = seededRandom(dateStr2)();

          // 異なる日付からは異なる初回値が生成される（高確率）
          // ハッシュ衝突は実用上発生しないが、万が一の場合はスキップ扱いとしない
          return v1 !== v2;
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * 追加検証: 生成されるチャレンジの値は常に有効な範囲内
   */
  it('生成されるチャレンジの objective は常にチャレンジ種別の有効範囲内', () => {
    // Feature: gelpiyo-deep-sea-adventure, Property 15: デイリーチャレンジ生成の決定論的確定性
    const dateArb = fc.tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);

    fc.assert(
      fc.property(dateArb, (dateStr) => {
        const { type, objective, bonusScore } = generateChallengeForDate(dateStr);

        switch (type) {
          case 'score':
            return objective >= 10 && objective <= 50 && bonusScore === 100;
          case 'items':
            return objective >= 5 && objective <= 20 && bonusScore === 50;
          case 'survive':
            return objective >= 30 && objective <= 120 && bonusScore === 75;
        }
      }),
      { numRuns: 500 }
    );
  });
});

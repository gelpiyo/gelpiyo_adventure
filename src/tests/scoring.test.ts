/**
 * ScoreSystem のユニットテスト + プロパティベーステスト
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 *
 * Property 5: スコア加算の一貫性
 *   Validates: Requirements 9.1
 *
 * Property 6: ハイスコアの永続化ラウンドトリップ（ScoreSystem 経由）
 *   Validates: Requirements 9.4, 9.5, 1.4, 1.7
 *
 * Property 7: ハイスコア更新条件の正確性
 *   Validates: Requirements 8.6, 12.1, 12.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ScoreSystem } from '../systems/ScoreSystem';
import { ITEM_CONFIGS } from '../config';

// ---------------------------------------------------------------------------
// localStorage モック（Node 環境用）
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

const mockStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

beforeEach(() => {
  mockStorage.clear();
});

// ---------------------------------------------------------------------------
// ユニットテスト: 初期化
// ---------------------------------------------------------------------------

describe('ScoreSystem 初期化', () => {
  it('コンストラクタで currentScore と highScore が 0 になる（Req 9.3）', () => {
    const sys = new ScoreSystem();
    expect(sys.currentScore).toBe(0);
    expect(sys.highScore).toBe(0);
  });

  it('initialize() で localStorage の highScore が読み込まれる（Req 9.5）', () => {
    mockStorage.setItem('gelpiyo_highScore', '120');
    const sys = new ScoreSystem();
    sys.initialize();
    expect(sys.highScore).toBe(120);
  });

  it('initialize() で localStorage が空の場合 highScore は 0 のまま', () => {
    const sys = new ScoreSystem();
    sys.initialize();
    expect(sys.highScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: incrementScore
// ---------------------------------------------------------------------------

describe('ScoreSystem.incrementScore', () => {
  it('1 ポイント加算で currentScore が 1 増える（Req 9.1）', () => {
    const sys = new ScoreSystem();
    sys.incrementScore(1);
    expect(sys.currentScore).toBe(1);
  });

  it('複数回呼ぶと累積される', () => {
    const sys = new ScoreSystem();
    sys.incrementScore(5);
    sys.incrementScore(10);
    sys.incrementScore(20);
    expect(sys.currentScore).toBe(35);
  });

  it('障害物通過時に 1 ポイント加算（Req 9.1）', () => {
    const sys = new ScoreSystem();
    sys.incrementScore(1);
    expect(sys.currentScore).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: applyComboMultiplier
// ---------------------------------------------------------------------------

describe('ScoreSystem.applyComboMultiplier', () => {
  it('1x 乗数では basePoints をそのまま返す', () => {
    const sys = new ScoreSystem();
    expect(sys.applyComboMultiplier(1, 5)).toBe(5);
  });

  it('2x 乗数では basePoints の 2 倍を返す（Req 17.2）', () => {
    const sys = new ScoreSystem();
    expect(sys.applyComboMultiplier(2, 10)).toBe(20);
  });

  it('3x 乗数では basePoints の 3 倍を返す（Req 17.3）', () => {
    const sys = new ScoreSystem();
    expect(sys.applyComboMultiplier(3, 20)).toBe(60);
  });

  it('applyComboMultiplier はスコアへの加算を行わない', () => {
    const sys = new ScoreSystem();
    sys.applyComboMultiplier(3, 10);
    expect(sys.currentScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: checkAndUpdateHighScore
// ---------------------------------------------------------------------------

describe('ScoreSystem.checkAndUpdateHighScore', () => {
  it('currentScore > highScore の場合 true を返して highScore を更新する（Req 8.6）', () => {
    const sys = new ScoreSystem();
    sys.initialize();
    sys.incrementScore(50);
    const result = sys.checkAndUpdateHighScore();
    expect(result).toBe(true);
    expect(sys.highScore).toBe(50);
  });

  it('checkAndUpdateHighScore 後 localStorage にも保存される（Req 9.4）', () => {
    const sys = new ScoreSystem();
    sys.initialize();
    sys.incrementScore(75);
    sys.checkAndUpdateHighScore();
    const stored = parseInt(mockStorage.getItem('gelpiyo_highScore') ?? '0', 10);
    expect(stored).toBe(75);
  });

  it('currentScore === highScore の場合 false を返して highScore は変わらない（Req 12.2）', () => {
    mockStorage.setItem('gelpiyo_highScore', '50');
    const sys = new ScoreSystem();
    sys.initialize();
    // currentScore をハイスコアと同じ値に設定
    sys.currentScore = 50;
    const result = sys.checkAndUpdateHighScore();
    expect(result).toBe(false);
    expect(sys.highScore).toBe(50);
  });

  it('currentScore < highScore の場合 false を返して highScore は変わらない（Req 12.1）', () => {
    mockStorage.setItem('gelpiyo_highScore', '100');
    const sys = new ScoreSystem();
    sys.initialize();
    sys.incrementScore(30);
    const result = sys.checkAndUpdateHighScore();
    expect(result).toBe(false);
    expect(sys.highScore).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: persistHighScore
// ---------------------------------------------------------------------------

describe('ScoreSystem.persistHighScore', () => {
  it('highScore を localStorage に保存する（Req 9.4）', () => {
    const sys = new ScoreSystem();
    sys.highScore = 200;
    sys.persistHighScore();
    const stored = parseInt(mockStorage.getItem('gelpiyo_highScore') ?? '-1', 10);
    expect(stored).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: reset
// ---------------------------------------------------------------------------

describe('ScoreSystem.reset', () => {
  it('currentScore が 0 にリセットされる（Req 12.7）', () => {
    const sys = new ScoreSystem();
    sys.incrementScore(99);
    sys.reset();
    expect(sys.currentScore).toBe(0);
  });

  it('reset は highScore をリセットしない', () => {
    mockStorage.setItem('gelpiyo_highScore', '150');
    const sys = new ScoreSystem();
    sys.initialize();
    sys.incrementScore(50);
    sys.reset();
    expect(sys.highScore).toBe(150);
    expect(sys.currentScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5: スコア加算の一貫性
// Feature: gelpiyo-deep-sea-adventure, Property 5: スコア加算の一貫性
// Validates: Requirements 9.1
// ---------------------------------------------------------------------------

describe('Property 5: スコア加算の一貫性', () => {
  it('任意の currentScore と加算ポイントに対し incrementScore 後は previousScore + points になる', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000 }),   // 初期スコア（非負整数）
        fc.nat({ max: 100_000 }),      // 加算ポイント（非負整数）
        (initialScore, points) => {
          const sys = new ScoreSystem();
          sys.currentScore = initialScore;
          sys.incrementScore(points);
          return sys.currentScore === initialScore + points;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: ハイスコアの永続化ラウンドトリップ（ScoreSystem 経由）
// Feature: gelpiyo-deep-sea-adventure, Property 6: ハイスコアの永続化ラウンドトリップ
// Validates: Requirements 9.4, 9.5, 1.4, 1.7
// ---------------------------------------------------------------------------

describe('Property 6: ハイスコアの永続化ラウンドトリップ（ScoreSystem 経由）', () => {
  it('persistHighScore 後に新しい ScoreSystem で initialize() するとハイスコアが復元される', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000 }), (score) => {
        mockStorage.clear();

        // 保存
        const sys1 = new ScoreSystem();
        sys1.highScore = score;
        sys1.persistHighScore();

        // 読み込み
        const sys2 = new ScoreSystem();
        sys2.initialize();

        return sys2.highScore === score;
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: ハイスコア更新条件の正確性
// Feature: gelpiyo-deep-sea-adventure, Property 7: ハイスコア更新条件の正確性
// Validates: Requirements 8.6, 12.1, 12.2
// ---------------------------------------------------------------------------

describe('Property 7: ハイスコア更新条件の正確性', () => {
  it('currentScore > storedHighScore の場合 true を返し localStorage が更新される', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000 }),
        fc.nat({ max: 1_000_000 }),
        (a, b) => {
          // currentScore と highScore が厳密に異なる値になるよう調整
          const currentScore = Math.max(a, b) + 1;
          const storedHighScore = Math.min(a, b);

          mockStorage.clear();
          const sys = new ScoreSystem();
          sys.highScore = storedHighScore;
          sys.currentScore = currentScore;

          const result = sys.checkAndUpdateHighScore();

          const storedValue = parseInt(mockStorage.getItem('gelpiyo_highScore') ?? '0', 10);
          return (
            result === true &&
            sys.highScore === currentScore &&
            storedValue === currentScore
          );
        }
      )
    );
  });

  it('currentScore <= storedHighScore の場合 false を返し localStorage は変更されない', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000 }),
        fc.nat({ max: 1_000_000 }),
        (a, b) => {
          const currentScore = Math.min(a, b);
          const storedHighScore = Math.max(a, b);

          mockStorage.clear();
          // localStorage に storedHighScore を書き込んでおく
          mockStorage.setItem('gelpiyo_highScore', String(storedHighScore));

          const sys = new ScoreSystem();
          sys.initialize();
          sys.currentScore = currentScore;

          const result = sys.checkAndUpdateHighScore();

          const storedAfter = parseInt(mockStorage.getItem('gelpiyo_highScore') ?? '0', 10);
          return (
            result === false &&
            sys.highScore === storedHighScore &&
            storedAfter === storedHighScore
          );
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: アイテムポイント値の正確性
// Feature: gelpiyo-deep-sea-adventure, Property 8: アイテムポイント値の正確性
// Validates: Requirements 10.1, 10.2, 10.3
// ---------------------------------------------------------------------------

describe('Property 8: アイテムポイント値の正確性', () => {
  it('ITEM_CONFIGS の各タイプ（pearl/gold_coin/treasure_jar）のポイント値が正確である', () => {
    const sys = new ScoreSystem();
    const scoringTypes = ['pearl', 'gold_coin', 'treasure_jar'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...scoringTypes),
        (itemType) => {
          const expectedPoints = ITEM_CONFIGS[itemType].points;
          const result = sys.applyComboMultiplier(1, expectedPoints);
          return result === expectedPoints;
        }
      )
    );
  });

  it('pearl は 10 ポイントである（Req 10.1）', () => {
    const sys = new ScoreSystem();
    expect(sys.applyComboMultiplier(1, ITEM_CONFIGS['pearl'].points)).toBe(10);
  });

  it('gold_coin は 25 ポイントである', () => {
    const sys = new ScoreSystem();
    expect(sys.applyComboMultiplier(1, ITEM_CONFIGS['gold_coin'].points)).toBe(25);
  });

  it('treasure_jar は 30 ポイントである', () => {
    const sys = new ScoreSystem();
    expect(sys.applyComboMultiplier(1, ITEM_CONFIGS['treasure_jar'].points)).toBe(30);
  });
});

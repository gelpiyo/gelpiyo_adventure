/**
 * combo.test.ts — ComboSystem のユニットテスト & プロパティベーステスト
 *
 * Feature: gelpiyo-deep-sea-adventure
 * Property 12: コンボ乗数の単調性と正確性
 *
 * Validates: Requirements 17.1, 17.2, 17.3, 17.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ComboSystem } from '../systems/ComboSystem';

// ---------------------------------------------------------------------------
// ユニットテスト（例示ベース）
// ---------------------------------------------------------------------------

describe('ComboSystem — ユニットテスト', () => {
  let combo: ComboSystem;

  beforeEach(() => {
    combo = new ComboSystem();
  });

  it('初期状態: count=0, multiplier=1', () => {
    expect(combo.count).toBe(0);
    expect(combo.multiplier).toBe(1);
  });

  it('アイテム取得 1 回: count=1, multiplier=1', () => {
    combo.onItemCollected();
    expect(combo.count).toBe(1);
    expect(combo.multiplier).toBe(1);
  });

  it('アイテム取得 2 回: count=2, multiplier=1', () => {
    combo.onItemCollected();
    combo.onItemCollected();
    expect(combo.count).toBe(2);
    expect(combo.multiplier).toBe(1);
  });

  it('アイテム取得 3 回: count=3, multiplier=2 (Req 17.2)', () => {
    for (let i = 0; i < 3; i++) combo.onItemCollected();
    expect(combo.count).toBe(3);
    expect(combo.multiplier).toBe(2);
  });

  it('アイテム取得 4 回: count=4, multiplier=2', () => {
    for (let i = 0; i < 4; i++) combo.onItemCollected();
    expect(combo.count).toBe(4);
    expect(combo.multiplier).toBe(2);
  });

  it('アイテム取得 5 回: count=5, multiplier=3 (Req 17.3)', () => {
    for (let i = 0; i < 5; i++) combo.onItemCollected();
    expect(combo.count).toBe(5);
    expect(combo.multiplier).toBe(3);
  });

  it('アイテム取得 10 回: count=10, multiplier=3', () => {
    for (let i = 0; i < 10; i++) combo.onItemCollected();
    expect(combo.count).toBe(10);
    expect(combo.multiplier).toBe(3);
  });

  it('障害物通過でリセット: count=0, multiplier=1 (Req 17.5)', () => {
    for (let i = 0; i < 5; i++) combo.onItemCollected();
    combo.onObstaclePassed();
    expect(combo.count).toBe(0);
    expect(combo.multiplier).toBe(1);
  });

  it('reset() でリセット', () => {
    for (let i = 0; i < 7; i++) combo.onItemCollected();
    combo.reset();
    expect(combo.count).toBe(0);
    expect(combo.multiplier).toBe(1);
  });

  it('リセット後に再度コンボ積み上げが可能', () => {
    for (let i = 0; i < 5; i++) combo.onItemCollected();
    combo.onObstaclePassed();
    for (let i = 0; i < 3; i++) combo.onItemCollected();
    expect(combo.count).toBe(3);
    expect(combo.multiplier).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// プロパティベーステスト (fast-check)
// ---------------------------------------------------------------------------
// Feature: gelpiyo-deep-sea-adventure, Property 12: コンボ乗数の単調性と正確性
// Validates: Requirements 17.1, 17.2, 17.3, 17.5

describe('ComboSystem — プロパティベーステスト (Property 12)', () => {
  /**
   * **Validates: Requirements 17.1, 17.2, 17.3**
   *
   * 任意の非負整数コンボカウントに対して、
   * getMultiplier() が正しい乗数を返すこと。
   */
  it('Property 12a: getMultiplier() は count に基づいて正しい乗数を返す', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000 }), (n) => {
        const combo = new ComboSystem();
        // n 回 onItemCollected を呼ぶ
        for (let i = 0; i < n; i++) combo.onItemCollected();

        const expected = n >= 5 ? 3 : n >= 3 ? 2 : 1;
        expect(combo.getMultiplier()).toBe(expected);
        expect(combo.multiplier).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 17.5**
   *
   * 任意のコンボカウント後に onObstaclePassed() を呼ぶと、
   * count は必ず 0 になること（以前のカウントに依存しない）。
   */
  it('Property 12b: onObstaclePassed() 後は count が必ず 0', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1000 }), (n) => {
        const combo = new ComboSystem();
        for (let i = 0; i < n; i++) combo.onItemCollected();
        combo.onObstaclePassed();
        expect(combo.count).toBe(0);
        expect(combo.multiplier).toBe(1);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements 17.1, 17.2, 17.3**
   *
   * onItemCollected() は毎回 count を 1 ずつ増加させ、
   * multiplier フィールドは getMultiplier() の戻り値と常に一致すること。
   */
  it('Property 12c: multiplier は常に getMultiplier() と一致する', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 50 }),
        (actions) => {
          // true = onItemCollected, false = onObstaclePassed
          const combo = new ComboSystem();
          for (const isCollect of actions) {
            if (isCollect) {
              combo.onItemCollected();
            } else {
              combo.onObstaclePassed();
            }
            // multiplier フィールドは常に getMultiplier() と一致すること
            expect(combo.multiplier).toBe(combo.getMultiplier());
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// Feature: gelpiyo-deep-sea-adventure, Property 13: パララックス速度の相対的順序不変条件

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PARALLAX } from '../config';

/**
 * Property 13: パララックス速度の相対的順序不変条件
 *
 * BackgroundRenderer は Phaser に依存するため直接テストできない。
 * 代わりに PARALLAX 設定定数（config.ts）を使ってスクロール係数と
 * オフセット量の順序不変条件を検証する。
 *
 * Validates: Requirements 6.2, 6.3
 */
describe('BackgroundRenderer - パララックス速度の相対的順序不変条件', () => {
  // ----------------------------------------------------------------
  // 例示ベーステスト: PARALLAX 定数の順序確認
  // ----------------------------------------------------------------
  it('PARALLAX スクロール係数の順序が far < mid < near であること', () => {
    expect(PARALLAX.FAR_SCROLL_FACTOR).toBeLessThan(PARALLAX.MID_SCROLL_FACTOR);
    expect(PARALLAX.MID_SCROLL_FACTOR).toBeLessThan(PARALLAX.NEAR_SCROLL_FACTOR);
  });

  it('PARALLAX スクロール係数が 0.0 ～ 1.0 の範囲内であること', () => {
    expect(PARALLAX.FAR_SCROLL_FACTOR).toBeGreaterThan(0);
    expect(PARALLAX.FAR_SCROLL_FACTOR).toBeLessThanOrEqual(1);

    expect(PARALLAX.MID_SCROLL_FACTOR).toBeGreaterThan(0);
    expect(PARALLAX.MID_SCROLL_FACTOR).toBeLessThanOrEqual(1);

    expect(PARALLAX.NEAR_SCROLL_FACTOR).toBeGreaterThan(0);
    expect(PARALLAX.NEAR_SCROLL_FACTOR).toBeLessThanOrEqual(1);
  });

  it('PARALLAX 係数の具体値が設計通りであること (far=0.2, mid=0.5, near=0.8)', () => {
    expect(PARALLAX.FAR_SCROLL_FACTOR).toBe(0.2);
    expect(PARALLAX.MID_SCROLL_FACTOR).toBe(0.5);
    expect(PARALLAX.NEAR_SCROLL_FACTOR).toBe(0.8);
  });

  // ----------------------------------------------------------------
  // プロパティベーステスト: 任意のスクロール速度と delta に対して
  // far < mid < near の順序不変条件が成立すること
  // ----------------------------------------------------------------
  it('[PBT] 任意の speed と delta に対して far オフセット < mid オフセット < near オフセットが成立すること', () => {
    // Validates: Requirements 6.2, 6.3
    fc.assert(
      fc.property(
        // スクロール速度: 正の値（px/s）
        fc.float({ min: Math.fround(0.001), max: Math.fround(10_000), noNaN: true }),
        // デルタ時間: 正の値（ms を秒換算、1フレーム相当の範囲）
        fc.float({ min: Math.fround(0.001), max: Math.fround(1.0), noNaN: true }),
        (speed, delta) => {
          const farOffset = speed * PARALLAX.FAR_SCROLL_FACTOR * delta;
          const midOffset = speed * PARALLAX.MID_SCROLL_FACTOR * delta;
          const nearOffset = speed * PARALLAX.NEAR_SCROLL_FACTOR * delta;

          return farOffset < midOffset && midOffset < nearOffset;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('[PBT] 任意の speed と delta に対して far/mid/near のオフセット比が係数比と一致すること', () => {
    // Validates: Requirements 6.2, 6.3
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(1), max: Math.fround(10_000), noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(1.0), noNaN: true }),
        (speed, delta) => {
          const farOffset = speed * PARALLAX.FAR_SCROLL_FACTOR * delta;
          const midOffset = speed * PARALLAX.MID_SCROLL_FACTOR * delta;
          const nearOffset = speed * PARALLAX.NEAR_SCROLL_FACTOR * delta;

          // 比率が係数の比率と一致する（浮動小数点誤差を考慮）
          const epsilon = 1e-9;
          const farMidRatio = farOffset / midOffset;
          const expectedFarMidRatio = PARALLAX.FAR_SCROLL_FACTOR / PARALLAX.MID_SCROLL_FACTOR;
          const midNearRatio = midOffset / nearOffset;
          const expectedMidNearRatio = PARALLAX.MID_SCROLL_FACTOR / PARALLAX.NEAR_SCROLL_FACTOR;

          return (
            Math.abs(farMidRatio - expectedFarMidRatio) < epsilon &&
            Math.abs(midNearRatio - expectedMidNearRatio) < epsilon
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

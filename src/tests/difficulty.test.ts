// Feature: gelpiyo-deep-sea-adventure, Property 3: スクロール速度のステップ関数と上限不変条件

/**
 * DifficultyManager プロパティテスト
 *
 * Property 3: スクロール速度のステップ関数と上限不変条件
 *   - 任意の経過時間 T について、スクロール速度は
 *     initialSpeed + floor(T / 10000) * increment に等しい（上限前）
 *   - スクロール速度は maxSpeed (initialSpeed × 3 = 600 px/s) を超えない
 *   - ギャップサイズは 150px を下回らない
 *
 * Validates: Requirements 4.2, 4.4, 4.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DifficultyManager } from '../systems/DifficultyManager';
import { SCROLL, DIFFICULTY } from '../config';

// 定数のショートカット
const INITIAL_SPEED = SCROLL.INITIAL_SPEED;           // 200 px/s
const MAX_SPEED = INITIAL_SPEED * SCROLL.MAX_SPEED_MULTIPLIER; // 600 px/s
const INCREMENT = INITIAL_SPEED * DIFFICULTY.SPEED_INCREASE_RATE; // 10 px/s per step
const SPEED_INTERVAL = DIFFICULTY.SPEED_INCREASE_INTERVAL_MS;   // 10_000 ms
const GAP_MIN = DIFFICULTY.GAP_MIN_SIZE_PX;           // 150 px

// ---------------------------------------------------------------------------
// ヘルパー: 合計 elapsed を 1 回の update() で到達させる
// (delta を分割せずに一括適用すると内部ステップ計算が正確になる)
// ---------------------------------------------------------------------------
function buildManagerAtTime(elapsedMs: number): DifficultyManager {
  const dm = new DifficultyManager();
  dm.update(elapsedMs);
  return dm;
}

// ---------------------------------------------------------------------------
// Property 3-A: スクロール速度が maxSpeed を超えない（上限不変条件）
// Validates: Requirements 4.5
// ---------------------------------------------------------------------------
describe('Property 3-A: スクロール速度の上限不変条件', () => {
  it('任意の経過時間で scrollSpeed は maxSpeed (600) を超えない', () => {
    fc.assert(
      fc.property(
        // 0 ms 〜 1,200,000 ms (20分相当) の任意の経過時間
        fc.integer({ min: 0, max: 1_200_000 }),
        (elapsedMs) => {
          const dm = buildManagerAtTime(elapsedMs);
          expect(dm.state.scrollSpeed).toBeLessThanOrEqual(MAX_SPEED);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3-B: スクロール速度のステップ関数が正しい
// Validates: Requirements 4.2
// ---------------------------------------------------------------------------
describe('Property 3-B: スクロール速度のステップ関数の正確性', () => {
  it('scrollSpeed は initialSpeed + floor(T/10000) * increment に等しい（上限に達するまで）', () => {
    fc.assert(
      fc.property(
        // 上限到達前の時間帯に絞る: maxSteps まで
        // maxSteps = floor((MAX_SPEED - INITIAL_SPEED) / INCREMENT) = floor(400/10) = 40
        // 40 ステップ × 10_000ms = 400_000ms が上限到達時点
        // それより前の範囲で検証する
        fc.integer({ min: 0, max: 390_000 }),
        (elapsedMs) => {
          const dm = buildManagerAtTime(elapsedMs);
          const steps = Math.floor(elapsedMs / SPEED_INTERVAL);
          const expected = Math.min(INITIAL_SPEED + steps * INCREMENT, MAX_SPEED);
          expect(dm.state.scrollSpeed).toBeCloseTo(expected, 6);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('上限到達後は scrollSpeed がちょうど maxSpeed に固定される', () => {
    fc.assert(
      fc.property(
        // 400_000ms 以降の任意の時間
        fc.integer({ min: 400_000, max: 1_200_000 }),
        (elapsedMs) => {
          const dm = buildManagerAtTime(elapsedMs);
          expect(dm.state.scrollSpeed).toBe(MAX_SPEED);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3-C: ギャップサイズが 120px を下回らない
// Validates: Requirements 4.4
// ---------------------------------------------------------------------------
describe('Property 3-C: ギャップサイズの下限不変条件', () => {
  it('任意の経過時間で gapSize は 120px を下回らない', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_200_000 }),
        (elapsedMs) => {
          const dm = buildManagerAtTime(elapsedMs);
          expect(dm.state.gapSize).toBeGreaterThanOrEqual(GAP_MIN);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// 具体例テスト（ステップ境界の検証）
// ---------------------------------------------------------------------------
describe('ステップ境界の具体例テスト', () => {
  it('t=0ms: 初期速度 200 px/s、ギャップ 200px', () => {
    const dm = buildManagerAtTime(0);
    expect(dm.state.scrollSpeed).toBe(200);
    expect(dm.state.gapSize).toBe(200);
  });

  it('t=9999ms: まだステップが進まないので 200 px/s', () => {
    const dm = buildManagerAtTime(9999);
    expect(dm.state.scrollSpeed).toBe(200);
  });

  it('t=10000ms: 1 ステップ目 → 200 + 10 = 210 px/s', () => {
    const dm = buildManagerAtTime(10_000);
    expect(dm.state.scrollSpeed).toBe(210);
  });

  it('t=20000ms: 2 ステップ目 → 200 + 20 = 220 px/s', () => {
    const dm = buildManagerAtTime(20_000);
    expect(dm.state.scrollSpeed).toBe(220);
  });

  it('t=400000ms: 40 ステップ → cap で 600 px/s', () => {
    const dm = buildManagerAtTime(400_000);
    expect(dm.state.scrollSpeed).toBe(600);
  });

  it('t=19999ms: ギャップはまだ縮小されていない（20秒前）', () => {
    const dm = buildManagerAtTime(19_999);
    expect(dm.state.gapSize).toBe(200);
  });

  it('t=20000ms: 1回ギャップ縮小 → 200 - 10 = 190px', () => {
    const dm = buildManagerAtTime(20_000);
    expect(dm.state.gapSize).toBe(190);
  });

  it('ギャップが下限 120px で止まる（大きな経過時間でも）', () => {
    const dm = buildManagerAtTime(1_000_000);
    expect(dm.state.gapSize).toBeGreaterThanOrEqual(120);
  });
});

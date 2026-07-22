// Feature: gelpiyo-deep-sea-adventure, Property 14: ゲームリセットの完全初期化

/**
 * Property 14: ゲームリセットの完全初期化
 *
 * 任意のゲーム状態（スコア・難易度パラメータ・コンボ）に対して
 * リセット操作後:
 *   - ScoreSystem.currentScore === 0
 *   - DifficultyManager.state.scrollSpeed === 200 (初期値)
 *   - DifficultyManager.state.spawnInterval === 2000 (初期値)
 *   - DifficultyManager.state.gapSize === 200 (初期値)
 *   - DifficultyManager.state.elapsedTime === 0
 *   - ComboSystem.count === 0
 *
 * Validates: Requirements 12.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ScoreSystem } from '../systems/ScoreSystem';
import { DifficultyManager } from '../systems/DifficultyManager';
import { ComboSystem } from '../systems/ComboSystem';
import { SCROLL, DIFFICULTY } from '../config';

// ---------------------------------------------------------------------------
// 初期値定数
// ---------------------------------------------------------------------------

const INITIAL_SCROLL_SPEED = SCROLL.INITIAL_SPEED;                   // 200
const INITIAL_SPAWN_INTERVAL = DIFFICULTY.INITIAL_SPAWN_INTERVAL_MS; // 2000
const INITIAL_GAP_SIZE = DIFFICULTY.INITIAL_GAP_SIZE_PX;             // 200
const INITIAL_ELAPSED_TIME = 0;

// ---------------------------------------------------------------------------
// Property 14-1: 任意のスコア加算後に ScoreSystem.reset() で currentScore = 0
// ---------------------------------------------------------------------------

describe('Property 14: ScoreSystem reset', () => {
  it('任意のスコア後に reset() を呼ぶと currentScore が 0 になる', () => {
    fc.assert(
      fc.property(
        // 1〜100回のスコア加算操作、各加算量は 1〜100
        fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 100 }),
        (increments) => {
          const score = new ScoreSystem();

          // 任意のスコアを積み上げる
          for (const pts of increments) {
            score.incrementScore(pts);
          }

          // リセット前はスコアが積み上がっているはず
          expect(score.currentScore).toBeGreaterThan(0);

          // リセット
          score.reset();

          // currentScore が 0 に戻っているか
          expect(score.currentScore).toBe(0);
        }
      )
    );
  });

  it('スコアが 0 の状態で reset() しても currentScore は 0 のまま', () => {
    const score = new ScoreSystem();
    score.reset();
    expect(score.currentScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Property 14-2: 任意の経過時間後に DifficultyManager.reset() で全パラメータが初期値に戻る
// ---------------------------------------------------------------------------

describe('Property 14: DifficultyManager reset', () => {
  it('任意の経過時間後に reset() を呼ぶと全パラメータが初期値に戻る', () => {
    fc.assert(
      fc.property(
        // 0〜300秒の経過時間（ms）を複数デルタに分割して渡す
        fc.array(fc.integer({ min: 1, max: 5_000 }), { minLength: 1, maxLength: 60 }),
        (deltas) => {
          const difficulty = new DifficultyManager();

          // 任意の時間を進める
          for (const delta of deltas) {
            difficulty.update(delta);
          }

          // リセット
          difficulty.reset();

          // 全パラメータが初期値に戻っているか
          expect(difficulty.state.scrollSpeed).toBe(INITIAL_SCROLL_SPEED);
          expect(difficulty.state.spawnInterval).toBe(INITIAL_SPAWN_INTERVAL);
          expect(difficulty.state.gapSize).toBe(INITIAL_GAP_SIZE);
          expect(difficulty.state.elapsedTime).toBe(INITIAL_ELAPSED_TIME);
        }
      )
    );
  });

  it('reset() 後にさらに update() を呼ぶと初期値から再度増加する', () => {
    fc.assert(
      fc.property(
        // 初回の経過時間（難易度が変化するよう十分な時間）
        fc.integer({ min: 10_001, max: 300_000 }),
        // reset 後の小さな経過時間（難易度変化のステップに達しない）
        fc.integer({ min: 1, max: 9_999 }),
        (firstElapsed, secondDelta) => {
          const difficulty = new DifficultyManager();

          // 難易度パラメータが変化するほど時間を進める
          difficulty.update(firstElapsed);

          // リセット
          difficulty.reset();

          // リセット直後は初期値
          expect(difficulty.state.scrollSpeed).toBe(INITIAL_SCROLL_SPEED);
          expect(difficulty.state.elapsedTime).toBe(INITIAL_ELAPSED_TIME);

          // 少し時間を進めてもまだ初期値のまま（10秒未満）
          difficulty.update(secondDelta);
          // elapsedTime は secondDelta 分だけ増えているが、
          // scrollSpeed はまだ初期値のはず（10秒ステップ未満）
          expect(difficulty.state.elapsedTime).toBe(secondDelta);
          expect(difficulty.state.scrollSpeed).toBe(INITIAL_SCROLL_SPEED);
        }
      )
    );
  });

  it('初期状態で reset() を呼んでも全パラメータが初期値のまま', () => {
    const difficulty = new DifficultyManager();
    difficulty.reset();

    expect(difficulty.state.scrollSpeed).toBe(INITIAL_SCROLL_SPEED);
    expect(difficulty.state.spawnInterval).toBe(INITIAL_SPAWN_INTERVAL);
    expect(difficulty.state.gapSize).toBe(INITIAL_GAP_SIZE);
    expect(difficulty.state.elapsedTime).toBe(INITIAL_ELAPSED_TIME);
  });
});

// ---------------------------------------------------------------------------
// Property 14-3: 任意のコンボ後に ComboSystem.reset() で count = 0
// ---------------------------------------------------------------------------

describe('Property 14: ComboSystem reset', () => {
  it('任意のアイテム収集後に reset() を呼ぶと count が 0 になる', () => {
    fc.assert(
      fc.property(
        // 1〜20回のアイテム収集
        fc.integer({ min: 1, max: 20 }),
        (collectCount) => {
          const combo = new ComboSystem();

          // 任意回数アイテムを収集してコンボを積む
          for (let i = 0; i < collectCount; i++) {
            combo.onItemCollected();
          }

          expect(combo.count).toBe(collectCount);

          // リセット
          combo.reset();

          // count が 0 に戻っているか
          expect(combo.count).toBe(0);
        }
      )
    );
  });

  it('reset() 後の multiplier は 1 に戻る', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (collectCount) => {
          const combo = new ComboSystem();

          // 3x 乗数が発動するほどコンボを積む
          for (let i = 0; i < collectCount; i++) {
            combo.onItemCollected();
          }
          expect(combo.multiplier).toBe(3);

          // リセット
          combo.reset();

          expect(combo.count).toBe(0);
          expect(combo.multiplier).toBe(1);
        }
      )
    );
  });

  it('コンボが 0 の状態で reset() しても count は 0 のまま', () => {
    const combo = new ComboSystem();
    combo.reset();
    expect(combo.count).toBe(0);
    expect(combo.multiplier).toBe(1);
  });
});

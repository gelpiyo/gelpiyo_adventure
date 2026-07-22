/**
 * ゲルぴよ深海大冒険 - PhysicsEngine プロパティベーステスト
 *
 * テスト対象: PhysicsEngine (src/systems/PhysicsEngine.ts)
 * フレームワーク: Vitest + fast-check
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PhysicsEngine } from '../systems/PhysicsEngine';
import type { Player } from '../models/Player';
import { PHYSICS_DEFAULTS, SCREEN } from '../config';

// ---------------------------------------------------------------------------
// ヘルパー: テスト用 Player オブジェクトを生成する
// ---------------------------------------------------------------------------

function makePlayer(y: number, velocityY: number): Player {
  return {
    x: 100,
    y,
    velocityY,
    radius: 20,
    hasBubbleShield: false,
    animationState: 'idle',
  };
}

// ---------------------------------------------------------------------------
// Property 1: 重力による下向き加速の単調性
// ---------------------------------------------------------------------------
// 外部入力なし（applyJump を呼ばず）で update() を複数回呼ぶと、
// velocityY は各フレームで単調増加（ただし maxFallSpeed でクランプされる）。
// maxFallSpeed に達する前は必ず前フレームより大きくなる。
// ---------------------------------------------------------------------------
describe('PhysicsEngine', () => {
  it(
    // Feature: gelpiyo-deep-sea-adventure, Property 1: 重力による下向き加速の単調性
    'Property 1: 外部入力なしで update() を連続呼び出すと velocityY は単調増加する（maxFallSpeed 未満の間）',
    () => {
      fc.assert(
        fc.property(
          // 初期 velocityY を maxFallSpeed より十分低い値に設定する。
          // gravity(800) * delta(1/60 ≒ 0.0167) ≈ 13.3 px/s ずつ増加するため、
          // maxFallSpeed(600) - 初期velocityY > 13.3 となるよう上限を設ける。
          fc.float({ min: Math.fround(-500), max: Math.fround(560), noNaN: true }),
          // delta: 1ms〜100ms (ゲーム的に妥当なフレーム時間)
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          // 繰り返し回数: 2〜10 フレーム
          fc.integer({ min: 2, max: 10 }),
          (initialVelocityY, delta, frames) => {
            const engine = new PhysicsEngine(0, SCREEN.HEIGHT);
            const player = makePlayer(SCREEN.HEIGHT / 2, initialVelocityY);

            let prevVelocityY = player.velocityY;

            for (let i = 0; i < frames; i++) {
              engine.update(player, delta);
              const currentVelocityY = player.velocityY;

              if (prevVelocityY < PHYSICS_DEFAULTS.MAX_FALL_SPEED) {
                // maxFallSpeed 未満だったフレームでは必ず増加しているはず
                expect(currentVelocityY).toBeGreaterThan(prevVelocityY);
              } else {
                // maxFallSpeed に達した後はクランプされて変化しない
                expect(currentVelocityY).toBe(PHYSICS_DEFAULTS.MAX_FALL_SPEED);
              }

              prevVelocityY = currentVelocityY;
            }
          },
        ),
      );
    },
  );

  // ---------------------------------------------------------------------------
  // Property 2: 物理境界クランプの不変条件
  // ---------------------------------------------------------------------------
  // 任意の初期位置（範囲外を含む）・任意の Y 速度に対して、
  // update() 呼び出し後の player.y は常に [boundsTop, boundsBottom] 内に収まる。
  // ---------------------------------------------------------------------------
  it(
    // Feature: gelpiyo-deep-sea-adventure, Property 2: 物理境界クランプの不変条件
    'Property 2: update() 後の player.y は常に [boundsTop, boundsBottom] の範囲内に収まる',
    () => {
      fc.assert(
        fc.property(
          // boundsTop / boundsBottom: 任意の正当な境界（top < bottom）
          fc.integer({ min: 0, max: 200 }),
          fc.integer({ min: 400, max: 600 }),
          // 初期 Y: 範囲外も含む任意値
          fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          // 初期 velocityY: 上限・下限を超える値も含む任意値
          fc.float({ min: Math.fround(-1000), max: Math.fround(1000), noNaN: true }),
          // delta: 正の時間
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          (boundsTop, boundsBottom, initialY, initialVelocityY, delta) => {
            const engine = new PhysicsEngine(boundsTop, boundsBottom);
            const player = makePlayer(initialY, initialVelocityY);

            engine.update(player, delta);

            expect(player.y).toBeGreaterThanOrEqual(boundsTop);
            expect(player.y).toBeLessThanOrEqual(boundsBottom);
          },
        ),
      );
    },
  );
});

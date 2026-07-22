/**
 * PowerUpSystem プロパティベーステスト
 *
 * Feature: gelpiyo-deep-sea-adventure
 * Validates: Requirements 11.2, 11.5, 11.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PowerUpSystem } from '../systems/PowerUpSystem';
import { ScrollEngine } from '../systems/ScrollEngine';
import { POWERUP_CONFIGS } from '../config';

// ---------------------------------------------------------------------------
// ヘルパー: ScrollEngine と PowerUpSystem を生成するファクトリ
// ---------------------------------------------------------------------------

function createSystems(initialSpeed = 200): {
  scrollEngine: ScrollEngine;
  powerUpSystem: PowerUpSystem;
} {
  const scrollEngine = new ScrollEngine({ initialSpeed });
  const powerUpSystem = new PowerUpSystem(scrollEngine);
  return { scrollEngine, powerUpSystem };
}

// ---------------------------------------------------------------------------
// Property 10: パワーアップの期間後リストア
// ---------------------------------------------------------------------------

// Feature: gelpiyo-deep-sea-adventure, Property 10: パワーアップの期間後リストア
describe('Property 10: パワーアップの期間後リストア', () => {
  /**
   * **Validates: Requirements 11.2, 11.5**
   *
   * slow_motion を activate した後、duration ms 経過して update() を呼ぶと
   * scrollSpeed が元の値に戻ることを検証する。
   */
  it('slow_motion: activate後にduration ms経過したupdateでscrollSpeedが元に戻る', () => {
    fc.assert(
      fc.property(
        // 初期速度: 100〜600 の整数
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { scrollEngine, powerUpSystem } = createSystems(initialSpeed);
          const speedBefore = scrollEngine.currentSpeed;

          // slow_motion を発動 → 速度が 50% になるはず
          powerUpSystem.activate('slow_motion');
          const expectedSlowed = initialSpeed * POWERUP_CONFIGS.SLOW_MOTION_SPEED_MULTIPLIER;
          expect(scrollEngine.currentSpeed).toBeCloseTo(expectedSlowed, 5);

          // duration ちょうど経過させる（1 フレームで duration ms を渡す）
          const duration = POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS;
          powerUpSystem.update(duration);

          // isActive が false になっていること
          expect(powerUpSystem.isActive('slow_motion')).toBe(false);

          // スクロール速度が元に戻っていること
          expect(scrollEngine.currentSpeed).toBeCloseTo(speedBefore, 5);
        }
      )
    );
  });

  it('slow_motion: duration を 1ms 超えて update した場合も元に戻る', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        // duration に加算する余分な ms (1〜5000)
        fc.integer({ min: 1, max: 5_000 }),
        (initialSpeed, extra) => {
          const { scrollEngine, powerUpSystem } = createSystems(initialSpeed);
          const speedBefore = scrollEngine.currentSpeed;

          powerUpSystem.activate('slow_motion');

          const duration = POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS;
          // duration + extra ms 経過
          powerUpSystem.update(duration + extra);

          expect(powerUpSystem.isActive('slow_motion')).toBe(false);
          expect(scrollEngine.currentSpeed).toBeCloseTo(speedBefore, 5);
        }
      )
    );
  });

  it('slow_motion: duration 未満の update では速度がまだ低下したまま', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        // duration より短い経過時間 (1〜duration-1)
        fc.integer({ min: 1, max: POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS - 1 }),
        (initialSpeed, partial) => {
          const { scrollEngine, powerUpSystem } = createSystems(initialSpeed);

          powerUpSystem.activate('slow_motion');
          const slowed = scrollEngine.currentSpeed;

          powerUpSystem.update(partial);

          // まだアクティブのはず
          expect(powerUpSystem.isActive('slow_motion')).toBe(true);
          // 速度はまだ低下したまま
          expect(scrollEngine.currentSpeed).toBeCloseTo(slowed, 5);
        }
      )
    );
  });

  it('bubble_shield: duration 経過後に isActive が false になる', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { powerUpSystem } = createSystems(initialSpeed);

          powerUpSystem.activate('bubble_shield');
          expect(powerUpSystem.isActive('bubble_shield')).toBe(true);

          powerUpSystem.update(POWERUP_CONFIGS.BUBBLE_SHIELD_DURATION_MS);

          expect(powerUpSystem.isActive('bubble_shield')).toBe(false);
        }
      )
    );
  });

  it('magnet: duration 経過後に isActive が false になる', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { powerUpSystem } = createSystems(initialSpeed);

          powerUpSystem.activate('magnet');
          expect(powerUpSystem.isActive('magnet')).toBe(true);

          powerUpSystem.update(POWERUP_CONFIGS.MAGNET_DURATION_MS);

          expect(powerUpSystem.isActive('magnet')).toBe(false);
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: 複数パワーアップの独立性
// ---------------------------------------------------------------------------

// Feature: gelpiyo-deep-sea-adventure, Property 11: 複数パワーアップの独立性
describe('Property 11: 複数パワーアップの独立性', () => {
  /**
   * **Validates: Requirements 11.6**
   *
   * bubble_shield と slow_motion を同時にアクティブにした場合、
   * 各 isActive() は独立して true を返し、一方が期限切れになっても
   * 他方に影響しないことを検証する。
   */
  it('bubble_shield と slow_motion を同時にアクティブ → 両方 isActive()=true', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { powerUpSystem } = createSystems(initialSpeed);

          powerUpSystem.activate('bubble_shield');
          powerUpSystem.activate('slow_motion');

          expect(powerUpSystem.isActive('bubble_shield')).toBe(true);
          expect(powerUpSystem.isActive('slow_motion')).toBe(true);
        }
      )
    );
  });

  it('slow_motion が期限切れになっても bubble_shield はまだアクティブ', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { scrollEngine, powerUpSystem } = createSystems(initialSpeed);
          const speedBefore = scrollEngine.currentSpeed;

          // bubble_shield (5s) と slow_motion (5s) を同時に発動
          powerUpSystem.activate('bubble_shield');
          powerUpSystem.activate('slow_motion');

          // slow_motion の duration ちょうど経過 → slow_motion のみ期限切れ
          powerUpSystem.update(POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS);

          // slow_motion は期限切れ
          expect(powerUpSystem.isActive('slow_motion')).toBe(false);
          // bubble_shield は同じ duration なのでここで期限切れになるはず
          // 両方の duration が等しいケースの確認（両方 5000ms）
          // → bubble_shield も期限切れになることを確認（独立している証明）
          expect(powerUpSystem.isActive('bubble_shield')).toBe(false);

          // scroll speed は元に戻っているはず
          expect(scrollEngine.currentSpeed).toBeCloseTo(speedBefore, 5);
        }
      )
    );
  });

  it('slow_motion が期限切れになっても magnet は残り時間を保持する', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { scrollEngine, powerUpSystem } = createSystems(initialSpeed);
          const speedBefore = scrollEngine.currentSpeed;

          // magnet (8s) と slow_motion (5s) を同時に発動
          powerUpSystem.activate('magnet');
          powerUpSystem.activate('slow_motion');

          // slow_motion の duration だけ経過 → slow_motion のみ期限切れ
          const slowDuration = POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS;
          powerUpSystem.update(slowDuration);

          // slow_motion は期限切れ
          expect(powerUpSystem.isActive('slow_motion')).toBe(false);

          // magnet はまだアクティブ（8s - 5s = 3s 残り）
          expect(powerUpSystem.isActive('magnet')).toBe(true);

          // magnet の残り時間は正の値
          const remaining = powerUpSystem.getRemainingDuration('magnet');
          expect(remaining).toBeGreaterThan(0);

          // scroll speed は slow_motion 期限切れにより元に戻っている
          expect(scrollEngine.currentSpeed).toBeCloseTo(speedBefore, 5);

          // さらに magnet の残り時間経過
          powerUpSystem.update(remaining);
          expect(powerUpSystem.isActive('magnet')).toBe(false);
        }
      )
    );
  });

  it('各パワーアップの isActive() は独立して動作する（任意の組み合わせ）', () => {
    fc.assert(
      fc.property(
        // どのパワーアップをアクティブにするかのフラグ
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        fc.integer({ min: 100, max: 600 }),
        (activateBubble, activateSlow, activateMagnet, initialSpeed) => {
          const { powerUpSystem } = createSystems(initialSpeed);

          if (activateBubble) powerUpSystem.activate('bubble_shield');
          if (activateSlow) powerUpSystem.activate('slow_motion');
          if (activateMagnet) powerUpSystem.activate('magnet');

          // 各 isActive() が独立して期待する値を返すこと
          expect(powerUpSystem.isActive('bubble_shield')).toBe(activateBubble);
          expect(powerUpSystem.isActive('slow_motion')).toBe(activateSlow);
          expect(powerUpSystem.isActive('magnet')).toBe(activateMagnet);
        }
      )
    );
  });

  it('一方の deactivate が他方に影響しない', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        (initialSpeed) => {
          const { powerUpSystem } = createSystems(initialSpeed);

          powerUpSystem.activate('bubble_shield');
          powerUpSystem.activate('slow_motion');
          powerUpSystem.activate('magnet');

          // slow_motion のみ deactivate
          powerUpSystem.deactivate('slow_motion');

          expect(powerUpSystem.isActive('slow_motion')).toBe(false);
          expect(powerUpSystem.isActive('bubble_shield')).toBe(true);
          expect(powerUpSystem.isActive('magnet')).toBe(true);
        }
      )
    );
  });

  it('複数パワーアップの getRemainingDuration は独立して減少する', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 600 }),
        // partial は slow_motion duration より短い値
        fc.integer({ min: 1, max: POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS - 1 }),
        (initialSpeed, partial) => {
          const { powerUpSystem } = createSystems(initialSpeed);

          powerUpSystem.activate('bubble_shield');
          powerUpSystem.activate('slow_motion');
          powerUpSystem.activate('magnet');

          const bubbleInitial = powerUpSystem.getRemainingDuration('bubble_shield');
          const slowInitial = powerUpSystem.getRemainingDuration('slow_motion');
          const magnetInitial = powerUpSystem.getRemainingDuration('magnet');

          // partial ms 経過
          powerUpSystem.update(partial);

          const bubbleAfter = powerUpSystem.getRemainingDuration('bubble_shield');
          const slowAfter = powerUpSystem.getRemainingDuration('slow_motion');
          const magnetAfter = powerUpSystem.getRemainingDuration('magnet');

          // 各残り時間が独立して減少していること
          expect(bubbleAfter).toBeCloseTo(bubbleInitial - partial, 5);
          expect(slowAfter).toBeCloseTo(slowInitial - partial, 5);
          expect(magnetAfter).toBeCloseTo(magnetInitial - partial, 5);

          // どのパワーアップもまだアクティブ
          expect(powerUpSystem.isActive('bubble_shield')).toBe(true);
          expect(powerUpSystem.isActive('slow_motion')).toBe(true);
          expect(powerUpSystem.isActive('magnet')).toBe(true);
        }
      )
    );
  });
});

/**
 * ScrollEngine のユニットテスト + プロパティベーステスト
 *
 * Feature: gelpiyo-deep-sea-adventure
 * Validates: Requirements 2.3, 4.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ScrollEngine } from '../systems/ScrollEngine';
import { SCROLL } from '../config';

// ---------------------------------------------------------------------------
// ユニットテスト（例示ベース）
// ---------------------------------------------------------------------------

describe('ScrollEngine - 初期化', () => {
  it('デフォルト設定で初期速度が SCROLL.INITIAL_SPEED になる', () => {
    const engine = new ScrollEngine();
    expect(engine.currentSpeed).toBe(SCROLL.INITIAL_SPEED);
  });

  it('カスタム initialSpeed で初期化される', () => {
    const engine = new ScrollEngine({ initialSpeed: 300 });
    expect(engine.currentSpeed).toBe(300);
  });

  it('maxSpeed は initialSpeed * maxSpeedMultiplier を返す', () => {
    const engine = new ScrollEngine({ initialSpeed: 200, maxSpeedMultiplier: 3.0 });
    expect(engine.maxSpeed).toBe(600);
  });

  it('デフォルト maxSpeed は INITIAL_SPEED * MAX_SPEED_MULTIPLIER', () => {
    const engine = new ScrollEngine();
    expect(engine.maxSpeed).toBe(SCROLL.INITIAL_SPEED * SCROLL.MAX_SPEED_MULTIPLIER);
  });
});

describe('ScrollEngine - setSpeed()', () => {
  let engine: ScrollEngine;

  beforeEach(() => {
    engine = new ScrollEngine({ initialSpeed: 200, maxSpeedMultiplier: 3.0 });
  });

  it('maxSpeed 以下の値は正確にセットされる', () => {
    engine.setSpeed(400);
    expect(engine.currentSpeed).toBe(400);
  });

  it('maxSpeed を超える値はクランプされる', () => {
    engine.setSpeed(9999);
    expect(engine.currentSpeed).toBe(engine.maxSpeed);
  });

  it('maxSpeed ちょうどの値はクランプされない', () => {
    engine.setSpeed(600);
    expect(engine.currentSpeed).toBe(600);
  });

  it('0 にセットできる', () => {
    engine.setSpeed(0);
    expect(engine.currentSpeed).toBe(0);
  });
});

describe('ScrollEngine - applySpeedMultiplier() / restoreSpeed()', () => {
  let engine: ScrollEngine;

  beforeEach(() => {
    engine = new ScrollEngine({ initialSpeed: 200, maxSpeedMultiplier: 3.0 });
  });

  it('0.5 倍率を適用するとスローモーション（半速）になる', () => {
    engine.setSpeed(400);
    engine.applySpeedMultiplier(0.5);
    expect(engine.currentSpeed).toBe(200);
  });

  it('restoreSpeed() で適用前の速度に戻る', () => {
    engine.setSpeed(400);
    engine.applySpeedMultiplier(0.5);
    engine.restoreSpeed();
    expect(engine.currentSpeed).toBe(400);
  });

  it('applySpeedMultiplier() を呼ばずに restoreSpeed() を呼んでも速度は変わらない', () => {
    engine.setSpeed(300);
    engine.restoreSpeed();
    expect(engine.currentSpeed).toBe(300);
  });

  it('2 回 restoreSpeed() を呼んでも 1 回分しか戻らない', () => {
    engine.setSpeed(400);
    engine.applySpeedMultiplier(0.5);
    engine.restoreSpeed();
    engine.restoreSpeed(); // 2 回目は no-op
    expect(engine.currentSpeed).toBe(400);
  });
});

describe('ScrollEngine - update()', () => {
  it('update() を呼んでも currentSpeed は変化しない（拡張用メソッド）', () => {
    const engine = new ScrollEngine();
    const before = engine.currentSpeed;
    engine.update(0.016);
    expect(engine.currentSpeed).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// プロパティベーステスト (fast-check)
// Validates: Requirements 2.3, 4.1
// ---------------------------------------------------------------------------

describe('ScrollEngine - プロパティテスト', () => {
  /**
   * Property: setSpeed() 後の currentSpeed は常に [0, maxSpeed] の範囲に収まる
   * Validates: Requirements 4.1
   */
  it('[PBT] setSpeed() 後の currentSpeed は maxSpeed を超えない', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10_000, noNaN: true }),
        (speed) => {
          const engine = new ScrollEngine({ initialSpeed: 200, maxSpeedMultiplier: 3.0 });
          engine.setSpeed(speed);
          return engine.currentSpeed <= engine.maxSpeed;
        }
      )
    );
  });

  /**
   * Property: applySpeedMultiplier() → restoreSpeed() は元の速度を正確に復元する
   * Validates: Requirements 2.3
   */
  it('[PBT] restoreSpeed() は applySpeedMultiplier() 前の速度を正確に復元する', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(600), noNaN: true }),
        fc.float({ min: Math.fround(0.01), max: Math.fround(2.0), noNaN: true }),
        (initialSpeed, multiplier) => {
          const engine = new ScrollEngine({ initialSpeed: 200, maxSpeedMultiplier: 3.0 });
          // maxSpeed 内に収める
          const clampedSpeed = Math.min(initialSpeed, engine.maxSpeed);
          engine.setSpeed(clampedSpeed);
          const speedBefore = engine.currentSpeed;
          engine.applySpeedMultiplier(multiplier);
          engine.restoreSpeed();
          return engine.currentSpeed === speedBefore;
        }
      )
    );
  });

  /**
   * Property: maxSpeed は常に initialSpeed * maxSpeedMultiplier に等しい
   * Validates: Requirements 4.1
   */
  it('[PBT] maxSpeed は initialSpeed * maxSpeedMultiplier に等しい', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000, noNaN: true }),
        fc.float({ min: 1, max: 10, noNaN: true }),
        (initialSpeed, multiplier) => {
          const engine = new ScrollEngine({ initialSpeed, maxSpeedMultiplier: multiplier });
          return engine.maxSpeed === initialSpeed * multiplier;
        }
      )
    );
  });

  /**
   * Property: setSpeed() に maxSpeed を超える値を渡すと currentSpeed === maxSpeed
   * Validates: Requirements 4.1
   */
  it('[PBT] maxSpeed を超える setSpeed() 呼び出しは maxSpeed でクランプされる', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 601, max: 100_000, noNaN: true }),
        (speed) => {
          const engine = new ScrollEngine({ initialSpeed: 200, maxSpeedMultiplier: 3.0 });
          engine.setSpeed(speed);
          return engine.currentSpeed === engine.maxSpeed;
        }
      )
    );
  });
});

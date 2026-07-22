/**
 * PhysicsEngine キャラクター別物理パラメータのプロパティテスト
 *
 * Feature: gelpiyo-deep-sea-adventure, Property 16: キャラクター別物理パラメータの一致性
 *
 * Property 16: キャラクター別物理パラメータの一致性
 *   For any CharacterType に対して、loadCharacterPhysics(CHARACTER_CONFIGS[type]) を呼び出した後、
 *   PhysicsEngine が使用する jumpImpulse と gravity（および maxFallSpeed・maxRiseSpeed）は
 *   CHARACTER_CONFIGS[type].physics の値と正確に一致しなければならない。
 *   また、applyJump() が Player に付与するインパルス値も同じ jumpImpulse でなければならない。
 *
 * Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PhysicsEngine } from '../systems/PhysicsEngine';
import { CHARACTER_CONFIGS } from '../config';
import type { CharacterType } from '../config';
import type { Player } from '../models/Player';

// ---------------------------------------------------------------------------
// テストヘルパー: デフォルトのプレイヤー状態を生成
// ---------------------------------------------------------------------------

function createPlayer(y = 300, velocityY = 0): Player {
  return {
    x: 100,
    y,
    velocityY,
    radius: 20,
    hasBubbleShield: false,
    animationState: 'idle',
  };
}

// すべての CharacterType の配列
const ALL_CHARACTER_TYPES: CharacterType[] = ['gelpiyo', 'momopliyo', 'palpiyo', 'midoripiyo'];

// ---------------------------------------------------------------------------
// ユニットテスト: 各キャラクターの物理パラメータが正確に設定されるか検証
// ---------------------------------------------------------------------------

describe('PhysicsEngine.loadCharacterPhysics — 各キャラクターの物理パラメータ', () => {
  for (const type of ALL_CHARACTER_TYPES) {
    const config = CHARACTER_CONFIGS[type];

    it(`${config.nameJa}（${type}）: getConfig() が CHARACTER_CONFIGS[type].physics と一致する`, () => {
      const engine = new PhysicsEngine();
      engine.loadCharacterPhysics(config);
      const actual = engine.getConfig();

      expect(actual.jumpImpulse).toBe(config.physics.jumpImpulse);
      expect(actual.gravity).toBe(config.physics.gravity);
      expect(actual.maxFallSpeed).toBe(config.physics.maxFallSpeed);
      expect(actual.maxRiseSpeed).toBe(config.physics.maxRiseSpeed);
    });

    it(`${config.nameJa}（${type}）: applyJump() が jumpImpulse を velocityY に設定する`, () => {
      const engine = new PhysicsEngine();
      engine.loadCharacterPhysics(config);
      const player = createPlayer();
      engine.applyJump(player);

      expect(player.velocityY).toBe(config.physics.jumpImpulse);
    });
  }
});

// ---------------------------------------------------------------------------
// ユニットテスト: ゲルぴよの具体的な物理パラメータ値（Req 22.1）
// ---------------------------------------------------------------------------

describe('gelpiyo の物理パラメータ（Req 22.1）', () => {
  it('jumpImpulse=-400, gravity=800, maxFallSpeed=600, maxRiseSpeed=-500', () => {
    const engine = new PhysicsEngine();
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.gelpiyo);
    const cfg = engine.getConfig();

    expect(cfg.jumpImpulse).toBe(-400);
    expect(cfg.gravity).toBe(800);
    expect(cfg.maxFallSpeed).toBe(600);
    expect(cfg.maxRiseSpeed).toBe(-500);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: ももぴよの具体的な物理パラメータ値（Req 22.2）
// ---------------------------------------------------------------------------

describe('momopliyo の物理パラメータ（Req 22.2）', () => {
  it('jumpImpulse=-450, gravity=850, maxFallSpeed=650, maxRiseSpeed=-550', () => {
    const engine = new PhysicsEngine();
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.momopliyo);
    const cfg = engine.getConfig();

    expect(cfg.jumpImpulse).toBe(-450);
    expect(cfg.gravity).toBe(850);
    expect(cfg.maxFallSpeed).toBe(650);
    expect(cfg.maxRiseSpeed).toBe(-550);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: パルぴよの具体的な物理パラメータ値（Req 22.3）
// ---------------------------------------------------------------------------

describe('palpiyo の物理パラメータ（Req 22.3）', () => {
  it('jumpImpulse=-500, gravity=900, maxFallSpeed=700, maxRiseSpeed=-600', () => {
    const engine = new PhysicsEngine();
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.palpiyo);
    const cfg = engine.getConfig();

    expect(cfg.jumpImpulse).toBe(-500);
    expect(cfg.gravity).toBe(900);
    expect(cfg.maxFallSpeed).toBe(700);
    expect(cfg.maxRiseSpeed).toBe(-600);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: みどりぴよの具体的な物理パラメータ値（Req 22.4）
// ---------------------------------------------------------------------------

describe('midoripiyo の物理パラメータ（Req 22.4）', () => {
  it('jumpImpulse=-320, gravity=650, maxFallSpeed=500, maxRiseSpeed=-400', () => {
    const engine = new PhysicsEngine();
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.midoripiyo);
    const cfg = engine.getConfig();

    expect(cfg.jumpImpulse).toBe(-320);
    expect(cfg.gravity).toBe(650);
    expect(cfg.maxFallSpeed).toBe(500);
    expect(cfg.maxRiseSpeed).toBe(-400);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: loadCharacterPhysics は boundsTop / boundsBottom を変更しない（Req 22.5）
// ---------------------------------------------------------------------------

describe('loadCharacterPhysics は境界パラメータを変更しない（Req 22.5）', () => {
  it('カスタム boundsTop/boundsBottom は loadCharacterPhysics 後も保持される', () => {
    const boundsTop = 50;
    const boundsBottom = 550;
    const engine = new PhysicsEngine(boundsTop, boundsBottom);
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.palpiyo);
    const cfg = engine.getConfig();

    expect(cfg.boundsTop).toBe(boundsTop);
    expect(cfg.boundsBottom).toBe(boundsBottom);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: キャラクター切り替え後に前のキャラクターのパラメータが残らない（Req 22.6, 22.7）
// ---------------------------------------------------------------------------

describe('キャラクター切り替え時のパラメータ上書き（Req 22.6, 22.7）', () => {
  it('gelpiyo → palpiyo に切り替えると palpiyo のパラメータが使用される', () => {
    const engine = new PhysicsEngine();
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.gelpiyo);
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.palpiyo);
    const cfg = engine.getConfig();

    expect(cfg.jumpImpulse).toBe(CHARACTER_CONFIGS.palpiyo.physics.jumpImpulse);
    expect(cfg.gravity).toBe(CHARACTER_CONFIGS.palpiyo.physics.gravity);
    expect(cfg.maxFallSpeed).toBe(CHARACTER_CONFIGS.palpiyo.physics.maxFallSpeed);
    expect(cfg.maxRiseSpeed).toBe(CHARACTER_CONFIGS.palpiyo.physics.maxRiseSpeed);
  });

  it('applyJump() は切り替え後のキャラクターの jumpImpulse を使用する', () => {
    const engine = new PhysicsEngine();
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.gelpiyo);   // jumpImpulse=-400
    engine.loadCharacterPhysics(CHARACTER_CONFIGS.midoripiyo); // jumpImpulse=-320
    const player = createPlayer();
    engine.applyJump(player);

    expect(player.velocityY).toBe(CHARACTER_CONFIGS.midoripiyo.physics.jumpImpulse);
    expect(player.velocityY).toBe(-320);
  });
});

// ---------------------------------------------------------------------------
// Property 16: キャラクター別物理パラメータの一致性
// Feature: gelpiyo-deep-sea-adventure, Property 16: キャラクター別物理パラメータの一致性
// Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
// ---------------------------------------------------------------------------

describe('Property 16: キャラクター別物理パラメータの一致性', () => {
  it(
    '任意の CharacterType で loadCharacterPhysics 後、getConfig() のパラメータが CHARACTER_CONFIGS[type].physics と完全一致する',
    () => {
      // CharacterType の全列挙値からランダムに選ぶアービトラリ
      const characterTypeArb = fc.constantFrom(...ALL_CHARACTER_TYPES);

      fc.assert(
        fc.property(characterTypeArb, (type) => {
          const expectedPhysics = CHARACTER_CONFIGS[type].physics;
          const engine = new PhysicsEngine();
          engine.loadCharacterPhysics(CHARACTER_CONFIGS[type]);
          const actual = engine.getConfig();

          return (
            actual.jumpImpulse === expectedPhysics.jumpImpulse &&
            actual.gravity === expectedPhysics.gravity &&
            actual.maxFallSpeed === expectedPhysics.maxFallSpeed &&
            actual.maxRiseSpeed === expectedPhysics.maxRiseSpeed
          );
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    '任意の CharacterType で loadCharacterPhysics 後、applyJump() が付与する velocityY は jumpImpulse と一致する',
    () => {
      const characterTypeArb = fc.constantFrom(...ALL_CHARACTER_TYPES);

      fc.assert(
        fc.property(
          characterTypeArb,
          fc.float({ min: -1000, max: 1000, noNaN: true }), // 初期 velocityY（任意）
          (type, initialVelocityY) => {
            const expectedJumpImpulse = CHARACTER_CONFIGS[type].physics.jumpImpulse;
            const engine = new PhysicsEngine();
            engine.loadCharacterPhysics(CHARACTER_CONFIGS[type]);
            const player = createPlayer(300, initialVelocityY);
            engine.applyJump(player);

            return player.velocityY === expectedJumpImpulse;
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    '任意の CharacterType で loadCharacterPhysics は boundsTop / boundsBottom を変更しない',
    () => {
      const characterTypeArb = fc.constantFrom(...ALL_CHARACTER_TYPES);
      // boundsTop と boundsBottom の組み合わせ（top < bottom を保証）
      const boundsArb = fc.tuple(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 400, max: 800 }),
      );

      fc.assert(
        fc.property(characterTypeArb, boundsArb, (type, [top, bottom]) => {
          const engine = new PhysicsEngine(top, bottom);
          engine.loadCharacterPhysics(CHARACTER_CONFIGS[type]);
          const cfg = engine.getConfig();

          return cfg.boundsTop === top && cfg.boundsBottom === bottom;
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    '異なる CharacterType 間でキャラクターを切り替えると、最後に loadCharacterPhysics したキャラクターのパラメータのみが使用される',
    () => {
      const characterTypeArb = fc.constantFrom(...ALL_CHARACTER_TYPES);

      fc.assert(
        fc.property(
          characterTypeArb,
          characterTypeArb,
          (typeA, typeB) => {
            const engine = new PhysicsEngine();
            // 最初に typeA をロード
            engine.loadCharacterPhysics(CHARACTER_CONFIGS[typeA]);
            // 次に typeB をロード（上書き）
            engine.loadCharacterPhysics(CHARACTER_CONFIGS[typeB]);
            const actual = engine.getConfig();
            const expectedPhysics = CHARACTER_CONFIGS[typeB].physics;

            return (
              actual.jumpImpulse === expectedPhysics.jumpImpulse &&
              actual.gravity === expectedPhysics.gravity &&
              actual.maxFallSpeed === expectedPhysics.maxFallSpeed &&
              actual.maxRiseSpeed === expectedPhysics.maxRiseSpeed
            );
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

/**
 * ItemSystem のユニットテスト + プロパティベーステスト
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 *
 * Property 8: アイテムポイント値の正確性
 *   Validates: Requirements 10.1, 10.2, 10.3
 *
 * Property 9: バブルシールドの一回性保護
 *   Validates: Requirements 10.5, 10.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ItemSystem } from '../systems/ItemSystem';
import { ITEM_CONFIGS } from '../config';
import type { Player } from '../models/Player';

// ---------------------------------------------------------------------------
// ヘルパー: テスト用プレイヤーオブジェクトを生成
// ---------------------------------------------------------------------------

function makePlayer(hasBubbleShield = false): Player {
  return {
    x: 100,
    y: 300,
    velocityY: 0,
    radius: 20,
    hasBubbleShield,
    animationState: 'idle',
  };
}

// ---------------------------------------------------------------------------
// ユニットテスト: spawnItem
// ---------------------------------------------------------------------------

describe('ItemSystem.spawnItem', () => {
  let sys: ItemSystem;

  beforeEach(() => {
    sys = new ItemSystem();
  });

  it('指定座標でアイテムが生成される（Req 10.1）', () => {
    const item = sys.spawnItem(200, 150);
    expect(item.x).toBe(200);
    expect(item.y).toBe(150);
  });

  it('生成アイテムは未収集状態である', () => {
    const item = sys.spawnItem(100, 100);
    expect(item.collected).toBe(false);
  });

  it('生成アイテムは有効な ItemType を持つ', () => {
    const validTypes = ['golden_egg', 'pearl', 'treasure_jar', 'glowing_jelly',
      'gold_coin', 'deep_fish', 'starfish', 'time_capsule', 'bubble_shield'];
    const item = sys.spawnItem(50, 50);
    expect(validTypes).toContain(item.type);
  });

  it('生成アイテムのポイントは ITEM_CONFIGS と一致する', () => {
    // 何度か試して各タイプの確認をする
    for (let i = 0; i < 20; i++) {
      const item = sys.spawnItem(0, 0);
      expect(item.points).toBe(ITEM_CONFIGS[item.type].points);
    }
  });

  it('生成アイテムは一意の id を持つ', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const item = sys.spawnItem(0, 0);
      ids.add(item.id);
    }
    expect(ids.size).toBe(10);
  });

  it('スポーンしたアイテムは getActiveItems() に含まれる', () => {
    const item = sys.spawnItem(100, 200);
    const actives = sys.getActiveItems();
    expect(actives.some(a => a.id === item.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: collectItem
// ---------------------------------------------------------------------------

describe('ItemSystem.collectItem', () => {
  let sys: ItemSystem;

  beforeEach(() => {
    sys = new ItemSystem();
  });

  it('pearl 収集で pointsAwarded = 10（Req 10.1）', () => {
    const item = sys.spawnItem(0, 0);
    (item as any).type = 'pearl';
    (item as any).points = 10;
    const player = makePlayer();
    const result = sys.collectItem(item, player);
    expect(result.pointsAwarded).toBe(10);
    expect(result.itemType).toBe('pearl');
    expect(result.shieldActivated).toBe(false);
  });

  it('treasure_jar 収集で pointsAwarded = 30', () => {
    const item = sys.spawnItem(0, 0);
    (item as any).type = 'treasure_jar';
    (item as any).points = 30;
    const player = makePlayer();
    const result = sys.collectItem(item, player);
    expect(result.pointsAwarded).toBe(30);
    expect(result.itemType).toBe('treasure_jar');
    expect(result.shieldActivated).toBe(false);
  });

  it('gold_coin 収集で pointsAwarded = 25', () => {
    const item = sys.spawnItem(0, 0);
    (item as any).type = 'gold_coin';
    (item as any).points = 25;
    const player = makePlayer();
    const result = sys.collectItem(item, player);
    expect(result.pointsAwarded).toBe(25);
    expect(result.itemType).toBe('gold_coin');
    expect(result.shieldActivated).toBe(false);
  });

  it('bubble_shield 収集で shieldActivated = true（Req 10.4, 10.5）', () => {
    const item = sys.spawnItem(0, 0);
    (item as any).type = 'bubble_shield';
    (item as any).points = 0;
    const player = makePlayer(false);
    const result = sys.collectItem(item, player);
    expect(result.pointsAwarded).toBe(0);
    expect(result.itemType).toBe('bubble_shield');
    expect(result.shieldActivated).toBe(true);
  });

  it('bubble_shield 収集後に player.hasBubbleShield が true になる（Req 10.5）', () => {
    const item = sys.spawnItem(0, 0);
    (item as any).type = 'bubble_shield';
    (item as any).points = 0;
    const player = makePlayer(false);
    sys.collectItem(item, player);
    expect(player.hasBubbleShield).toBe(true);
  });

  it('bubble_shield 以外のアイテム収集で player.hasBubbleShield は変わらない', () => {
    const item = sys.spawnItem(0, 0);
    (item as any).type = 'pearl';
    (item as any).points = 10;
    const player = makePlayer(false);
    sys.collectItem(item, player);
    expect(player.hasBubbleShield).toBe(false);
  });

  it('収集後に item.collected が true になる', () => {
    const item = sys.spawnItem(0, 0);
    const player = makePlayer();
    expect(item.collected).toBe(false);
    sys.collectItem(item, player);
    expect(item.collected).toBe(true);
  });

  it('収集済みアイテムは getActiveItems() に含まれない', () => {
    const item = sys.spawnItem(0, 0);
    const player = makePlayer();
    sys.collectItem(item, player);
    const actives = sys.getActiveItems();
    expect(actives.some(a => a.id === item.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: hasBubbleShield / consumeBubbleShield
// ---------------------------------------------------------------------------

describe('ItemSystem.hasBubbleShield / consumeBubbleShield', () => {
  let sys: ItemSystem;

  beforeEach(() => {
    sys = new ItemSystem();
  });

  it('hasBubbleShield は player.hasBubbleShield を返す（Req 10.5）', () => {
    const playerWith = makePlayer(true);
    const playerWithout = makePlayer(false);
    expect(sys.hasBubbleShield(playerWith)).toBe(true);
    expect(sys.hasBubbleShield(playerWithout)).toBe(false);
  });

  it('consumeBubbleShield で player.hasBubbleShield が false になる（Req 10.6）', () => {
    const player = makePlayer(true);
    expect(player.hasBubbleShield).toBe(true);
    sys.consumeBubbleShield(player);
    expect(player.hasBubbleShield).toBe(false);
  });

  it('consumeBubbleShield を 2 回呼んでも false のまま（Req 10.6）', () => {
    const player = makePlayer(true);
    sys.consumeBubbleShield(player);
    sys.consumeBubbleShield(player);
    expect(player.hasBubbleShield).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ユニットテスト: removeOffscreen
// ---------------------------------------------------------------------------

describe('ItemSystem.removeOffscreen', () => {
  it('x < -100 のアイテムが除去される', () => {
    const sys = new ItemSystem();
    const item = sys.spawnItem(-110, 100);
    sys.removeOffscreen(800);
    const actives = sys.getActiveItems();
    expect(actives.some(a => a.id === item.id)).toBe(false);
  });

  it('x >= 0 のアイテムは除去されない', () => {
    const sys = new ItemSystem();
    const item = sys.spawnItem(100, 100);
    sys.removeOffscreen(800);
    const actives = sys.getActiveItems();
    expect(actives.some(a => a.id === item.id)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 8: アイテムポイント値の正確性
// Feature: gelpiyo-deep-sea-adventure, Property 8: アイテムポイント値の正確性
// Validates: Requirements 10.1, 10.2, 10.3
// ---------------------------------------------------------------------------

describe('Property 8: アイテムポイント値の正確性', () => {
  it('任意の ItemType（pearl/gold_coin/treasure_jar）で collectItem の pointsAwarded が ITEM_CONFIGS と一致する', () => {
    const scoringTypes = ['pearl', 'gold_coin', 'treasure_jar'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...scoringTypes),
        (itemType) => {
          const sys = new ItemSystem();
          const item = sys.spawnItem(0, 0);
          (item as any).type = itemType;
          (item as any).points = ITEM_CONFIGS[itemType].points;

          const player = makePlayer();
          const result = sys.collectItem(item, player);

          return result.pointsAwarded === ITEM_CONFIGS[itemType].points;
        }
      )
    );
  });

  it('bubble_shield の pointsAwarded は常に 0（Req 10.4）', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        (x, y) => {
          const sys = new ItemSystem();
          const item = sys.spawnItem(x, y);
          (item as any).type = 'bubble_shield';
          (item as any).points = 0;

          const player = makePlayer();
          const result = sys.collectItem(item, player);
          return result.pointsAwarded === 0 && result.shieldActivated === true;
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: バブルシールドの一回性保護
// Feature: gelpiyo-deep-sea-adventure, Property 9: バブルシールドの一回性保護
// Validates: Requirements 10.5, 10.6
// ---------------------------------------------------------------------------

describe('Property 9: バブルシールドの一回性保護', () => {
  it('バブル収集後 1 回目の消費でシールドが false になり、その後も false のまま', () => {
    // Feature: gelpiyo-deep-sea-adventure, Property 9: バブルシールドの一回性保護
    fc.assert(
      fc.property(
        fc.boolean(),  // 初期 hasBubbleShield 状態（常に bubble 収集で true になる）
        (_initialShield) => {
          const sys = new ItemSystem();

          // バブルアイテムを収集してシールドを付与
          const item = sys.spawnItem(0, 0);
          (item as any).type = 'bubble_shield';
          (item as any).points = 0;
          const player = makePlayer(false);
          sys.collectItem(item, player);

          // シールド付与確認
          if (!sys.hasBubbleShield(player)) return false;

          // 1 回目の衝突でシールド消費
          sys.consumeBubbleShield(player);

          // 消費後はシールドなし
          if (sys.hasBubbleShield(player)) return false;

          // 2 回目の消費後も変わらず false
          sys.consumeBubbleShield(player);
          return !sys.hasBubbleShield(player);
        }
      )
    );
  });

  it('バブルシールドなしの場合 hasBubbleShield は常に false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 800 }),
        fc.integer({ min: 0, max: 600 }),
        (x, y) => {
          const sys = new ItemSystem();
          const player = makePlayer(false);

          // pearl をスポーンして収集（バブルなし）
          const item = sys.spawnItem(x, y);
          (item as any).type = 'pearl';
          (item as any).points = 5;
          sys.collectItem(item, player);

          return sys.hasBubbleShield(player) === false;
        }
      )
    );
  });
});

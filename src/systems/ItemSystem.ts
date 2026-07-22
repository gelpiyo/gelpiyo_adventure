/**
 * ItemSystem - アイテムのスポーン・収集・効果管理
 *
 * 9種類のアイテム対応。各アイテムの特殊効果は CollectionResult で返し、
 * GameScene 側で適用する。
 */

import { ITEM_CONFIGS } from '../config';
import type { ItemType } from '../config';
import type { Item } from '../models/Item';
import type { Player } from '../models/Player';

// ---------------------------------------------------------------------------
// CollectionResult
// ---------------------------------------------------------------------------

export interface CollectionResult {
  itemType: ItemType;
  /** 取得で加算されるポイント */
  pointsAwarded: number;
  /** シールドが付与されたか */
  shieldActivated: boolean;
  /** 特殊効果の種類（なければ undefined） */
  effect?: 'invincible' | 'score_double' | 'slow' | 'shield';
  /** 特殊効果の持続時間 ms */
  effectDurationMs?: number;
}

// ---------------------------------------------------------------------------
// ItemSystem
// ---------------------------------------------------------------------------

export class ItemSystem {
  private items: Item[] = [];
  private spawnCounter: number = 0;

  // -------------------------------------------------------------------------
  // スポーン（ランダム）
  // -------------------------------------------------------------------------

  spawnItem(x: number, y: number): Item {
    const type = this._selectItemType();
    const config = ITEM_CONFIGS[type];
    const item: Item = {
      id: `item_${++this.spawnCounter}_${Date.now()}`,
      type,
      x,
      y,
      radius: this._getRadius(type),
      collected: false,
      points: config.points,
    };
    this.items.push(item);
    return item;
  }

  private _selectItemType(): ItemType {
    const configs = Object.values(ITEM_CONFIGS);
    const totalWeight = configs.reduce((sum, c) => sum + c.spawnWeight, 0);
    const rand = Math.random() * totalWeight;
    let cumulative = 0;
    for (const config of configs) {
      cumulative += config.spawnWeight;
      if (rand < cumulative) return config.type;
    }
    return configs[configs.length - 1].type;
  }

  private _getRadius(type: ItemType): number {
    // 金の卵は大きめ、その他は標準
    const sizes: Partial<Record<ItemType, number>> = {
      golden_egg: 20,
      starfish: 18,
      time_capsule: 17,
    };
    return sizes[type] ?? 15;
  }

  // -------------------------------------------------------------------------
  // 収集
  // -------------------------------------------------------------------------

  collectItem(item: Item, player: Player): CollectionResult {
    item.collected = true;
    const config = ITEM_CONFIGS[item.type];

    const shieldActivated = config.effect === 'shield';
    if (shieldActivated) {
      player.hasBubbleShield = true;
    }

    return {
      itemType: item.type,
      pointsAwarded: item.points,
      shieldActivated,
      effect: config.effect,
      effectDurationMs: config.effectDurationMs,
    };
  }

  // -------------------------------------------------------------------------
  // バブルシールド
  // -------------------------------------------------------------------------

  hasBubbleShield(player: Player): boolean {
    return player.hasBubbleShield;
  }

  consumeBubbleShield(player: Player): void {
    player.hasBubbleShield = false;
  }

  // -------------------------------------------------------------------------
  // アクティブアイテム管理
  // -------------------------------------------------------------------------

  getActiveItems(): Item[] {
    return this.items.filter(item => !item.collected);
  }

  /**
   * アイテムをスクロール速度に応じて左に移動させる。
   * @param scrollSpeed スクロール速度 px/s
   * @param dtSec 経過時間（秒）
   */
  update(scrollSpeed: number, dtSec: number): void {
    for (const item of this.items) {
      if (!item.collected) {
        item.x -= scrollSpeed * dtSec;
      }
    }
  }

  removeOffscreen(_canvasWidth: number): void {
    // 画面左端より十分外に出たアイテムを除去
    this.items = this.items.filter(item => item.x > -100);
  }
}

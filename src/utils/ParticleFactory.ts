/**
 * ParticleFactory - パーティクル生成ヘルパー
 *
 * アイテム収集時などに使用するパーティクルエフェクトを生成するユーティリティ。
 *
 * Requirements: 19.1
 */

import Phaser from 'phaser';
import type { ItemType } from '../config';
const ITEM_BURST_COLORS: Record<string, number> = {
  golden_egg:   0xffd700,
  pearl:        0xeeeeff,
  treasure_jar: 0x88ccaa,
  glowing_jelly:0xaaffff,
  gold_coin:    0xffcc00,
  deep_fish:    0x88ffcc,
  starfish:     0xff8866,
  time_capsule: 0xddcc88,
  bubble_shield:0x88ccff,
};

/** デフォルトのバーストカラー（ItemType が指定されない場合に使用） */
const DEFAULT_BURST_COLOR = 0xffe135;

// ---------------------------------------------------------------------------
// テクスチャキー管理
// ---------------------------------------------------------------------------

/** 生成済みスパークルテクスチャキーのキャッシュ */
const generatedTextures = new Set<string>();

/**
 * スパークル用の小さな星形テクスチャを生成して scene に登録する。
 * 同じキーが既に登録されている場合は何もしない。
 *
 * @param scene   Phaser シーン
 * @param texKey  テクスチャキー
 * @param color   塗りつぶし色 (hex)
 */
function ensureSparkleTexture(
  scene: Phaser.Scene,
  texKey: string,
  color: number,
): void {
  if (generatedTextures.has(texKey) && scene.textures.exists(texKey)) {
    return;
  }

  const g = scene.add.graphics();
  g.fillStyle(color, 1);

  // 4 点の小さなひし形（スパークルっぽい形）
  const size = 6;
  g.fillTriangle(0, -size, size / 2, 0, -size / 2, 0);
  g.fillTriangle(0, size, size / 2, 0, -size / 2, 0);
  g.fillTriangle(-size, 0, 0, size / 2, 0, -size / 2);
  g.fillTriangle(size, 0, 0, size / 2, 0, -size / 2);

  g.generateTexture(texKey, size * 2 + 2, size * 2 + 2);
  g.destroy();

  generatedTextures.add(texKey);
}

// ---------------------------------------------------------------------------
// createItemCollectionBurst - アイテム収集バーストエフェクト
// ---------------------------------------------------------------------------

/**
 * アイテム収集時にカラフルなスパークルバーストパーティクルを発生させる。
 *
 * Phaser の `scene.add.particles()` を使用して収集ポイントにパーティクルを作成し、
 * `lifespan` 終了後に自動的に消えるよう設定する。
 *
 * Requirements: 19.1
 *
 * @param scene  Phaser シーン（パーティクルの親コンテキスト）
 * @param x      バーストの X 座標（px）
 * @param y      バーストの Y 座標（px）
 * @param color  バーストの色 (hex)。省略時はデフォルト色を使用する
 *
 * @example
 * // アイテムタイプを使って呼び出す
 * createItemCollectionBurst(scene, item.x, item.y, ITEM_BURST_COLORS['pearl']);
 *
 * @example
 * // 色省略（デフォルト黄色）
 * createItemCollectionBurst(scene, x, y);
 */
export function createItemCollectionBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color?: number,
): void {
  const burstColor = color ?? DEFAULT_BURST_COLOR;
  const texKey = `sparkle_burst_${burstColor.toString(16)}`;

  // スパークルテクスチャを必要に応じて生成
  ensureSparkleTexture(scene, texKey, burstColor);

  // パーティクルエミッターを作成してバースト発射
  const emitter = scene.add.particles(x, y, texKey, {
    // 360 度全方向に広がる
    angle: { min: 0, max: 360 },
    // 速度: 内側から外側へ広がる
    speed: { min: 80, max: 200 },
    // 重力なし（画面内で広がってフェードアウト）
    gravityY: 0,
    // スパークルのライフスパン: 400〜600ms で自然に消える
    lifespan: { min: 400, max: 600 },
    // スケール: 出現時に小さく始まり膨らんで消える
    scale: { start: 0.8, end: 0 },
    // アルファ: 徐々にフェードアウト
    alpha: { start: 1, end: 0 },
    // 一度に 12 個のパーティクルを発射してバースト感を演出
    quantity: 12,
    // バーストは 1 回のみ（emitOnce = true に相当）
    // emitCallback は使わず maxParticles で制御する
    maxParticles: 12,
  });

  // 深度: アイテムや UI より手前に描画（depth は ParticleEmitterConfig に含まれないため別途設定）
  emitter.setDepth(50);

  // エミッターが使い終わったら自動的に破棄する
  // maxParticles に達すると emitter.on('complete') が発火する
  emitter.on(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
    emitter.destroy();
  });
}

// ---------------------------------------------------------------------------
// createItemCollectionBurstByType - ItemType を直接受け取るラッパー
// ---------------------------------------------------------------------------

/**
 * ItemType に対応した色でアイテム収集バーストパーティクルを発生させる。
 *
 * Requirements: 19.1
 *
 * @param scene    Phaser シーン
 * @param x        バーストの X 座標（px）
 * @param y        バーストの Y 座標（px）
 * @param itemType 収集したアイテムタイプ（色の決定に使用）
 *
 * @example
 * createItemCollectionBurstByType(scene, item.x, item.y, item.type);
 */
export function createItemCollectionBurstByType(
  scene: Phaser.Scene,
  x: number,
  y: number,
  itemType: ItemType,
): void {
  const color = ITEM_BURST_COLORS[itemType];
  createItemCollectionBurst(scene, x, y, color);
}

// ---------------------------------------------------------------------------
// ITEM_BURST_COLORS のエクスポート（外部から参照できるよう公開）
// ---------------------------------------------------------------------------

export { ITEM_BURST_COLORS };

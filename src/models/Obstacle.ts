/**
 * 障害物のデータモデル
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * 障害物の種類
 * - cave_wall: 上下から迫る洞窟壁（メイン障害物）
 * - jellyfish: 正弦波で上下に動くクラゲ
 * - squid: 水平に移動するイカ
 * - seaweed: 左右に揺れる海藻
 * - current_zone: プレイヤーを横方向に押す海流ゾーン
 */
export type ObstacleType = 'cave_wall' | 'jellyfish' | 'squid' | 'seaweed' | 'current_zone';

/**
 * 障害物の状態を表すインターフェース
 */
export interface Obstacle {
  /** 障害物の一意 ID */
  readonly id: string;
  /** 障害物の種類 */
  readonly type: ObstacleType;
  /** X 座標（px） */
  x: number;
  /** Y 座標（px） */
  y: number;
  /** 幅（px） */
  readonly width: number;
  /** 高さ（px） */
  readonly height: number;
  /** cave_wall 用: ギャップ中央の Y 座標（px） */
  gapY?: number;
  /** cave_wall 用: ギャップの幅（px） */
  gapSize?: number;
  /** jellyfish / seaweed 用: sin 波の位相（ラジアン） */
  phase?: number;
  /** jellyfish / seaweed 用: 振動の振幅（px） */
  amplitude?: number;
  /** jellyfish / seaweed 用: 振動の周波数（Hz） */
  frequency?: number;
  /** current_zone 用: プレイヤーに加える横方向の力（px/s） */
  pushForce?: number;
  /** 通過時のスコア付与済みフラグ（cave_wall のみ使用） */
  scored: boolean;
}

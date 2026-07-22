/**
 * ゲームフィールドの境界を表すデータモデル
 *
 * CollisionDetector および PhysicsEngine で使用する境界定義。
 *
 * Requirements: 3.2, 3.3, 3.4
 */

/**
 * ゲームフィールドの上下左右の境界を表すインターフェース
 */
export interface GameBounds {
  /** 上端の Y 座標（px） */
  top: number;
  /** 下端の Y 座標（px） */
  bottom: number;
  /** 左端の X 座標（px） */
  left: number;
  /** 右端の X 座標（px） */
  right: number;
}

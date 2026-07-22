/**
 * プレイヤー（ゲルぴよ）のデータモデル
 *
 * Requirements: 3.1, 3.4, 10.5, 15.2, 15.3, 15.4
 */

/**
 * プレイヤーのアニメーション状態
 * - swim_up: 上向き泳ぎ（ジャンプ中）
 * - fall_down: 落下中
 * - idle: 待機（タイトル画面用）
 * - hit: 衝突時のびっくり表情
 */
export type PlayerAnimationState = 'swim_up' | 'fall_down' | 'idle' | 'hit';

/**
 * プレイヤー（ゲルぴよ）の状態を表すインターフェース
 */
export interface Player {
  /** X 座標（px） */
  x: number;
  /** Y 座標（px） */
  y: number;
  /** 垂直方向の速度（px/s）。正値で下向き、負値で上向き */
  velocityY: number;
  /** ヒットボックスの半径（px）。視覚サイズより 20% 小さく設定 */
  radius: number;
  /** バブルシールドが有効かどうか。true の場合、次の障害物衝突を 1 回防ぐ */
  hasBubbleShield: boolean;
  /** 現在のアニメーション状態 */
  animationState: PlayerAnimationState;
}

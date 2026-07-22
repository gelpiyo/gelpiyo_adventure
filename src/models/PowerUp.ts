/**
 * パワーアップのデータモデル
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import type { PowerUpType } from '../config';

// PowerUpType を再エクスポート（設計書の定義に合わせ models から参照可能にする）
export type { PowerUpType } from '../config';

/**
 * ゲームフィールド上に配置されるパワーアップアイテムの状態を表すインターフェース
 */
export interface PowerUp {
  /** パワーアップの一意 ID */
  readonly id: string;
  /** パワーアップの種類 */
  readonly type: PowerUpType;
  /** X 座標（px） */
  x: number;
  /** Y 座標（px） */
  y: number;
  /** ヒットボックスの半径（px） */
  readonly radius: number;
  /** 取得済みフラグ */
  collected: boolean;
}

/**
 * 現在発動中のパワーアップ効果の状態を表すインターフェース
 */
export interface ActivePowerUp {
  /** パワーアップの種類 */
  readonly type: PowerUpType;
  /** 残り持続時間（ms） */
  remainingDuration: number;
  /** 発動開始時刻（ゲーム内タイムスタンプ ms） */
  readonly startedAt: number;
}

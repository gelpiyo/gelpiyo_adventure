/**
 * アイテムのデータモデル
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { ItemType } from '../config';

// ItemType を再エクスポート（設計書の定義に合わせ models から参照可能にする）
export type { ItemType } from '../config';

/**
 * ゲームフィールド上に配置されるアイテムの状態を表すインターフェース
 */
export interface Item {
  /** アイテムの一意 ID */
  readonly id: string;
  /** アイテムの種類 */
  readonly type: ItemType;
  /** X 座標（px） */
  x: number;
  /** Y 座標（px） */
  y: number;
  /** ヒットボックスの半径（px） */
  readonly radius: number;
  /** 取得済みフラグ */
  collected: boolean;
  /** 収集時に加算されるポイント（bubble は 0） */
  readonly points: number;
}

/**
 * 実績・バッジのデータモデル
 *
 * Requirements: 16.1, 16.2, 16.3
 */

import type { AreaTheme } from '../config';

/**
 * 実績のアンロック条件を表す判別共用体型
 * - score: 指定スコアに到達する
 * - items_collected: 指定数のアイテムを収集する
 * - survive_seconds: 指定秒数生き延びる
 * - combo: 指定数のコンボを達成する
 * - area_reached: 指定エリアに到達する
 */
export type AchievementCondition =
  | { readonly type: 'score'; readonly threshold: number }
  | { readonly type: 'items_collected'; readonly count: number }
  | { readonly type: 'survive_seconds'; readonly seconds: number }
  | { readonly type: 'combo'; readonly count: number }
  | { readonly type: 'area_reached'; readonly area: AreaTheme };

/**
 * 実績（バッジ）の状態を表すインターフェース
 */
export interface Achievement {
  /** 実績の一意 ID */
  readonly id: string;
  /** 実績のタイトル */
  readonly title: string;
  /** 実績の説明文 */
  readonly description: string;
  /** アンロック条件 */
  readonly condition: AchievementCondition;
  /** アンロック済みかどうか */
  unlocked: boolean;
  /** アンロック日時（Unix タイムスタンプ ms）。未アンロック時は undefined */
  unlockedAt?: number;
}

/**
 * ゲームイベントの型定義
 *
 * AchievementSystem および DailyChallengeSystem が参照するゲーム内イベントを表す型。
 *
 * Requirements: 16.1, 16.2, 18.1, 18.2
 */

import type { ItemType, AreaTheme } from '../config';

/**
 * ゲーム中に発生するイベントを表す判別共用体型
 * - score_reached: 指定スコアに到達した（実績チェック用）
 * - item_collected: アイテムを取得した
 * - survived: 一定時間生き延びた
 * - combo_reached: コンボ数に達した
 * - area_reached: エリアに到達した
 * - obstacle_passed: 障害物を通過した（内部処理用）
 * - area_changed: エリアが変化した（内部処理用）
 */
export type GameEvent =
  | { readonly type: 'score_reached'; readonly score: number }
  | { readonly type: 'item_collected'; readonly itemType: ItemType; readonly totalCollected: number }
  | { readonly type: 'survived'; readonly seconds: number }
  | { readonly type: 'combo_reached'; readonly count: number }
  | { readonly type: 'area_reached'; readonly area: AreaTheme }
  | { readonly type: 'obstacle_passed'; readonly score: number }
  | { readonly type: 'area_changed'; readonly area: AreaTheme };

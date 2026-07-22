/**
 * デイリーチャレンジのデータモデル
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

/**
 * デイリーチャレンジの状態を表すインターフェース
 */
export interface DailyChallenge {
  /** チャレンジの対象日付（"YYYY-MM-DD" 形式） */
  readonly date: string;
  /** チャレンジの種類
   * - score: 指定スコアに到達する
   * - items: 指定数のアイテムを収集する
   * - survive: 指定秒数生き延びる
   */
  readonly type: 'score' | 'items' | 'survive';
  /** チャレンジの目標値（スコア数・アイテム数・秒数） */
  readonly objective: number;
  /** チャレンジ達成時に付与されるボーナススコア */
  readonly bonusScore: number;
  /** 達成済みかどうか */
  completed: boolean;
  /** 現在の進捗値 */
  progress: number;
}

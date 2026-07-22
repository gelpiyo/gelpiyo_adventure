/**
 * ゲーム全体の状態を表すデータモデル
 *
 * Requirements: 1.4, 9.2, 9.3, 12.1, 12.2, 12.3
 */

import type { AreaTheme } from '../config';

/**
 * 現在表示中の画面を表す型
 * 設計書定義: 'title' | 'game' | 'gameover' | 'achievement'
 * ※ キャラクター選択画面のために 'character_select' も追加で保持
 */
export type ScreenType = 'title' | 'character_select' | 'game' | 'gameover' | 'achievement';

/**
 * ゲーム全体の状態を表すインターフェース
 *
 * Requirements: 3.1, 7.1, 10.1, 11.1, 21.1, 22.1
 */
export interface GameState {
  /** 現在表示中の画面 */
  screen: 'title' | 'game' | 'gameover' | 'achievement';
  /** 現在のスコア */
  score: number;
  /** ハイスコア（ローカルストレージから読み込んだ最高スコア） */
  highScore: number;
  /** 経過時間（ms） */
  elapsedTime: number;
  /** 現在のエリアテーマ */
  currentArea: AreaTheme;
  /** ゲームオーバー状態かどうか */
  isGameOver: boolean;
  /** 今回のスコアが新記録かどうか */
  isNewRecord: boolean;
}

/**
 * スコアの計算・保存・ハイスコア管理を担うシステム
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { StorageManager } from '../utils/StorageManager';

/**
 * ScoreSystem
 *
 * - currentScore: 現在のゲームセッションのスコア
 * - highScore: ローカルストレージから読み込んだ最高スコア
 *
 * initialize() を呼ぶことで localStorage から highScore をロードする。
 * reset() は currentScore のみをリセットし、highScore はリセットしない。
 */
export class ScoreSystem {
  /** 現在ゲームセッションのスコア（Req 9.1, 9.3） */
  currentScore: number;

  /** 過去最高スコア（Req 9.4, 9.5） */
  highScore: number;

  constructor() {
    this.currentScore = 0;
    this.highScore = 0;
  }

  /**
   * localStorage から highScore を読み込んで初期化する（Req 9.5）
   */
  initialize(): void {
    this.highScore = StorageManager.loadHighScore();
  }

  /**
   * スコアに points を加算する（Req 9.1）
   * @param points 加算するポイント数（正の整数を想定）
   */
  incrementScore(points: number): void {
    this.currentScore += points;
  }

  /**
   * コンボ乗数を適用した得点を返す（スコアへの加算は行わない）
   *
   * 呼び出し元が返り値を使って incrementScore() を呼ぶことで
   * スコアへの反映を行う想定（Req 17.1, 17.2, 17.3）。
   *
   * @param multiplier コンボ乗数（1 / 2 / 3）
   * @param basePoints アイテムのベースポイント値
   * @returns basePoints * multiplier
   */
  applyComboMultiplier(multiplier: number, basePoints: number): number {
    return basePoints * multiplier;
  }

  /**
   * currentScore が highScore を超えていれば highScore を更新して true を返す。
   * それ以外は false を返す（Req 8.6, 12.1, 12.2）。
   *
   * highScore を更新した場合は localStorage にも即時保存する。
   */
  checkAndUpdateHighScore(): boolean {
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      this.persistHighScore();
      return true;
    }
    return false;
  }

  /**
   * 現在の highScore を localStorage に保存する（Req 9.4）
   */
  persistHighScore(): void {
    StorageManager.saveHighScore(this.highScore);
  }

  /**
   * currentScore を 0 にリセットする（Req 9.3, 12.7）
   * highScore はリセットしない。
   */
  reset(): void {
    this.currentScore = 0;
  }
}

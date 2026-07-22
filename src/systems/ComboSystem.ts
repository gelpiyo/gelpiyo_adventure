/**
 * ComboSystem — コンボカウントと乗数の管理
 *
 * アイテムを連続取得するとコンボカウントが増加し、スコア乗数が上昇する。
 * 障害物をアイテムを取らずに通過すると（onObstaclePassed）コンボはリセットされる。
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import { COMBO } from '../config';

export class ComboSystem {
  /** コンボカウント（非負整数） */
  count: number;

  /** 現在のスコア乗数（1x / 2x / 3x） */
  multiplier: number;

  constructor() {
    this.count = 0;
    this.multiplier = 1;
  }

  /**
   * アイテムを取得したときに呼ぶ。
   * カウントを 1 増加させ、乗数を更新する。
   * Req 17.1, 17.2, 17.3, 17.4
   */
  onItemCollected(): void {
    this.count += 1;
    this.multiplier = this.getMultiplier();
  }

  /**
   * アイテムを取らずに障害物を通過したときに呼ぶ。
   * コンボカウントと乗数をリセットする。
   * Req 17.5
   */
  onObstaclePassed(): void {
    this.reset();
  }

  /**
   * 現在のコンボカウントに対応するスコア乗数を返す。
   * - count < 3  → 1x
   * - count < 5  → 2x  (Req 17.2)
   * - count >= 5 → 3x  (Req 17.3)
   */
  getMultiplier(): number {
    if (this.count >= COMBO.MULTIPLIER_3X_THRESHOLD) {
      return 3;
    }
    if (this.count >= COMBO.MULTIPLIER_2X_THRESHOLD) {
      return 2;
    }
    return 1;
  }

  /**
   * コンボカウントと乗数を初期値（0 / 1x）にリセットする。
   */
  reset(): void {
    this.count = 0;
    this.multiplier = 1;
  }
}

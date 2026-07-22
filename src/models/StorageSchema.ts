/**
 * ローカルストレージの保存スキーマ
 *
 * Requirements: 9.4, 9.5, 16.3, 18.3, 21.5, 21.6
 */

import type { CharacterType } from '../config';
import type { DailyChallenge } from './DailyChallenge';

/**
 * ローカルストレージに保存されるデータ全体のスキーマ
 */
export interface StorageSchema {
  /** ハイスコア（未設定時は 0） */
  highScore: number;
  /** 選択中のキャラクター（未設定時は 'gelpiyo'） */
  selectedCharacter: CharacterType;
  /** 実績の保存データ。キーは実績 ID */
  achievements: Record<string, { unlocked: boolean; unlockedAt?: number }>;
  /** 本日のデイリーチャレンジデータ */
  dailyChallenge: DailyChallenge;
}

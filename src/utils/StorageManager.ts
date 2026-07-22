/**
 * ローカルストレージへのアクセスを一元管理するユーティリティ
 *
 * 直接 localStorage.* を呼び出す代わりに、このクラス経由でのみアクセスする。
 * 読み込みは try/catch で保護し、失敗時はデフォルト値を返す。
 * 書き込み失敗はサイレントに処理する。
 *
 * Requirements: 9.4, 9.5, 21.5, 21.6, 16.3, 18.3
 */

import type { CharacterType } from '../config';
import type { DailyChallenge } from '../models/DailyChallenge';

// ---------------------------------------------------------------------------
// ストレージキー定数
// ---------------------------------------------------------------------------

const KEYS = {
  HIGH_SCORE: 'gelpiyo_highScore',
  SELECTED_CHARACTER: 'gelpiyo_selectedCharacter',
  ACHIEVEMENTS: 'gelpiyo_achievements',
  DAILY_CHALLENGE: 'gelpiyo_dailyChallenge',
} as const;

// ---------------------------------------------------------------------------
// デフォルト値ファクトリ
// ---------------------------------------------------------------------------

/** 有効な CharacterType 値のセット */
const VALID_CHARACTER_TYPES: ReadonlySet<CharacterType> = new Set<CharacterType>([
  'gelpiyo',
  'momopliyo',
  'palpiyo',
  'midoripiyo',
]);

/**
 * 今日の日付で未完了のダミー DailyChallenge を生成する
 */
function createDefaultDailyChallenge(): DailyChallenge {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return {
    date,
    type: 'score',
    objective: 10,
    bonusScore: 50,
    completed: false,
    progress: 0,
  };
}

// ---------------------------------------------------------------------------
// StorageManager 実装
// ---------------------------------------------------------------------------

/**
 * localStorage の読み書きを担うシングルトン的ユーティリティクラス。
 * インスタンス化は不要で、すべてのメソッドは static として提供する。
 */
export class StorageManager {
  // -------------------------------------------------------------------------
  // ハイスコア (Req 9.4, 9.5)
  // -------------------------------------------------------------------------

  /**
   * ハイスコアを読み込む。
   * 失敗時またはデータ不正時は 0 を返す。
   */
  static loadHighScore(): number {
    try {
      const raw = localStorage.getItem(KEYS.HIGH_SCORE);
      if (raw === null) return 0;

      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;

      return Math.floor(parsed);
    } catch {
      return 0;
    }
  }

  /**
   * ハイスコアを保存する。
   * 保存に失敗してもエラーをスローしない（サイレント失敗）。
   */
  static saveHighScore(score: number): void {
    try {
      localStorage.setItem(KEYS.HIGH_SCORE, String(score));
    } catch {
      // サイレント失敗
    }
  }

  // -------------------------------------------------------------------------
  // 選択キャラクター (Req 21.5, 21.6)
  // -------------------------------------------------------------------------

  /**
   * 選択中のキャラクターを読み込む。
   * 失敗時または未設定・不正値の場合は 'gelpiyo' を返す。
   */
  static loadSelectedCharacter(): CharacterType {
    try {
      const raw = localStorage.getItem(KEYS.SELECTED_CHARACTER);
      if (raw === null) return 'gelpiyo';

      if (VALID_CHARACTER_TYPES.has(raw as CharacterType)) {
        return raw as CharacterType;
      }

      return 'gelpiyo';
    } catch {
      return 'gelpiyo';
    }
  }

  /**
   * 選択したキャラクターを保存する。
   * 保存に失敗してもエラーをスローしない（サイレント失敗）。
   */
  static saveSelectedCharacter(character: CharacterType): void {
    try {
      localStorage.setItem(KEYS.SELECTED_CHARACTER, character);
    } catch {
      // サイレント失敗
    }
  }

  // -------------------------------------------------------------------------
  // 実績 (Req 16.3)
  // -------------------------------------------------------------------------

  /**
   * 実績データを読み込む。
   * 失敗時または不正データの場合は空オブジェクト {} を返す。
   */
  static loadAchievements(): Record<string, { unlocked: boolean; unlockedAt?: number }> {
    try {
      const raw = localStorage.getItem(KEYS.ACHIEVEMENTS);
      if (raw === null) return {};

      const parsed: unknown = JSON.parse(raw);

      // 最低限のバリデーション: オブジェクトであること
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {};
      }

      return parsed as Record<string, { unlocked: boolean; unlockedAt?: number }>;
    } catch {
      return {};
    }
  }

  /**
   * 実績データを保存する。
   * 保存に失敗してもエラーをスローしない（サイレント失敗）。
   */
  static saveAchievements(
    achievements: Record<string, { unlocked: boolean; unlockedAt?: number }>
  ): void {
    try {
      localStorage.setItem(KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
    } catch {
      // サイレント失敗
    }
  }

  // -------------------------------------------------------------------------
  // デイリーチャレンジ (Req 18.3)
  // -------------------------------------------------------------------------

  /**
   * デイリーチャレンジデータを読み込む。
   * 失敗時または不正データの場合は今日の日付で未完了のダミーを返す。
   */
  static loadDailyChallenge(): DailyChallenge {
    try {
      const raw = localStorage.getItem(KEYS.DAILY_CHALLENGE);
      if (raw === null) return createDefaultDailyChallenge();

      const parsed: unknown = JSON.parse(raw);

      // 必須フィールドのバリデーション
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return createDefaultDailyChallenge();
      }

      const obj = parsed as Record<string, unknown>;

      if (
        typeof obj['date'] !== 'string' ||
        (obj['type'] !== 'score' && obj['type'] !== 'items' && obj['type'] !== 'survive') ||
        typeof obj['objective'] !== 'number' ||
        typeof obj['bonusScore'] !== 'number' ||
        typeof obj['completed'] !== 'boolean' ||
        typeof obj['progress'] !== 'number'
      ) {
        return createDefaultDailyChallenge();
      }

      return parsed as DailyChallenge;
    } catch {
      return createDefaultDailyChallenge();
    }
  }

  /**
   * デイリーチャレンジデータを保存する。
   * 保存に失敗してもエラーをスローしない（サイレント失敗）。
   */
  static saveDailyChallenge(challenge: DailyChallenge): void {
    try {
      localStorage.setItem(KEYS.DAILY_CHALLENGE, JSON.stringify(challenge));
    } catch {
      // サイレント失敗
    }
  }
}

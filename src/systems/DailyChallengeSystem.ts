/**
 * デイリーチャレンジシステム
 *
 * 毎日異なるチャレンジを日付文字列シード疑似乱数で生成し、
 * 進捗の追跡・達成判定・ローカルストレージへの永続化を行う。
 *
 * Requirements: 18.1, 18.2, 18.3, 18.5
 */

import type { DailyChallenge } from '../models/DailyChallenge';
import type { GameEvent } from '../models/GameEvent';
import { seededRandom } from '../utils/MathUtils';
import { StorageManager } from '../utils/StorageManager';

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * 今日の日付を "YYYY-MM-DD" 形式の文字列で返す。
 */
function getTodayDateStr(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * seededRandom を使って [min, max] の整数乱数を生成する。
 *
 * @param rand - seededRandom が返すクロージャ
 * @param min  - 最小値（inclusive）
 * @param max  - 最大値（inclusive）
 */
function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// DailyChallengeSystem
// ---------------------------------------------------------------------------

/**
 * デイリーチャレンジの生成・進捗管理・永続化を担うクラス。
 *
 * - 同一日付に対して常に同じチャレンジを生成（決定論的）。
 * - 新しい日付になった場合、前日の完了状態をリセットして新チャレンジを生成。
 * - 進捗はゲームイベントを通じて更新され、目標達成時に自動で complete() を呼ぶ。
 *
 * Requirements: 18.1, 18.2, 18.3, 18.5
 */
export class DailyChallengeSystem {
  /**
   * 現在のデイリーチャレンジ状態。
   * コンストラクタ後は必ず有効な DailyChallenge オブジェクトが入る。
   */
  current!: DailyChallenge;

  constructor() {
    this.load();
    // 新しい日付になっていれば新チャレンジを生成してリセット（Req 18.5）
    if (this.isNewDay()) {
      this.current = this.generateForToday();
      this.persist();
    }
  }

  // -------------------------------------------------------------------------
  // チャレンジ生成 (Req 18.1)
  // -------------------------------------------------------------------------

  /**
   * 今日の日付文字列をシードとして疑似乱数を生成し、
   * 本日のデイリーチャレンジを決定論的に生成して返す。
   *
   * チャレンジ種別とパラメータ:
   * - score:   目標スコア 10〜50、ボーナス 100
   * - items:   収集アイテム数 5〜20、ボーナス 50
   * - survive: 生存秒数 30〜120、ボーナス 75
   *
   * @returns 本日のデイリーチャレンジ（completed=false, progress=0）
   */
  generateForToday(): DailyChallenge {
    const dateStr = getTodayDateStr();
    const rand = seededRandom(dateStr);

    const types = ['score', 'items', 'survive'] as const;
    const type = types[Math.floor(rand() * 3)];

    let objective: number;
    let bonusScore: number;

    switch (type) {
      case 'score':
        objective = randInt(rand, 10, 50);
        bonusScore = 100;
        break;
      case 'items':
        objective = randInt(rand, 5, 20);
        bonusScore = 50;
        break;
      case 'survive':
        objective = randInt(rand, 30, 120);
        bonusScore = 75;
        break;
    }

    return {
      date: dateStr,
      type,
      objective,
      bonusScore,
      completed: false,
      progress: 0,
    };
  }

  // -------------------------------------------------------------------------
  // 進捗更新 (Req 18.1, 18.2)
  // -------------------------------------------------------------------------

  /**
   * ゲームイベントを受け取り、チャレンジの種別に応じて進捗を更新する。
   * 目標を達成した場合は自動的に complete() を呼び出す。
   *
   * イベントとチャレンジ種別の対応:
   * - score_reached  → type='score'  : progress = event.score
   * - item_collected → type='items'  : progress = event.totalCollected
   * - survived       → type='survive': progress = event.seconds
   *
   * @param event - ゲーム内で発生したイベント
   */
  updateProgress(event: GameEvent): void {
    // 既に達成済みであれば何もしない
    if (this.current.completed) return;

    let updated = false;

    switch (this.current.type) {
      case 'score':
        if (event.type === 'score_reached') {
          this.current.progress = event.score;
          updated = true;
        }
        break;

      case 'items':
        if (event.type === 'item_collected') {
          this.current.progress = event.totalCollected;
          updated = true;
        }
        break;

      case 'survive':
        if (event.type === 'survived') {
          this.current.progress = event.seconds;
          updated = true;
        }
        break;
    }

    // 目標達成チェック（Req 18.2）
    if (updated && this.current.progress >= this.current.objective) {
      this.complete();
    }
  }

  // -------------------------------------------------------------------------
  // 達成処理 (Req 18.2)
  // -------------------------------------------------------------------------

  /**
   * チャレンジを達成済み状態にして永続化する。
   * ボーナススコアの付与は呼び出し元（ScoreSystem）が行う。
   */
  complete(): void {
    this.current.completed = true;
    this.persist();
  }

  // -------------------------------------------------------------------------
  // ストレージ (Req 18.3)
  // -------------------------------------------------------------------------

  /**
   * ローカルストレージからデイリーチャレンジを読み込む。
   * 読み込みに失敗した場合は generateForToday() の結果を使用する。
   */
  load(): void {
    const stored = StorageManager.loadDailyChallenge();
    this.current = stored;
  }

  /**
   * 現在のデイリーチャレンジ状態をローカルストレージに保存する。
   */
  persist(): void {
    StorageManager.saveDailyChallenge(this.current);
  }

  // -------------------------------------------------------------------------
  // 日付チェック (Req 18.5)
  // -------------------------------------------------------------------------

  /**
   * 保存されているチャレンジの日付が今日の日付と異なるかを返す。
   * true の場合は新しい日付になったことを意味し、チャレンジをリセットすべき。
   *
   * @returns 日付が異なる（新しい日）場合 true
   */
  isNewDay(): boolean {
    return this.current.date !== getTodayDateStr();
  }
}

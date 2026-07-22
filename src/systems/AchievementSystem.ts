/**
 * 実績・バッジシステム
 *
 * - 13 種類の実績定義（スコア到達・アイテム収集数・生存時間・コンボ数・エリア到達）
 * - check(event): 条件を満たした実績を検出してアンロックする
 * - unlock(id): 特定の実績を手動でアンロックする
 * - persist(): StorageManager 経由で実績状態を localStorage に保存する
 * - load(): StorageManager 経由で実績状態を localStorage から読み込む
 * - getAll(): 全実績リストを返す
 *
 * Requirements: 16.1, 16.2, 16.3, 16.5
 */

import type { Achievement, AchievementCondition } from '../models/Achievement';
import type { GameEvent } from '../models/GameEvent';
import { StorageManager } from '../utils/StorageManager';
import { UI_TIMING } from '../config';

// ---------------------------------------------------------------------------
// 実績定義 (Req 16.1: 10 種類以上)
// ---------------------------------------------------------------------------

/**
 * ゲーム内の全実績定義。
 * スコア到達・アイテム収集数・生存時間・コンボ数・エリア到達を含む。
 * Req 16.1: 13 種類定義（最低 10 種類以上を満たす）
 */
const ACHIEVEMENT_DEFINITIONS: ReadonlyArray<
  Omit<Achievement, 'unlocked' | 'unlockedAt'>
> = [
  // --- スコア到達系 ---
  {
    id: 'first_swim',
    title: '初めての一泳ぎ',
    description: 'スコア 1 に到達する（初めて障害物を通過）',
    condition: { type: 'score', threshold: 1 },
  },
  {
    id: 'score_10',
    title: '深海探検家',
    description: 'スコア 10 に到達する',
    condition: { type: 'score', threshold: 10 },
  },
  {
    id: 'score_25',
    title: '熟練スイマー',
    description: 'スコア 25 に到達する',
    condition: { type: 'score', threshold: 25 },
  },
  {
    id: 'score_50',
    title: '深海マスター',
    description: 'スコア 50 に到達する',
    condition: { type: 'score', threshold: 50 },
  },
  {
    id: 'score_100',
    title: '伝説のゲルぴよ',
    description: 'スコア 100 に到達する',
    condition: { type: 'score', threshold: 100 },
  },

  // --- アイテム収集数系 ---
  {
    id: 'item_collector_5',
    title: 'コレクター見習い',
    description: 'アイテムを 5 個収集する',
    condition: { type: 'items_collected', count: 5 },
  },
  {
    id: 'item_collector_20',
    title: 'ベテランコレクター',
    description: 'アイテムを 20 個収集する',
    condition: { type: 'items_collected', count: 20 },
  },

  // --- 生存時間系 ---
  {
    id: 'survivor_30s',
    title: '30秒生存',
    description: '30 秒間生き延びる',
    condition: { type: 'survive_seconds', seconds: 30 },
  },
  {
    id: 'survivor_60s',
    title: '1分間生存',
    description: '60 秒間生き延びる',
    condition: { type: 'survive_seconds', seconds: 60 },
  },

  // --- コンボ系 ---
  {
    id: 'combo_3',
    title: 'コンボスターター',
    description: 'コンボ 3 を達成する',
    condition: { type: 'combo', count: 3 },
  },
  {
    id: 'combo_5',
    title: 'コンボマスター',
    description: 'コンボ 5 を達成する',
    condition: { type: 'combo', count: 5 },
  },

  // --- エリア到達系 ---
  {
    id: 'cave_explorer',
    title: '洞窟探検家',
    description: '海底洞窟（cave）エリアに到達する',
    condition: { type: 'area_reached', area: 'cave' },
  },
  {
    id: 'deep_diver',
    title: '超深海ダイバー',
    description: '超深海（ultra_deep）エリアに到達する',
    condition: { type: 'area_reached', area: 'ultra_deep' },
  },
] as const;

// ---------------------------------------------------------------------------
// 通知コールバック型
// ---------------------------------------------------------------------------

/**
 * 実績アンロック時に呼ばれる通知コールバック。
 * GameScene など UI 側がこのコールバックを設定してオーバーレイ表示を行う。
 * Req 16.2: 1 秒以内に通知を表示しなければならない。
 */
export type AchievementNotifyCallback = (achievement: Achievement) => void;

// ---------------------------------------------------------------------------
// AchievementSystem クラス
// ---------------------------------------------------------------------------

/**
 * 実績システム本体。
 * ゲームイベントを受け取り、条件を満たした実績をアンロックして通知する。
 *
 * Requirements: 16.1, 16.2, 16.3, 16.5
 */
export class AchievementSystem {
  /** 全実績リスト（定義 + 状態） */
  achievements: Achievement[];

  /**
   * 実績アンロック時に呼ばれる通知コールバック。
   * Req 16.2: 通知は 1 秒以内に表示されなければならない。
   * UI 側（GameScene など）で設定する。
   */
  private notifyCallback: AchievementNotifyCallback | null = null;

  constructor() {
    // 定義からアンロック状態付きの実績リストを生成する
    this.achievements = ACHIEVEMENT_DEFINITIONS.map(
      (def): Achievement => ({
        ...def,
        unlocked: false,
        unlockedAt: undefined,
      })
    );
  }

  // -------------------------------------------------------------------------
  // 通知コールバックの設定
  // -------------------------------------------------------------------------

  /**
   * 実績アンロック時に呼ばれる通知コールバックを設定する。
   * Req 16.2: このコールバックを通じて 1 秒以内に通知オーバーレイを表示する。
   * コールバック設定のタイムスタンプは UI_TIMING.ACHIEVEMENT_NOTIFICATION_DELAY_MS (1000ms) で定義されている。
   *
   * @param callback 通知コールバック関数
   */
  setNotifyCallback(callback: AchievementNotifyCallback): void {
    this.notifyCallback = callback;
  }

  // -------------------------------------------------------------------------
  // check(event): ゲームイベントを受け取り条件を満たした実績をアンロックする
  // -------------------------------------------------------------------------

  /**
   * ゲームイベントを検査し、条件を満たした未アンロックの実績をすべてアンロックする。
   * アンロックされた実績のリストを返す。
   *
   * Req 16.2: アンロック条件が満たされた時点から 1 秒以内に通知を表示する。
   *
   * @param event 発生したゲームイベント
   * @returns 今回のイベントでアンロックされた実績の配列（0 件の場合は空配列）
   */
  check(event: GameEvent): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements) {
      // すでにアンロック済みはスキップ
      if (achievement.unlocked) continue;

      if (this.isConditionMet(achievement.condition, event)) {
        this.unlock(achievement.id);
        // unlock() 後の最新状態を取得
        const updated = this.achievements.find(a => a.id === achievement.id);
        if (updated && updated.unlocked) {
          newlyUnlocked.push(updated);
        }
      }
    }

    return newlyUnlocked;
  }

  // -------------------------------------------------------------------------
  // unlock(id): 特定の実績をアンロックする
  // -------------------------------------------------------------------------

  /**
   * 指定 ID の実績をアンロックする。
   * すでにアンロック済みの場合は何もしない。
   * アンロック後、通知コールバックが設定されていれば即座に呼び出す。
   * （Req 16.2: 1 秒以内の通知オーバーレイ表示はコールバック先の UI 側責務）
   *
   * @param id アンロックする実績の ID
   */
  unlock(id: string): void {
    const achievement = this.achievements.find(a => a.id === id);
    if (!achievement) return;
    if (achievement.unlocked) return;

    achievement.unlocked = true;
    achievement.unlockedAt = Date.now();

    // Req 16.2: 通知コールバックを呼び出す（1 秒以内に通知を表示するため）
    // コールバックは UI_TIMING.ACHIEVEMENT_NOTIFICATION_DELAY_MS (1000ms) 以内に
    // 通知オーバーレイを表示する責務を持つ
    if (this.notifyCallback !== null) {
      // コールバック内での遅延は UI_TIMING.ACHIEVEMENT_NOTIFICATION_DELAY_MS 以内とする
      this.notifyCallback(achievement);
    }

    // Req 16.3: アンロック後すぐに永続化する
    this.persist();
  }

  // -------------------------------------------------------------------------
  // persist(): StorageManager 経由で実績状態を localStorage に保存する
  // -------------------------------------------------------------------------

  /**
   * 全実績の現在の状態を localStorage に保存する。
   * Req 16.3: ゲームセッションをまたいで実績状態を永続化する。
   */
  persist(): void {
    const record: Record<string, { unlocked: boolean; unlockedAt?: number }> = {};

    for (const achievement of this.achievements) {
      record[achievement.id] = {
        unlocked: achievement.unlocked,
        ...(achievement.unlockedAt !== undefined
          ? { unlockedAt: achievement.unlockedAt }
          : {}),
      };
    }

    StorageManager.saveAchievements(record);
  }

  // -------------------------------------------------------------------------
  // load(): StorageManager 経由で実績状態を localStorage から読み込む
  // -------------------------------------------------------------------------

  /**
   * localStorage から実績の保存データを読み込み、現在の実績リストにマージする。
   * 保存データに存在するが定義に無い ID はスキップする。
   * Req 16.3: ゲームセッションをまたいで実績状態を復元する。
   */
  load(): void {
    const saved = StorageManager.loadAchievements();

    for (const achievement of this.achievements) {
      const savedData = saved[achievement.id];
      if (savedData === undefined) continue;

      if (typeof savedData.unlocked === 'boolean') {
        achievement.unlocked = savedData.unlocked;
      }
      if (typeof savedData.unlockedAt === 'number') {
        achievement.unlockedAt = savedData.unlockedAt;
      }
    }
  }

  // -------------------------------------------------------------------------
  // getAll(): 全実績リストを返す
  // -------------------------------------------------------------------------

  /**
   * 現在の全実績リストのコピーを返す。
   * AchievementScene などでの一覧表示に使用する。
   *
   * @returns 全実績のシャローコピー配列
   */
  getAll(): Achievement[] {
    return [...this.achievements];
  }

  // -------------------------------------------------------------------------
  // private: 条件判定ヘルパー
  // -------------------------------------------------------------------------

  /**
   * ゲームイベントが実績条件を満たすかどうかを判定する。
   *
   * @param condition アンロック条件
   * @param event 発生したゲームイベント
   * @returns 条件を満たす場合 true
   */
  private isConditionMet(
    condition: AchievementCondition,
    event: GameEvent
  ): boolean {
    switch (condition.type) {
      case 'score':
        // score_reached イベントでスコア閾値を超えたかチェック
        return (
          event.type === 'score_reached' && event.score >= condition.threshold
        );

      case 'items_collected':
        // item_collected イベントで累計収集数が閾値に達したかチェック
        return (
          event.type === 'item_collected' &&
          event.totalCollected >= condition.count
        );

      case 'survive_seconds':
        // survived イベントで生存秒数が閾値に達したかチェック
        return (
          event.type === 'survived' && event.seconds >= condition.seconds
        );

      case 'combo':
        // combo_reached イベントでコンボ数が閾値に達したかチェック
        return (
          event.type === 'combo_reached' && event.count >= condition.count
        );

      case 'area_reached':
        // area_reached イベントで指定エリアに到達したかチェック
        return (
          event.type === 'area_reached' && event.area === condition.area
        );

      default:
        return false;
    }
  }
}

// ---------------------------------------------------------------------------
// 通知タイミング定数の再エクスポート（GameScene での参照用）
// ---------------------------------------------------------------------------

/**
 * 実績通知の最大遅延時間 ms（1 秒以内）
 * Req 16.2: アンロック条件が満たされてから 1 秒以内に通知を表示しなければならない
 */
export const ACHIEVEMENT_NOTIFICATION_DELAY_MS =
  UI_TIMING.ACHIEVEMENT_NOTIFICATION_DELAY_MS;

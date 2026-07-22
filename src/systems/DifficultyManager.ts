/**
 * DifficultyManager - 時間経過に応じた難易度調整システム
 *
 * 10秒ごとにスクロール速度を増加、15秒ごとにスポーン間隔を短縮、
 * 20秒ごとにギャップサイズを縮小することで段階的に難易度を上げる。
 * エリアテーマはスコアに基づいて決定される。
 *
 * Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4
 */

import {
  SCROLL,
  DIFFICULTY,
  AREA_THRESHOLDS,
  type AreaTheme,
} from '../config';

// ---------------------------------------------------------------------------
// DifficultyState インターフェース
// ---------------------------------------------------------------------------

export interface DifficultyState {
  /** 経過時間 (ms) */
  elapsedTime: number;
  /** 現在のスクロール速度 (px/s) */
  scrollSpeed: number;
  /** 現在の障害物スポーン間隔 (ms) */
  spawnInterval: number;
  /** 現在のギャップサイズ (px) */
  gapSize: number;
  /** 現在のエリアテーマ */
  currentArea: AreaTheme;
}

// ---------------------------------------------------------------------------
// DifficultyManager クラス
// ---------------------------------------------------------------------------

export class DifficultyManager {
  /** 現在の難易度状態 */
  state: DifficultyState;

  /** 初期スクロール速度 (px/s) - SCROLL.INITIAL_SPEED */
  private readonly initialScrollSpeed: number;
  /** 最大スクロール速度 (px/s) - 初期速度 × MAX_SPEED_MULTIPLIER */
  private readonly maxScrollSpeed: number;
  /** スポーン間隔の下限 (ms) - 初期値 × SPAWN_INTERVAL_MIN_MULTIPLIER */
  private readonly minSpawnInterval: number;

  /**
   * 前回のスピード増加チェック時点での経過時間のステップ数。
   * ステップ関数により「何回増加したか」を追跡する。
   */
  private lastSpeedStep: number;
  /** 前回のスポーン間隔短縮チェック時点でのステップ数 */
  private lastSpawnStep: number;
  /** 前回のギャップ縮小チェック時点でのステップ数 */
  private lastGapStep: number;

  constructor() {
    this.initialScrollSpeed = SCROLL.INITIAL_SPEED;
    this.maxScrollSpeed = SCROLL.INITIAL_SPEED * SCROLL.MAX_SPEED_MULTIPLIER;
    this.minSpawnInterval =
      DIFFICULTY.INITIAL_SPAWN_INTERVAL_MS * DIFFICULTY.SPAWN_INTERVAL_MIN_MULTIPLIER;

    this.lastSpeedStep = 0;
    this.lastSpawnStep = 0;
    this.lastGapStep = 0;

    this.state = {
      elapsedTime: 0,
      scrollSpeed: this.initialScrollSpeed,
      spawnInterval: DIFFICULTY.INITIAL_SPAWN_INTERVAL_MS,
      gapSize: DIFFICULTY.INITIAL_GAP_SIZE_PX,
      currentArea: 'shallow_reef',
    };
  }

  /**
   * フレームごとの更新処理。
   * Phaser の delta (ms 単位) を受け取り、経過時間に基づいて難易度パラメータを調整する。
   *
   * @param delta - 前フレームからの経過時間 (ms)
   */
  update(delta: number): void {
    this.state.elapsedTime += delta;

    const elapsed = this.state.elapsedTime;

    // --- 10秒ごとのスクロール速度増加 (Req 4.2, 4.5) ---
    const speedStep = Math.floor(elapsed / DIFFICULTY.SPEED_INCREASE_INTERVAL_MS);
    if (speedStep > this.lastSpeedStep) {
      const increments = speedStep - this.lastSpeedStep;
      const increment = this.initialScrollSpeed * DIFFICULTY.SPEED_INCREASE_RATE;
      const newSpeed = this.state.scrollSpeed + increments * increment;
      this.state.scrollSpeed = Math.min(newSpeed, this.maxScrollSpeed);
      this.lastSpeedStep = speedStep;
    }

    // --- 15秒ごとのスポーン間隔短縮 (Req 4.3) ---
    const spawnStep = Math.floor(elapsed / DIFFICULTY.SPAWN_INTERVAL_DECREASE_INTERVAL_MS);
    if (spawnStep > this.lastSpawnStep) {
      const decrements = spawnStep - this.lastSpawnStep;
      let newInterval = this.state.spawnInterval;
      for (let i = 0; i < decrements; i++) {
        newInterval *= 1 - DIFFICULTY.SPAWN_INTERVAL_DECREASE_RATE;
      }
      this.state.spawnInterval = Math.max(newInterval, this.minSpawnInterval);
      this.lastSpawnStep = spawnStep;
    }

    // --- 20秒ごとのギャップ縮小 (Req 4.4) ---
    const gapStep = Math.floor(elapsed / DIFFICULTY.GAP_DECREASE_INTERVAL_MS);
    if (gapStep > this.lastGapStep) {
      const decrements = gapStep - this.lastGapStep;
      const newGap = this.state.gapSize - decrements * DIFFICULTY.GAP_DECREASE_AMOUNT_PX;
      this.state.gapSize = Math.max(newGap, DIFFICULTY.GAP_MIN_SIZE_PX);
      this.lastGapStep = gapStep;
    }
  }

  /**
   * 現在のスコアに基づいてエリアテーマを更新し、返す。
   * スコアはゲームシーンから渡される。
   *
   * @param score - 現在のスコア
   * @returns 現在のエリアテーマ
   */
  getCurrentArea(): AreaTheme {
    return this.state.currentArea;
  }

  /**
   * スコアに基づいて対応するエリアテーマを取得する。
   * エリア閾値の降順で評価し、スコアが閾値以上の最初のエリアを返す。
   *
   * @param score - 現在のスコア
   * @returns スコアに対応するエリアテーマ
   */
  getAreaForScore(score: number): AreaTheme {
    const thresholds = this.getAreaThresholds();

    // エリアを閾値の降順でソートして評価
    const areas = Object.entries(thresholds) as [AreaTheme, number][];
    areas.sort((a, b) => b[1] - a[1]);

    for (const [area, threshold] of areas) {
      if (score >= threshold) {
        return area;
      }
    }

    // フォールバック（score < 0 などの異常値でも安全に動作）
    return 'shallow_reef';
  }

  /**
   * エリアスコア閾値マッピングを返す。
   * Requirements 5.1〜5.4 のエリア閾値定義に準拠。
   *
   * @returns AreaTheme → スコア閾値のマッピング
   */
  getAreaThresholds(): Record<AreaTheme, number> {
    return { ...AREA_THRESHOLDS };
  }

  /**
   * スコアに基づいて現在のエリアテーマを更新する。
   * GameScene から毎フレーム（またはスコア変化時）に呼び出す。
   *
   * @param score - 現在のスコア
   */
  updateArea(score: number): void {
    this.state.currentArea = this.getAreaForScore(score);
  }

  /**
   * 全難易度パラメータを初期値にリセットする。
   * ゲームリスタート時（Req 12.7）に呼び出す。
   */
  reset(): void {
    this.lastSpeedStep = 0;
    this.lastSpawnStep = 0;
    this.lastGapStep = 0;

    this.state = {
      elapsedTime: 0,
      scrollSpeed: this.initialScrollSpeed,
      spawnInterval: DIFFICULTY.INITIAL_SPAWN_INTERVAL_MS,
      gapSize: DIFFICULTY.INITIAL_GAP_SIZE_PX,
      currentArea: 'shallow_reef',
    };
  }
}

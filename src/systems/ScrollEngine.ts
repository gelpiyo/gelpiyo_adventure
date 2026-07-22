/**
 * ScrollEngine - ゲームワールドの横スクロール速度を管理する
 *
 * Requirements: 2.3, 4.1, 4.5
 */

import { SCROLL } from '../config';

export interface ScrollEngineConfig {
  /** 初期スクロール速度 px/s (デフォルト: 200) */
  initialSpeed: number;
  /** 最大スクロール速度倍率（初期速度の最大 3 倍） */
  maxSpeedMultiplier: number;
}

const DEFAULT_CONFIG: ScrollEngineConfig = {
  initialSpeed: SCROLL.INITIAL_SPEED,
  maxSpeedMultiplier: SCROLL.MAX_SPEED_MULTIPLIER,
};

export class ScrollEngine {
  /** 現在のスクロール速度 px/s */
  currentSpeed: number;

  private readonly config: ScrollEngineConfig;

  /**
   * applySpeedMultiplier() 呼び出し前の速度を保存するスタック。
   * restoreSpeed() で直前の速度に戻す。
   */
  private speedBeforeMultiplier: number | null = null;

  constructor(config?: Partial<ScrollEngineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentSpeed = this.config.initialSpeed;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * スクロール速度を直接設定する。
   * maxSpeed を超える値はクランプされる。
   */
  setSpeed(speed: number): void {
    this.currentSpeed = Math.min(speed, this.maxSpeed);
  }

  /**
   * パワーアップ（スローモーション等）用の速度倍率を適用する。
   * 呼び出し前の速度を保存し、restoreSpeed() で元に戻せる。
   *
   * @param multiplier 倍率（例: 0.5 で 50% 減速）
   */
  applySpeedMultiplier(multiplier: number): void {
    this.speedBeforeMultiplier = this.currentSpeed;
    this.currentSpeed = this.currentSpeed * multiplier;
  }

  /**
   * applySpeedMultiplier() 適用前の速度に戻す。
   * applySpeedMultiplier() を呼んでいない場合は何もしない。
   */
  restoreSpeed(): void {
    if (this.speedBeforeMultiplier !== null) {
      this.currentSpeed = this.speedBeforeMultiplier;
      this.speedBeforeMultiplier = null;
    }
  }

  /**
   * フレームごとの更新処理。
   * Phaser 統合時に ScrollEngine 自身がスクロールオフセットを管理する場合に使用する。
   * 現在の実装では delta を受け取るインターフェースを提供する（拡張用）。
   *
   * @param delta フレーム経過時間（秒）
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_delta: number): void {
    // スクロールオフセットの実際の更新は BackgroundRenderer / ObstacleGenerator 側で
    // currentSpeed を参照して行う。このメソッドは将来の拡張用に予約している。
  }

  /**
   * 設定された最大スクロール速度 (px/s)。
   * initialSpeed * maxSpeedMultiplier で算出される。
   */
  get maxSpeed(): number {
    return this.config.initialSpeed * this.config.maxSpeedMultiplier;
  }
}

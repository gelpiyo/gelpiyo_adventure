/**
 * PowerUpSystem - パワーアップの発動・管理・期限切れ処理を担う
 *
 * Requirements: 11.1, 11.2, 11.3, 11.5, 11.6
 */

import { POWERUP_CONFIGS, type PowerUpType } from '../config';
import type { ActivePowerUp } from '../models/PowerUp';
import type { ScrollEngine } from './ScrollEngine';

export class PowerUpSystem {
  /** 現在発動中のパワーアップ一覧 */
  activePowerUps: ActivePowerUp[] = [];

  private readonly scrollEngine: ScrollEngine;

  /** 各パワーアップタイプの持続時間（ms） */
  private static readonly DURATIONS: Record<PowerUpType, number> = {
    bubble_shield: POWERUP_CONFIGS.BUBBLE_SHIELD_DURATION_MS,
    slow_motion: POWERUP_CONFIGS.SLOW_MOTION_DURATION_MS,
    magnet: POWERUP_CONFIGS.MAGNET_DURATION_MS,
  };

  constructor(scrollEngine: ScrollEngine) {
    this.scrollEngine = scrollEngine;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * パワーアップを発動する。
   * 同じタイプがすでにアクティブな場合は残り時間をリセットする（再発動扱い）。
   * slow_motion を発動する場合は ScrollEngine に速度倍率を適用する。
   *
   * Req 11.1: bubble_shield 5 秒間の無敵効果
   * Req 11.2: slow_motion 5 秒間のスクロール 50% 減速
   * Req 11.3: magnet 8 秒間の 200px 引き寄せ
   */
  activate(type: PowerUpType): void {
    // 同タイプが既にアクティブなら一度解除してから再発動する
    if (this.isActive(type)) {
      this._expire(type, /* restoreEffects= */ true);
    }

    const duration = PowerUpSystem.DURATIONS[type];
    const entry: ActivePowerUp = {
      type,
      remainingDuration: duration,
      startedAt: Date.now(),
    };
    this.activePowerUps.push(entry);

    // 発動時の副作用
    if (type === 'slow_motion') {
      this.scrollEngine.applySpeedMultiplier(POWERUP_CONFIGS.SLOW_MOTION_SPEED_MULTIPLIER);
    }
  }

  /**
   * フレームごとの更新処理。
   * 残り時間を減算し、期限切れのパワーアップをすべて解除する。
   *
   * @param delta フレーム経過時間（ms）
   *
   * Req 11.5: 期限切れ時に変更されたパラメータを元の値に戻す
   */
  update(delta: number): void {
    // 期限切れ判定のために先に残り時間を減算する
    for (const pu of this.activePowerUps) {
      pu.remainingDuration -= delta;
    }

    // 期限切れのタイプを収集して解除する
    const expired = this.activePowerUps
      .filter(pu => pu.remainingDuration <= 0)
      .map(pu => pu.type);

    for (const type of expired) {
      this._expire(type, /* restoreEffects= */ true);
    }
  }

  /**
   * 指定タイプのパワーアップが現在アクティブかどうかを返す。
   *
   * Req 11.6: 複数パワーアップの独立管理
   */
  isActive(type: PowerUpType): boolean {
    return this.activePowerUps.some(pu => pu.type === type);
  }

  /**
   * 指定タイプのパワーアップを即座に解除する。
   *
   * Req 11.5: 解除時にパラメータを元の値に戻す
   */
  deactivate(type: PowerUpType): void {
    this._expire(type, /* restoreEffects= */ true);
  }

  /**
   * 指定タイプの残り持続時間を返す（ms）。
   * アクティブでない場合は 0 を返す。
   */
  getRemainingDuration(type: PowerUpType): number {
    const entry = this.activePowerUps.find(pu => pu.type === type);
    if (!entry) return 0;
    return Math.max(0, entry.remainingDuration);
  }

  /**
   * 現在アクティブなパワーアップタイプの一覧を返す。
   * GameScene の resetGame でアクティブパワーアップをすべて解除する際に使用する。
   */
  getActiveTypes(): PowerUpType[] {
    return this.activePowerUps.map(pu => pu.type);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * パワーアップを内部リストから削除し、必要に応じて副作用を元に戻す。
   *
   * @param type        解除するパワーアップタイプ
   * @param restoreEffects  true の場合、副作用（速度変更など）を戻す
   */
  private _expire(type: PowerUpType, restoreEffects: boolean): void {
    const index = this.activePowerUps.findIndex(pu => pu.type === type);
    if (index === -1) return;

    this.activePowerUps.splice(index, 1);

    if (restoreEffects) {
      // slow_motion 期限切れ: ScrollEngine の速度を元に戻す (Req 11.5)
      if (type === 'slow_motion') {
        this.scrollEngine.restoreSpeed();
      }
      // bubble_shield 期限切れ: Player.hasBubbleShield は GameScene が管理するため何もしない
    }
  }
}

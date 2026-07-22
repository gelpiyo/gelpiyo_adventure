/**
 * ゲルぴよ深海大冒険 - 物理エンジン
 *
 * Euler 積分による垂直運動の計算・境界クランプ・ジャンプインパルス付与を担当する。
 * キャラクター変更時は loadCharacterPhysics() を呼び出すことでパラメータを切り替えられる。
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 */

import { clamp } from '../utils/MathUtils';
import type { Player } from '../models/Player';
import type { CharacterConfig } from '../models/Character';
import { PHYSICS_DEFAULTS, SCREEN } from '../config';

/**
 * PhysicsEngine の設定パラメータ
 */
export interface PhysicsEngineConfig {
  /** 重力加速度 px/s²（下向き正） */
  gravity: number;
  /** ジャンプインパルス px/s（上向き負） */
  jumpImpulse: number;
  /** 最大落下速度 px/s */
  maxFallSpeed: number;
  /** 最大上昇速度 px/s（負値） */
  maxRiseSpeed: number;
  /** 上端境界 Y 座標 px */
  boundsTop: number;
  /** 下端境界 Y 座標 px */
  boundsBottom: number;
}

/**
 * プレイヤーの垂直運動を管理する物理エンジン。
 *
 * - Euler 積分で速度・位置を更新する
 * - 上下の境界にクランプする
 * - キャラクターごとに物理パラメータを切り替えられる
 */
export class PhysicsEngine {
  private config: PhysicsEngineConfig;

  /**
   * @param boundsTop    上端境界 Y 座標（デフォルト: 0）
   * @param boundsBottom 下端境界 Y 座標（デフォルト: SCREEN.HEIGHT）
   */
  constructor(
    boundsTop: number = 0,
    boundsBottom: number = SCREEN.HEIGHT,
  ) {
    this.config = {
      gravity: PHYSICS_DEFAULTS.GRAVITY,
      jumpImpulse: PHYSICS_DEFAULTS.JUMP_IMPULSE,
      maxFallSpeed: PHYSICS_DEFAULTS.MAX_FALL_SPEED,
      maxRiseSpeed: PHYSICS_DEFAULTS.MAX_RISE_SPEED,
      boundsTop,
      boundsBottom,
    };
  }

  /**
   * キャラクター変更時に物理パラメータを切り替える。
   *
   * boundsTop / boundsBottom は変更しない（フィールド境界はゲーム側で管理）。
   *
   * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
   *
   * @param character 選択されたキャラクター設定
   */
  loadCharacterPhysics(character: CharacterConfig): void {
    this.config = {
      ...this.config,
      gravity: character.physics.gravity,
      jumpImpulse: character.physics.jumpImpulse,
      maxFallSpeed: character.physics.maxFallSpeed,
      maxRiseSpeed: character.physics.maxRiseSpeed,
    };
  }

  /**
   * Euler 積分による 1 フレーム分の物理更新。
   *
   * アルゴリズム:
   *   velocity_y += gravity * delta
   *   velocity_y = clamp(velocity_y, maxRiseSpeed, maxFallSpeed)
   *   position_y += velocity_y * delta
   *   position_y = clamp(position_y, boundsTop, boundsBottom)
   *
   * Requirements: 3.1, 3.2, 3.3, 3.4
   *
   * @param player プレイヤー状態（直接変更する）
   * @param delta  経過時間（秒）
   */
  update(player: Player, delta: number): void {
    // 重力加速
    player.velocityY += this.config.gravity * delta;

    // 速度クランプ（上昇速度・落下速度の上限）
    player.velocityY = clamp(
      player.velocityY,
      this.config.maxRiseSpeed,
      this.config.maxFallSpeed,
    );

    // 位置更新
    player.y += player.velocityY * delta;

    // 位置クランプ（境界内に収める）
    player.y = clamp(player.y, this.config.boundsTop, this.config.boundsBottom);
  }

  /**
   * プレイヤーにジャンプインパルスを付与する。
   *
   * velocityY を jumpImpulse（負値）で上書きすることで即座に上向き速度を与える。
   *
   * Requirements: 3.1
   *
   * @param player プレイヤー状態（直接変更する）
   */
  applyJump(player: Player): void {
    player.velocityY = this.config.jumpImpulse;
  }

  /**
   * プレイヤーの Y 座標を境界内にクランプする。
   *
   * update() 内でも clamp は行われるが、外部から強制的に境界補正が必要な場合に使用する。
   *
   * Requirements: 3.2, 3.3, 3.4
   *
   * @param player プレイヤー状態（直接変更する）
   */
  clampToBounds(player: Player): void {
    player.y = clamp(player.y, this.config.boundsTop, this.config.boundsBottom);
  }

  /**
   * プレイヤーが上端境界に達しているかどうかを返す。
   *
   * Requirements: 3.2
   *
   * @param player プレイヤー状態
   * @returns Y 座標が boundsTop と等しい場合 true
   */
  isAtTopBound(player: Player): boolean {
    return player.y <= this.config.boundsTop;
  }

  /**
   * プレイヤーが下端境界に達しているかどうかを返す。
   *
   * Requirements: 3.3
   *
   * @param player プレイヤー状態
   * @returns Y 座標が boundsBottom と等しい場合 true
   */
  isAtBottomBound(player: Player): boolean {
    return player.y >= this.config.boundsBottom;
  }

  /**
   * 現在の物理設定を返す（テスト・デバッグ用）。
   */
  getConfig(): Readonly<PhysicsEngineConfig> {
    return { ...this.config };
  }
}

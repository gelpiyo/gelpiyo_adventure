/**
 * 障害物生成・管理システム
 *
 * 5 種類の障害物（cave_wall, jellyfish, squid, seaweed, current_zone）の
 * スポーン・更新・オフスクリーン削除を担う純粋 TypeScript クラス。
 * Phaser に依存せず、単体テスト可能な設計にする。
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import type { Obstacle, ObstacleType } from '../models/Obstacle';
import type { Player } from '../models/Player';
import { clamp } from '../utils/MathUtils';
import { OBSTACLE, SCREEN } from '../config';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/**
 * 障害物スポーン設定
 */
export interface ObstacleSpawnConfig {
  /** 障害物の種類 */
  type: ObstacleType;
  /** X 座標 (px) */
  x: number;
  /** Y 座標 (px)。cave_wall の場合は使用されず gapY で位置決めされる */
  y: number;
  /** cave_wall 用: ギャップサイズ (px) */
  gapSize?: number;
  /** jellyfish / seaweed 用: sin 波の振幅 (px) */
  amplitude?: number;
  /** jellyfish / seaweed 用: 振動周波数 (Hz) */
  frequency?: number;
  /** current_zone 用: プレイヤーへの横方向の押し力 (px/s) */
  pushForce?: number;
}

// ---------------------------------------------------------------------------
// 内部定数
// ---------------------------------------------------------------------------

/** 各障害物タイプのデフォルト幅 (px) */
const DEFAULT_WIDTHS: Record<ObstacleType, number> = {
  cave_wall:    60,
  jellyfish:    50,
  squid:        70,
  seaweed:      30,
  current_zone: 120,
};

/** 各障害物タイプのデフォルト高さ (px)（cave_wall はキャンバス全高） */
const DEFAULT_HEIGHTS: Record<ObstacleType, number> = {
  cave_wall:    SCREEN.HEIGHT,   // 上下壁を合わせた論理高さ
  jellyfish:    50,
  squid:        60,
  seaweed:      100,
  current_zone: SCREEN.HEIGHT,  // フルハイト半透明ゾーン
};

/** squid の速度倍率（スクロール速度 × この値） */
const SQUID_SPEED_MULTIPLIER = 1.5;

/** jellyfish / seaweed のデフォルト振幅 (px) */
const DEFAULT_AMPLITUDE = 40;
/** jellyfish / seaweed のデフォルト周波数 (Hz) */
const DEFAULT_FREQUENCY = 0.5;

/** current_zone のデフォルト押し力 (px/s) */
const DEFAULT_PUSH_FORCE = 150;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/** 一意 ID を生成する */
let _idCounter = 0;
function generateId(): string {
  return `obstacle_${++_idCounter}_${Date.now()}`;
}

// ---------------------------------------------------------------------------
// nextGapY アルゴリズム（設計書 Key Algorithms §3）
// ---------------------------------------------------------------------------

/**
 * 次の cave_wall ギャップ Y 位置を算出する。
 *
 * 前回のギャップ位置から最大 `canvasH * 0.3`（30%）の変動を許可し、
 * マージン内に収まるようにクランプする。
 *
 * @param prevGapY - 前回のギャップ中央 Y 座標 (px)
 * @param canvasH  - キャンバス高さ (px)
 * @param gapSize  - ギャップの幅 (px)
 * @returns 次のギャップ中央 Y 座標 (px)
 *
 * Requirements: 7.1
 */
export function nextGapY(prevGapY: number, canvasH: number, gapSize: number): number {
  const margin = gapSize;
  const minY = margin;
  const maxY = canvasH - margin;
  const maxDelta = canvasH * OBSTACLE.GAP_MAX_DELTA_RATIO;
  const target = prevGapY + (Math.random() * 2 - 1) * maxDelta;
  return clamp(target, minY, maxY);
}

// ---------------------------------------------------------------------------
// ObstacleGenerator クラス
// ---------------------------------------------------------------------------

/**
 * 障害物生成・管理クラス。
 *
 * - スポーン間隔に応じて新しい障害物を生成する
 * - 毎フレーム `update(delta)` を呼び出すことで位置を更新する
 * - `removeOffscreen()` でキャンバス左端を超えた障害物を除去する
 * - `applyCurrentZone(player)` で current_zone 内のプレイヤーに pushForce を加算する
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export class ObstacleGenerator {
  /** キャンバス幅 (px) */
  private readonly canvasWidth: number;
  /** キャンバス高さ (px) */
  private readonly canvasHeight: number;

  /** 現在アクティブな障害物リスト */
  private obstacles: Obstacle[] = [];

  /** スクロール速度 (px/s)。cave_wall / seaweed / current_zone の横移動に使用 */
  private scrollSpeed: number = 200;

  /** スポーン間隔 (ms) */
  private spawnIntervalMs: number = 2000;

  /** 前回スポーンから経過した時間 (ms) */
  private spawnTimer: number = 0;

  /** 前回の cave_wall ギャップ Y 座標 (px) */
  private lastGapY: number;

  /** 前回の cave_wall ギャップサイズ (px) */
  private lastGapSize: number = 250;

  // sin 波の累積時間 (s)。jellyfish / seaweed の位相計算に使用
  private elapsedSeconds: number = 0;

  constructor(canvasWidth: number = SCREEN.WIDTH, canvasHeight: number = SCREEN.HEIGHT) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    // 初期ギャップをキャンバス中央に設定
    this.lastGapY = canvasHeight / 2;
  }

  // -------------------------------------------------------------------------
  // 公開 API
  // -------------------------------------------------------------------------

  /**
   * 外部（DifficultyManager など）からスクロール速度を設定する。
   *
   * @param speed - スクロール速度 (px/s)
   */
  setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
  }

  /**
   * 障害物スポーン間隔を設定する。
   *
   * @param ms - スポーン間隔 (ms)
   */
  setSpawnInterval(ms: number): void {
    this.spawnIntervalMs = ms;
  }

  /**
   * アクティブな障害物リストを返す（読み取り専用コピー）。
   */
  getActiveObstacles(): Obstacle[] {
    return this.obstacles.slice();
  }

  /**
   * 指定設定で障害物を即座にスポーンし、リストに追加して返す。
   *
   * cave_wall の場合は自動的に nextGapY() でギャップ位置を決定する。
   *
   * @param config - スポーン設定
   * @returns 生成した Obstacle オブジェクト
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  spawnObstacle(config: ObstacleSpawnConfig): Obstacle {
    const obstacle = this._createObstacle(config);
    this.obstacles.push(obstacle);
    return obstacle;
  }

  /**
   * 毎フレーム呼び出す更新処理。
   *
   * - 障害物の位置を delta に応じて更新する
   * - スポーンタイマーを進め、スポーン間隔に達したら新しい cave_wall をスポーンする
   *
   * @param delta - 経過時間 (s)
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
   */
  update(delta: number): void {
    this.elapsedSeconds += delta;

    // 障害物の位置更新
    for (const obstacle of this.obstacles) {
      this._updateObstacle(obstacle, delta);
    }

    // スポーンタイマー更新
    this.spawnTimer += delta * 1000; // ms に変換
    if (this.spawnTimer >= this.spawnIntervalMs) {
      this.spawnTimer -= this.spawnIntervalMs;
      this._autoSpawn();
    }
  }

  /**
   * キャンバス左端の外（x < 0 - obstacle.width）に出た障害物を削除する。
   *
   * Requirements: 7.6
   */
  removeOffscreen(): void {
    this.obstacles = this.obstacles.filter(
      (obs) => obs.x > -obs.width,
    );
  }

  /**
   * current_zone 内にいるプレイヤーの velocityX 相当の値に pushForce を加算する。
   *
   * プレイヤーモデルには velocityX がないため、呼び出し元が返り値の push 量を
   * X 速度に加算する設計とする（純粋関数的インターフェース）。
   *
   * @param player - 現在のプレイヤー状態
   * @returns プレイヤーに加算すべき X 方向の押し力合計 (px/s)
   *
   * Requirements: 7.5
   */
  applyCurrentZone(player: Player): number {
    let totalPush = 0;

    for (const obs of this.obstacles) {
      if (obs.type !== 'current_zone') continue;
      if (obs.pushForce === undefined) continue;

      // プレイヤーの円ヒットボックスが current_zone の AABB と重なるか判定
      const playerLeft = player.x - player.radius;
      const playerRight = player.x + player.radius;
      const playerTop = player.y - player.radius;
      const playerBottom = player.y + player.radius;

      const obsRight = obs.x + obs.width;
      const obsBottom = obs.y + obs.height;

      const overlapX = playerLeft < obsRight && playerRight > obs.x;
      const overlapY = playerTop < obsBottom && playerBottom > obs.y;

      if (overlapX && overlapY) {
        totalPush += obs.pushForce;
      }
    }

    return totalPush;
  }

  // -------------------------------------------------------------------------
  // 内部実装
  // -------------------------------------------------------------------------

  /**
   * ObstacleSpawnConfig から Obstacle オブジェクトを生成する。
   */
  private _createObstacle(config: ObstacleSpawnConfig): Obstacle {
    const { type, x, y } = config;
    const width = DEFAULT_WIDTHS[type];
    const height = DEFAULT_HEIGHTS[type];
    const id = generateId();

    switch (type) {
      case 'cave_wall': {
        const gapSize = config.gapSize ?? this.lastGapSize;
        const gapY = nextGapY(this.lastGapY, this.canvasHeight, gapSize);
        this.lastGapY = gapY;
        this.lastGapSize = gapSize;

        const obstacle: Obstacle = {
          id,
          type: 'cave_wall',
          x,
          y: 0,
          width,
          height,
          gapY,
          gapSize,
          scored: false,
        };
        return obstacle;
      }

      case 'jellyfish': {
        const amplitude = config.amplitude ?? DEFAULT_AMPLITUDE;
        const frequency = config.frequency ?? DEFAULT_FREQUENCY;
        // phase = 0 でスポーン → sin(0) = 0 なので y がそのまま基底 Y になる
        const obstacle: Obstacle = {
          id,
          type: 'jellyfish',
          x,
          y,
          width,
          height,
          amplitude,
          frequency,
          phase: 0,
          scored: false,
        };
        return obstacle;
      }

      case 'squid': {
        const obstacle: Obstacle = {
          id,
          type: 'squid',
          x,
          y,
          width,
          height,
          scored: false,
        };
        return obstacle;
      }

      case 'seaweed': {
        const amplitude = config.amplitude ?? DEFAULT_AMPLITUDE;
        const frequency = config.frequency ?? DEFAULT_FREQUENCY;
        // phase = 0 でスポーン。rotation = amplitude * sin(phase) をレンダラーが使用する
        const obstacle: Obstacle = {
          id,
          type: 'seaweed',
          x,
          y,
          width,
          height,
          amplitude,
          frequency,
          phase: 0,
          scored: false,
        };
        return obstacle;
      }

      case 'current_zone': {
        const pushForce = config.pushForce ?? DEFAULT_PUSH_FORCE;
        const obstacle: Obstacle = {
          id,
          type: 'current_zone',
          x,
          y: 0,
          width,
          height,
          pushForce,
          scored: false,
        };
        return obstacle;
      }
    }
  }

  /**
   * 1 フレーム分の障害物位置更新。
   *
   * | タイプ       | 移動パターン                                              |
   * |--------------|-----------------------------------------------------------|
   * | cave_wall    | x -= scrollSpeed * delta（左へ一定速度）                  |
   * | jellyfish    | x -= scrollSpeed * delta; y = baseY + A * sin(ωt + phase)|
   * | squid        | x -= scrollSpeed * SQUID_SPEED_MULTIPLIER * delta         |
   * | seaweed      | x -= scrollSpeed * delta; rotation は呼び出し元で使用可  |
   * | current_zone | x -= scrollSpeed * delta                                  |
   */
  private _updateObstacle(obstacle: Obstacle, delta: number): void {
    switch (obstacle.type) {
      case 'cave_wall':
        obstacle.x -= this.scrollSpeed * delta;
        break;

      case 'jellyfish': {
        obstacle.x -= this.scrollSpeed * delta;
        if (
          obstacle.amplitude !== undefined &&
          obstacle.frequency !== undefined &&
          obstacle.phase !== undefined
        ) {
          // phase を累積させ、sin(phase) を基底 Y からのオフセットとして使用する。
          // obstacle.y には baseY + A * sin(phase) の絶対座標が入る。
          // 前フレームのオフセットを引いて baseY を復元し、新フレームのオフセットを加算する。
          const omega = 2 * Math.PI * obstacle.frequency;
          const prevOffset = obstacle.amplitude * Math.sin(obstacle.phase);
          obstacle.phase += omega * delta;
          const nextOffset = obstacle.amplitude * Math.sin(obstacle.phase);
          obstacle.y = obstacle.y - prevOffset + nextOffset;
        }
        break;
      }

      case 'squid':
        obstacle.x -= this.scrollSpeed * SQUID_SPEED_MULTIPLIER * delta;
        break;

      case 'seaweed':
        // seaweed は X はスクロールに乗る。rotation は `phase` フィールドで管理
        obstacle.x -= this.scrollSpeed * delta;
        if (obstacle.frequency !== undefined && obstacle.phase !== undefined) {
          const omega = 2 * Math.PI * obstacle.frequency;
          obstacle.phase = (obstacle.phase ?? 0) + omega * delta;
          // rotation = amplitude * sin(phase) を呼び出し元（レンダラー）が参照する
        }
        break;

      case 'current_zone':
        obstacle.x -= this.scrollSpeed * delta;
        break;
    }
  }

  /**
   * スポーンタイマーが満了した際の自動スポーン処理。
   * デフォルトでは cave_wall を生成する。
   *
   * 実際のゲームでは DifficultyManager やエリアテーマに応じて
   * GameScene からより細かく制御するが、ObstacleGenerator 単体でも
   * 動作するようにフォールバックとして cave_wall を生成する。
   */
  private _autoSpawn(): void {
    const spawnX = this.canvasWidth + OBSTACLE.SPAWN_OFFSET_PX;
    this.spawnObstacle({
      type: 'cave_wall',
      x: spawnX,
      y: 0,
      gapSize: this.lastGapSize,
    });
  }
}

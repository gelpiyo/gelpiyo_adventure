/**
 * ゲルぴよ深海大冒険 - ゲーム全体の設定定数
 *
 * このファイルはゲーム全体で使用する定数を一元管理します。
 * Requirements: 3.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 22.1, 22.2, 22.3, 22.4
 */

// ---------------------------------------------------------------------------
// 画面サイズ (Req 14.1 — スマートフォン縦向き 9:16)
// ---------------------------------------------------------------------------

export const SCREEN = {
  WIDTH: 450,
  HEIGHT: 800,
} as const;

// ---------------------------------------------------------------------------
// 物理パラメータ（デフォルト = Gelpiyo 標準値）(Req 3.1, 22.1)
// ---------------------------------------------------------------------------

export const PHYSICS_DEFAULTS = {
  /** 重力加速度 px/s²（下向き正） */
  GRAVITY: 800,
  /** ジャンプインパルス px/s（上向き負） */
  JUMP_IMPULSE: -400,
  /** 最大落下速度 px/s */
  MAX_FALL_SPEED: 600,
  /** 最大上昇速度 px/s（負値） */
  MAX_RISE_SPEED: -500,
  /** プレイヤーのヒットボックス半径（視覚サイズより 20% 小さく設定） */
  PLAYER_RADIUS: 20,
} as const;

// ---------------------------------------------------------------------------
// スクロール速度 (Req 4.1, 4.5)
// ---------------------------------------------------------------------------

export const SCROLL = {
  /** 初期スクロール速度 px/s */
  INITIAL_SPEED: 200,
  /** 最大スクロール速度倍率（初期速度の 3 倍が上限） */
  MAX_SPEED_MULTIPLIER: 3.0,
} as const;

// ---------------------------------------------------------------------------
// 難易度調整スケジュール (Req 4.2, 4.3, 4.4, 4.5)
// ---------------------------------------------------------------------------

export const DIFFICULTY = {
  /** スクロール速度を増加させる間隔 ms（10 秒ごと） */
  SPEED_INCREASE_INTERVAL_MS: 10_000,
  /** 速度増加量（初期速度 × 0.05） */
  SPEED_INCREASE_RATE: 0.05,

  /** スポーン間隔を短縮する間隔 ms（15 秒ごと） */
  SPAWN_INTERVAL_DECREASE_INTERVAL_MS: 15_000,
  /** スポーン間隔の短縮割合（10% 削減） */
  SPAWN_INTERVAL_DECREASE_RATE: 0.10,
  /** スポーン間隔の下限（初期値の 40%） */
  SPAWN_INTERVAL_MIN_MULTIPLIER: 0.40,

  /** ギャップサイズを縮小する間隔 ms（20 秒ごと） */
  GAP_DECREASE_INTERVAL_MS: 20_000,
  /** ギャップサイズの縮小量 px（1 ステップあたり 10px） */
  GAP_DECREASE_AMOUNT_PX: 10,
  /** ギャップサイズの最小値 px（縦450px幅に対応して調整） */
  GAP_MIN_SIZE_PX: 120,

  /** 障害物スポーンの初期間隔 ms */
  INITIAL_SPAWN_INTERVAL_MS: 2_000,
  /** 障害物の初期ギャップサイズ px（縦450px幅に合わせ調整） */
  INITIAL_GAP_SIZE_PX: 200,
} as const;

// ---------------------------------------------------------------------------
// エリアスコア閾値 (Req 5.1, 5.2, 5.3, 5.4)
// ---------------------------------------------------------------------------

export type AreaTheme = 'shallow_reef' | 'cave' | 'sunken_ship' | 'deep_ruins' | 'ultra_deep';

export const AREA_THRESHOLDS: Record<AreaTheme, number> = {
  shallow_reef: 0,
  cave: 15,
  sunken_ship: 30,
  deep_ruins: 50,
  ultra_deep: 75,
} as const;

// ---------------------------------------------------------------------------
// キャラクター種別
// ---------------------------------------------------------------------------

export type CharacterType = 'gelpiyo' | 'momopliyo' | 'palpiyo' | 'midoripiyo';

// ---------------------------------------------------------------------------
// キャラクター物理パラメータ
// ---------------------------------------------------------------------------

export interface CharacterPhysics {
  /** ジャンプインパルス px/s（上向き負） */
  jumpImpulse: number;
  /** 重力加速度 px/s²（下向き正） */
  gravity: number;
  /** 最大落下速度 px/s */
  maxFallSpeed: number;
  /** 最大上昇速度 px/s（負値） */
  maxRiseSpeed: number;
}

// ---------------------------------------------------------------------------
// キャラクター設定インターフェース
// ---------------------------------------------------------------------------

export interface CharacterConfig {
  id: CharacterType;
  /** 表示名（日本語） */
  nameJa: string;
  /** キャラクター説明 */
  description: string;
  /** 難易度表示ラベル */
  difficultyLabel: string;
  /** 代表カラー (hex) */
  color: string;
  /** 物理パラメータ */
  physics: CharacterPhysics;
}

// ---------------------------------------------------------------------------
// CHARACTER_CONFIGS テーブル (Req 22.1, 22.2, 22.3, 22.4)
// ---------------------------------------------------------------------------

export const CHARACTER_CONFIGS: Record<CharacterType, CharacterConfig> = {
  /**
   * ゲルぴよ（標準キャラ）
   * Req 22.1: jumpImpulse=-400, gravity=800, maxFallSpeed=600, maxRiseSpeed=-500
   */
  gelpiyo: {
    id: 'gelpiyo',
    nameJa: 'ゲルぴよ',
    description: 'バランスの取れたノーマルキャラ',
    difficultyLabel: 'バランス型',
    color: '#7EC8E3',
    physics: {
      jumpImpulse: -400,
      gravity: 800,
      maxFallSpeed: 600,
      maxRiseSpeed: -500,
    },
  },

  /**
   * ももぴよ（中級キャラ）
   * Req 22.2: jumpImpulse=-450, gravity=850, maxFallSpeed=650, maxRiseSpeed=-550
   */
  momopliyo: {
    id: 'momopliyo',
    nameJa: 'ももぴよ',
    description: 'ふんわり跳ねる愛らしいキャラ',
    difficultyLabel: '中級',
    color: '#FFB7C5',
    physics: {
      jumpImpulse: -450,
      gravity: 850,
      maxFallSpeed: 650,
      maxRiseSpeed: -550,
    },
  },

  /**
   * パルぴよ（上級・俊敏キャラ）
   * Req 22.3: jumpImpulse=-500, gravity=900, maxFallSpeed=700, maxRiseSpeed=-600
   */
  palpiyo: {
    id: 'palpiyo',
    nameJa: 'パルぴよ',
    description: '俊敏で素早い上級者向けキャラ',
    difficultyLabel: '上級・俊敏',
    color: '#A0D8EF',
    physics: {
      jumpImpulse: -500,
      gravity: 900,
      maxFallSpeed: 700,
      maxRiseSpeed: -600,
    },
  },

  /**
   * みどりぴよ（細かい操作向けキャラ）
   * Req 22.4: jumpImpulse=-320, gravity=650, maxFallSpeed=500, maxRiseSpeed=-400
   */
  midoripiyo: {
    id: 'midoripiyo',
    nameJa: 'みどりぴよ',
    description: '細かい操作ができるゆっくりキャラ',
    difficultyLabel: '細かい操作',
    color: '#B5EAD7',
    physics: {
      jumpImpulse: -320,
      gravity: 650,
      maxFallSpeed: 500,
      maxRiseSpeed: -400,
    },
  },
} as const;

// ---------------------------------------------------------------------------
// アイテム種別
// ---------------------------------------------------------------------------

export type ItemType =
  | 'golden_egg'    // 金の卵（ゲルぴよ特別アイテム）+50pt レア
  | 'pearl'         // 真珠 +10pt 高頻度
  | 'treasure_jar'  // 宝の壺 +30pt 中頻度
  | 'glowing_jelly' // 光るクラゲ +20pt + 一時無敵2秒
  | 'gold_coin'     // 金貨袋 +25pt 中頻度
  | 'deep_fish'     // 深海魚 +15pt 中頻度
  | 'starfish'      // スターフィッシュ スコア2倍5秒 レア
  | 'time_capsule'  // タイムカプセル スロー5秒 レア
  | 'bubble_shield'; // 泡シールド 衝突1回無効 中頻度

// ---------------------------------------------------------------------------
// アイテム設定インターフェース
// ---------------------------------------------------------------------------

export interface ItemConfig {
  type: ItemType;
  /** 収集時の加算ポイント（効果のみのアイテムは 0） */
  points: number;
  /** スポーン相対確率ウェイト（数値が大きいほど出やすい） */
  spawnWeight: number;
  /** 特殊効果の種類（なければ undefined） */
  effect?: 'invincible' | 'score_double' | 'slow' | 'shield';
  /** 特殊効果の持続時間 ms */
  effectDurationMs?: number;
}

// ---------------------------------------------------------------------------
// ITEM_CONFIGS テーブル
// ---------------------------------------------------------------------------

export const ITEM_CONFIGS: Record<ItemType, ItemConfig> = {
  /** 金の卵：ゲルぴよ特別アイテム。+50pt。超レア */
  golden_egg: {
    type: 'golden_egg',
    points: 50,
    spawnWeight: 3,
  },
  /** 真珠：最も出やすいベーシックアイテム。+10pt */
  pearl: {
    type: 'pearl',
    points: 10,
    spawnWeight: 40,
  },
  /** 宝の壺：沈没船から流れ出た古い壺。+30pt */
  treasure_jar: {
    type: 'treasure_jar',
    points: 30,
    spawnWeight: 15,
  },
  /** 光るクラゲ：取ると一時的に無敵（2秒）。+20pt */
  glowing_jelly: {
    type: 'glowing_jelly',
    points: 20,
    spawnWeight: 12,
    effect: 'invincible',
    effectDurationMs: 2_000,
  },
  /** 金貨袋：沈没船の財宝。+25pt */
  gold_coin: {
    type: 'gold_coin',
    points: 25,
    spawnWeight: 18,
  },
  /** 深海魚：ちょうちんあんこう。+15pt */
  deep_fish: {
    type: 'deep_fish',
    points: 15,
    spawnWeight: 25,
  },
  /** スターフィッシュ：赤いヒトデ。5秒間スコア2倍 */
  starfish: {
    type: 'starfish',
    points: 0,
    spawnWeight: 5,
    effect: 'score_double',
    effectDurationMs: 5_000,
  },
  /** タイムカプセル：古い時計。5秒間スクロール減速 */
  time_capsule: {
    type: 'time_capsule',
    points: 0,
    spawnWeight: 5,
    effect: 'slow',
    effectDurationMs: 5_000,
  },
  /** 泡シールド：大きな泡。次の衝突1回を無効化 */
  bubble_shield: {
    type: 'bubble_shield',
    points: 0,
    spawnWeight: 10,
    effect: 'shield',
  },
} as const;

// ---------------------------------------------------------------------------
// パワーアップ設定 (Req 11.1, 11.2, 11.3)
// ---------------------------------------------------------------------------

export type PowerUpType = 'bubble_shield' | 'slow_motion' | 'magnet';

export const POWERUP_CONFIGS = {
  /** バブルシールド: 無敵持続時間 ms */
  BUBBLE_SHIELD_DURATION_MS: 5_000,
  /** スローモーション: 持続時間 ms */
  SLOW_MOTION_DURATION_MS: 5_000,
  /** スローモーション: スクロール速度倍率（50% 減速） */
  SLOW_MOTION_SPEED_MULTIPLIER: 0.5,
  /** マグネット: 持続時間 ms */
  MAGNET_DURATION_MS: 8_000,
  /** マグネット: 引き寄せ半径 px */
  MAGNET_RADIUS_PX: 200,
  /** マグネット: 引き寄せ速度 px/s */
  MAGNET_ATTRACT_SPEED: 300,
} as const;

// ---------------------------------------------------------------------------
// コンボシステム設定 (Req 17.2, 17.3)
// ---------------------------------------------------------------------------

export const COMBO = {
  /** 2x 乗数が適用されるコンボ数の閾値 */
  MULTIPLIER_2X_THRESHOLD: 3,
  /** 3x 乗数が適用されるコンボ数の閾値 */
  MULTIPLIER_3X_THRESHOLD: 5,
} as const;

// ---------------------------------------------------------------------------
// スコアマイルストーン設定 (Req 19.4)
// ---------------------------------------------------------------------------

export const SCORE_UI = {
  /** マイルストーン表示間隔（N 点ごとに「すごい！」を表示） */
  MILESTONE_INTERVAL: 10,
  /** マイルストーン通知の表示時間 ms */
  MILESTONE_DISPLAY_DURATION_MS: 1_500,
} as const;

// ---------------------------------------------------------------------------
// UI タイミング設定
// ---------------------------------------------------------------------------

export const UI_TIMING = {
  /** エリア遷移通知の表示時間 ms (Req 20.1) */
  AREA_NOTIFICATION_DURATION_MS: 2_000,
  /** 背景テーマ切り替えのトランジション時間 ms（最大 1 秒）(Req 20.3) */
  BACKGROUND_TRANSITION_DURATION_MS: 1_000,
  /** BGM クロスフェード時間 ms (Req 13.6) */
  BGM_CROSSFADE_DURATION_MS: 2_000,
  /** 実績通知表示の最大遅延 ms（1 秒以内）(Req 16.2) */
  ACHIEVEMENT_NOTIFICATION_DELAY_MS: 1_000,
  /** レスポンシブリサイズの最大遅延 ms (Req 14.5) */
  RESPONSIVE_RESIZE_DELAY_MS: 500,
} as const;

// ---------------------------------------------------------------------------
// 障害物生成設定
// ---------------------------------------------------------------------------

export const OBSTACLE = {
  /** キャンバス外でのスポーン許容オフセット px */
  SPAWN_OFFSET_PX: 50,
  /** ギャップ Y 位置の最大変動量（キャンバス高さに対する割合） */
  GAP_MAX_DELTA_RATIO: 0.3,
} as const;

// --- DeathAnimation 設定 ---
export const DEATH_ANIMATION = {  /** 衝突時の上向きインパルス px/s（Req 8.7） */
  JUMP_IMPULSE: -350,
  /** 落下中に適用する重力加速度 px/s²（通常より少し重い） */
  GRAVITY: 600,
  /** キャラが画面下端を超えてからゲームオーバー画面までの待機時間 ms（Req 8.9） */
  GAMEOVER_DELAY_MS: 1_000,
} as const;

export const PARALLAX = {
  /** 遠景レイヤーのスクロール係数 */
  FAR_SCROLL_FACTOR: 0.2,
  /** 中景レイヤーのスクロール係数 */
  MID_SCROLL_FACTOR: 0.5,
  /** 近景レイヤーのスクロール係数 */
  NEAR_SCROLL_FACTOR: 0.8,
} as const;

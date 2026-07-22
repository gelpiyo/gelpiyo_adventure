/**
 * SpriteAnimationController — キャラクタースプライトのアニメーション状態管理
 *
 * Phaser シーンに依存するアニメーション管理ヘルパー。
 * `Player.animationState` に応じて適切なスプライトキーへ切り替えるロジックを提供する。
 *
 * スプライトキー命名規則:
 *   swim_up:   `{character}_swim_up`
 *   fall_down: `{character}_fall_down`
 *   idle:      `{character}_idle1`, `{character}_idle2`, `{character}_idle3`（3 種ループ）
 *   hit:       `{character}_hit`
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 19.2, 19.3
 */

import type { CharacterType } from '../config'
import type { PlayerAnimationState } from '../models/Player'

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** idle アニメーションのフレーム数（3 種類ループ） */
export const IDLE_FRAME_COUNT = 3 as const

/** idle フレームごとの表示時間 ms（Req 19.3: 3 種類のアニメーションを循環） */
export const IDLE_FRAME_DURATION_MS = 600 as const

// ---------------------------------------------------------------------------
// スプライトキー型
// ---------------------------------------------------------------------------

/**
 * 単一スプライトキーを持つアニメーション状態（swim_up / fall_down / hit）
 */
export type SingleFrameState = Exclude<PlayerAnimationState, 'idle'>

/**
 * 1 つのアニメーション状態に対応するスプライトキー。
 * idle は 3 枚（idle1〜3）を配列で持つ。
 */
export type AnimationSpriteKeys =
  | { state: SingleFrameState; key: string }
  | { state: 'idle'; keys: [string, string, string] }

// ---------------------------------------------------------------------------
// スプライトキーマッピング
// ---------------------------------------------------------------------------

/**
 * キャラクタータイプとアニメーション状態に対応するすべてのスプライトキーを返す。
 *
 * @param character - キャラクタータイプ（例: 'gelpiyo'）
 * @returns AnimationSpriteKeys の配列（各アニメーション状態ごとに 1 エントリ）
 */
export function getAnimationSpriteKeys(character: CharacterType): AnimationSpriteKeys[] {
  return [
    {
      state: 'swim_up',
      key: `${character}_swim_up`,
    },
    {
      state: 'fall_down',
      key: `${character}_fall_down`,
    },
    {
      state: 'idle',
      keys: [
        `${character}_idle1`,
        `${character}_idle2`,
        `${character}_idle3`,
      ] as [string, string, string],
    },
    {
      state: 'hit',
      key: `${character}_hit`,
    },
  ]
}

/**
 * 単一フレームのアニメーション状態（swim_up / fall_down / hit）に対応する
 * スプライトキーを返す。
 *
 * @param character - キャラクタータイプ
 * @param state - アニメーション状態（'idle' 以外）
 * @returns スプライトキー文字列
 */
export function getSpriteKey(character: CharacterType, state: SingleFrameState): string {
  return `${character}_${state}`
}

/**
 * idle アニメーションのフレームインデックス（0-based）に対応するスプライトキーを返す。
 *
 * @param character - キャラクタータイプ
 * @param frameIndex - フレームインデックス（0〜2）
 * @returns スプライトキー文字列（例: 'gelpiyo_idle1'）
 */
export function getIdleSpriteKey(character: CharacterType, frameIndex: number): string {
  const clampedIndex = Math.max(0, Math.min(IDLE_FRAME_COUNT - 1, frameIndex))
  return `${character}_idle${clampedIndex + 1}`
}

/**
 * `Player.animationState` に応じてスプライトキーを返す。
 * idle 状態の場合は現在のフレームインデックスに基づいて返す。
 *
 * @param character - キャラクタータイプ
 * @param state - プレイヤーのアニメーション状態
 * @param idleFrameIndex - idle 状態のフレームインデックス（0〜2）。idle 以外では無視される
 * @returns 現在の状態に対応するスプライトキー
 */
export function getCurrentSpriteKey(
  character: CharacterType,
  state: PlayerAnimationState,
  idleFrameIndex: number = 0,
): string {
  if (state === 'idle') {
    return getIdleSpriteKey(character, idleFrameIndex)
  }
  return getSpriteKey(character, state)
}

// ---------------------------------------------------------------------------
// Phaser preload ヘルパー
// ---------------------------------------------------------------------------

/**
 * Phaser シーンの `preload()` で呼び出し、指定キャラクターのすべての
 * アニメーションスプライト SVG をロードするためのキー・パス一覧を返す。
 *
 * 使用例（シーンの preload 内）:
 * ```ts
 * for (const { key, path } of getSpritePaths('gelpiyo')) {
 *   this.load.svg(key, path, { width: 80, height: 80 })
 * }
 * ```
 *
 * @param character - キャラクタータイプ
 * @param baseDir - スプライトファイルのベースディレクトリ（末尾スラッシュなし）
 * @returns `{ key, path }` の配列
 */
export function getSpritePaths(
  character: CharacterType,
  baseDir: string = 'src/assets/sprites',
): Array<{ key: string; path: string }> {
  const entries: Array<{ key: string; path: string }> = []

  // swim_up, fall_down, hit
  const singleStates: SingleFrameState[] = ['swim_up', 'fall_down', 'hit']
  for (const state of singleStates) {
    const key = getSpriteKey(character, state)
    entries.push({ key, path: `${baseDir}/${key}.svg` })
  }

  // idle1, idle2, idle3
  for (let i = 0; i < IDLE_FRAME_COUNT; i++) {
    const key = getIdleSpriteKey(character, i)
    entries.push({ key, path: `${baseDir}/${key}.svg` })
  }

  return entries
}

// ---------------------------------------------------------------------------
// SpriteAnimationController クラス
// ---------------------------------------------------------------------------

/**
 * Phaser シーン内でキャラクタースプライトのアニメーション状態を管理するクラス。
 *
 * `Player.animationState` の変化を監視し、Phaser の `Image` または `Sprite` オブジェクト
 * のテクスチャを適切なスプライトキーに切り替える。
 *
 * idle 状態では 3 種類のフレームを `IDLE_FRAME_DURATION_MS` ごとにループする。
 *
 * @example
 * ```ts
 * // create() 内で初期化
 * const spriteImage = this.add.image(200, 300, 'gelpiyo_fall_down')
 * const controller = new SpriteAnimationController('gelpiyo', spriteImage)
 *
 * // update() 内で呼び出し
 * controller.update(player.animationState, time)
 * ```
 */
export class SpriteAnimationController {
  /** 現在のキャラクタータイプ */
  private character: CharacterType

  /** 制御対象の Phaser Image オブジェクト */
  private sprite: Phaser.GameObjects.Image

  /** 最後に idle フレームを切り替えた時刻 ms */
  private lastIdleFrameTime: number = 0

  /** 現在の idle フレームインデックス（0〜2） */
  private idleFrameIndex: number = 0

  /** 直前のアニメーション状態（不要な setTexture 呼び出しを防ぐ） */
  private lastState: PlayerAnimationState | null = null

  /**
   * @param character - キャラクタータイプ
   * @param sprite - 制御対象の Phaser.GameObjects.Image
   */
  constructor(character: CharacterType, sprite: Phaser.GameObjects.Image) {
    this.character = character
    this.sprite = sprite
  }

  // -------------------------------------------------------------------------
  // パブリックメソッド
  // -------------------------------------------------------------------------

  /**
   * フレームごとに呼び出し、アニメーション状態に応じてスプライトテクスチャを更新する。
   *
   * - swim_up / fall_down / hit: 固定の 1 枚テクスチャに即切り替え
   * - idle: `IDLE_FRAME_DURATION_MS` ごとに idle1 → idle2 → idle3 → idle1 ... とループ
   *
   * Requirements: 15.2, 15.3, 15.4, 19.3
   *
   * @param state - `Player.animationState` の現在値
   * @param time - Phaser の `update(time, delta)` で渡される現在時刻 ms
   */
  update(state: PlayerAnimationState, time: number): void {
    if (state !== 'idle') {
      // swim_up / fall_down / hit: 状態が変わった時だけテクスチャを更新
      if (state !== this.lastState) {
        const key = getSpriteKey(this.character, state)
        this._setTexture(key)
        this.lastState = state
        // idle へ戻った時のためにフレームをリセット
        this.idleFrameIndex = 0
        this.lastIdleFrameTime = 0
      }
      return
    }

    // idle 状態: フレームインデックスを時間ベースで切り替え
    if (this.lastState !== 'idle') {
      // idle 状態に入った直後: 最初のフレームを即表示
      this.idleFrameIndex = 0
      this.lastIdleFrameTime = time
      const key = getIdleSpriteKey(this.character, 0)
      this._setTexture(key)
      this.lastState = 'idle'
      return
    }

    // idle 中のフレームループ (Req 19.3: 3 種類を循環)
    if (time - this.lastIdleFrameTime >= IDLE_FRAME_DURATION_MS) {
      this.idleFrameIndex = (this.idleFrameIndex + 1) % IDLE_FRAME_COUNT
      const key = getIdleSpriteKey(this.character, this.idleFrameIndex)
      this._setTexture(key)
      this.lastIdleFrameTime = time
    }
  }

  /**
   * キャラクタータイプを切り替える（キャラクター選択変更時に使用）。
   * 次の `update()` 呼び出し時に新しいキャラクターのスプライトが適用される。
   *
   * @param character - 新しいキャラクタータイプ
   */
  setCharacter(character: CharacterType): void {
    this.character = character
    this.lastState = null // 強制的にテクスチャを再設定させる
    this.idleFrameIndex = 0
    this.lastIdleFrameTime = 0
  }

  /**
   * 現在の idle フレームインデックスを返す（デバッグ・テスト用）。
   */
  get currentIdleFrameIndex(): number {
    return this.idleFrameIndex
  }

  /**
   * 現在のキャラクタータイプを返す（デバッグ・テスト用）。
   */
  get currentCharacter(): CharacterType {
    return this.character
  }

  // -------------------------------------------------------------------------
  // プライベートメソッド
  // -------------------------------------------------------------------------

  /**
   * テクスチャが存在する場合のみ setTexture を呼び出す。
   * 未ロードのテクスチャを指定しても Phaser がエラーを出さないよう保護する。
   */
  private _setTexture(key: string): void {
    if (this.sprite.scene?.textures?.exists(key)) {
      this.sprite.setTexture(key)
    }
  }
}

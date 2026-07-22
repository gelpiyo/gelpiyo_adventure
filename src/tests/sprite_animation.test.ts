/**
 * SpriteAnimationController のユニットテスト
 *
 * Phaser に依存しない純粋なロジック関数（スプライトキー生成・マッピング）をテストする。
 * SpriteAnimationController クラス自体は Phaser.GameObjects.Image を必要とするため、
 * モックオブジェクトを使った動作確認を行う。
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 19.2, 19.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSpriteKey,
  getIdleSpriteKey,
  getCurrentSpriteKey,
  getSpritePaths,
  getAnimationSpriteKeys,
  SpriteAnimationController,
  IDLE_FRAME_COUNT,
  IDLE_FRAME_DURATION_MS,
} from '../utils/SpriteAnimationController'
import type { CharacterType } from '../config'
import type { PlayerAnimationState } from '../models/Player'

// ---------------------------------------------------------------------------
// getSpriteKey のテスト
// ---------------------------------------------------------------------------

describe('getSpriteKey', () => {
  it('swim_up 状態で正しいキーを返す (Req 15.2)', () => {
    expect(getSpriteKey('gelpiyo', 'swim_up')).toBe('gelpiyo_swim_up')
  })

  it('fall_down 状態で正しいキーを返す (Req 15.3)', () => {
    expect(getSpriteKey('gelpiyo', 'fall_down')).toBe('gelpiyo_fall_down')
  })

  it('hit 状態で正しいキーを返す (Req 15.4)', () => {
    expect(getSpriteKey('gelpiyo', 'hit')).toBe('gelpiyo_hit')
  })

  it('momopliyo の swim_up で正しいキーを返す', () => {
    expect(getSpriteKey('momopliyo', 'swim_up')).toBe('momopliyo_swim_up')
  })

  it('palpiyo の fall_down で正しいキーを返す', () => {
    expect(getSpriteKey('palpiyo', 'fall_down')).toBe('palpiyo_fall_down')
  })

  it('midoripiyo の hit で正しいキーを返す', () => {
    expect(getSpriteKey('midoripiyo', 'hit')).toBe('midoripiyo_hit')
  })
})

// ---------------------------------------------------------------------------
// getIdleSpriteKey のテスト
// ---------------------------------------------------------------------------

describe('getIdleSpriteKey', () => {
  it('フレームインデックス 0 で idle1 を返す (Req 19.3)', () => {
    expect(getIdleSpriteKey('gelpiyo', 0)).toBe('gelpiyo_idle1')
  })

  it('フレームインデックス 1 で idle2 を返す (Req 19.3)', () => {
    expect(getIdleSpriteKey('gelpiyo', 1)).toBe('gelpiyo_idle2')
  })

  it('フレームインデックス 2 で idle3 を返す (Req 19.3)', () => {
    expect(getIdleSpriteKey('gelpiyo', 2)).toBe('gelpiyo_idle3')
  })

  it('フレームインデックスが範囲外（負数）の場合は 0 にクランプする', () => {
    expect(getIdleSpriteKey('gelpiyo', -1)).toBe('gelpiyo_idle1')
  })

  it('フレームインデックスが範囲外（上限超過）の場合は最大値にクランプする', () => {
    expect(getIdleSpriteKey('gelpiyo', 99)).toBe('gelpiyo_idle3')
  })

  it('momopliyo のフレームインデックス 0 で momopliyo_idle1 を返す', () => {
    expect(getIdleSpriteKey('momopliyo', 0)).toBe('momopliyo_idle1')
  })
})

// ---------------------------------------------------------------------------
// getCurrentSpriteKey のテスト
// ---------------------------------------------------------------------------

describe('getCurrentSpriteKey', () => {
  it('swim_up 状態では swim_up キーを返す', () => {
    expect(getCurrentSpriteKey('gelpiyo', 'swim_up')).toBe('gelpiyo_swim_up')
  })

  it('fall_down 状態では fall_down キーを返す', () => {
    expect(getCurrentSpriteKey('gelpiyo', 'fall_down')).toBe('gelpiyo_fall_down')
  })

  it('hit 状態では hit キーを返す', () => {
    expect(getCurrentSpriteKey('gelpiyo', 'hit')).toBe('gelpiyo_hit')
  })

  it('idle 状態ではフレームインデックスに応じたキーを返す（デフォルト 0）', () => {
    expect(getCurrentSpriteKey('gelpiyo', 'idle')).toBe('gelpiyo_idle1')
  })

  it('idle 状態でフレームインデックス 1 を指定すると idle2 を返す', () => {
    expect(getCurrentSpriteKey('gelpiyo', 'idle', 1)).toBe('gelpiyo_idle2')
  })

  it('idle 状態でフレームインデックス 2 を指定すると idle3 を返す', () => {
    expect(getCurrentSpriteKey('gelpiyo', 'idle', 2)).toBe('gelpiyo_idle3')
  })
})

// ---------------------------------------------------------------------------
// getAnimationSpriteKeys のテスト
// ---------------------------------------------------------------------------

describe('getAnimationSpriteKeys', () => {
  it('gelpiyo に対して 4 つのエントリを返す', () => {
    const keys = getAnimationSpriteKeys('gelpiyo')
    expect(keys).toHaveLength(4)
  })

  it('swim_up エントリが正しいキーを持つ', () => {
    const keys = getAnimationSpriteKeys('gelpiyo')
    const swimUpEntry = keys.find(k => k.state === 'swim_up')
    expect(swimUpEntry).toBeDefined()
    if (swimUpEntry?.state === 'swim_up') {
      expect(swimUpEntry.key).toBe('gelpiyo_swim_up')
    }
  })

  it('idle エントリが 3 枚のキー配列を持つ (Req 19.3)', () => {
    const keys = getAnimationSpriteKeys('gelpiyo')
    const idleEntry = keys.find(k => k.state === 'idle')
    expect(idleEntry).toBeDefined()
    if (idleEntry?.state === 'idle') {
      expect(idleEntry.keys).toHaveLength(3)
      expect(idleEntry.keys[0]).toBe('gelpiyo_idle1')
      expect(idleEntry.keys[1]).toBe('gelpiyo_idle2')
      expect(idleEntry.keys[2]).toBe('gelpiyo_idle3')
    }
  })

  it('hit エントリが正しいキーを持つ (Req 15.4)', () => {
    const keys = getAnimationSpriteKeys('gelpiyo')
    const hitEntry = keys.find(k => k.state === 'hit')
    expect(hitEntry).toBeDefined()
    if (hitEntry?.state === 'hit') {
      expect(hitEntry.key).toBe('gelpiyo_hit')
    }
  })

  it('すべてのキャラクタータイプで正しいプレフィックスを持つキーが生成される', () => {
    const characters: CharacterType[] = ['gelpiyo', 'momopliyo', 'palpiyo', 'midoripiyo']
    for (const character of characters) {
      const keys = getAnimationSpriteKeys(character)
      for (const entry of keys) {
        if (entry.state === 'idle') {
          for (const key of entry.keys) {
            expect(key.startsWith(character)).toBe(true)
          }
        } else {
          expect(entry.key.startsWith(character)).toBe(true)
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// getSpritePaths のテスト
// ---------------------------------------------------------------------------

describe('getSpritePaths', () => {
  it('gelpiyo に対して 6 つのエントリを返す（swim_up, fall_down, hit, idle1〜3）', () => {
    const paths = getSpritePaths('gelpiyo')
    expect(paths).toHaveLength(6)
  })

  it('デフォルトのベースディレクトリで正しいパスを生成する', () => {
    const paths = getSpritePaths('gelpiyo')
    const swimUpEntry = paths.find(p => p.key === 'gelpiyo_swim_up')
    expect(swimUpEntry?.path).toBe('src/assets/sprites/gelpiyo_swim_up.svg')
  })

  it('カスタムのベースディレクトリを指定できる', () => {
    const paths = getSpritePaths('gelpiyo', '/custom/dir')
    const entry = paths.find(p => p.key === 'gelpiyo_swim_up')
    expect(entry?.path).toBe('/custom/dir/gelpiyo_swim_up.svg')
  })

  it('すべてのキーが character プレフィックスを持ち .svg で終わるパスを持つ', () => {
    const paths = getSpritePaths('midoripiyo')
    for (const { key, path } of paths) {
      expect(key.startsWith('midoripiyo')).toBe(true)
      expect(path.endsWith('.svg')).toBe(true)
    }
  })

  it('idle フレーム 3 枚がすべて含まれる', () => {
    const paths = getSpritePaths('gelpiyo')
    const idleKeys = paths.filter(p => p.key.includes('idle')).map(p => p.key)
    expect(idleKeys).toContain('gelpiyo_idle1')
    expect(idleKeys).toContain('gelpiyo_idle2')
    expect(idleKeys).toContain('gelpiyo_idle3')
  })
})

// ---------------------------------------------------------------------------
// 定数のテスト
// ---------------------------------------------------------------------------

describe('定数', () => {
  it('IDLE_FRAME_COUNT は 3 である (Req 19.3)', () => {
    expect(IDLE_FRAME_COUNT).toBe(3)
  })

  it('IDLE_FRAME_DURATION_MS は正の数である', () => {
    expect(IDLE_FRAME_DURATION_MS).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// SpriteAnimationController クラスのテスト（Phaser モックを使用）
// ---------------------------------------------------------------------------

/**
 * Phaser.GameObjects.Image の最小モック
 * テクスチャ変更を追跡するために使用する
 */
function createSpriteMock(availableTextures: Set<string>): Phaser.GameObjects.Image {
  let currentTexture = ''
  const textures = { exists: (key: string) => availableTextures.has(key) }
  const scene = { textures }
  return {
    scene,
    setTexture: (key: string) => {
      currentTexture = key
      return {} as Phaser.GameObjects.Image
    },
    get texture() {
      return { key: currentTexture }
    },
  } as unknown as Phaser.GameObjects.Image
}

describe('SpriteAnimationController', () => {
  let availableTextures: Set<string>
  let spriteMock: Phaser.GameObjects.Image
  let controller: SpriteAnimationController

  // gelpiyo の全テクスチャをモックで利用可能にする
  beforeEach(() => {
    availableTextures = new Set([
      'gelpiyo_swim_up',
      'gelpiyo_fall_down',
      'gelpiyo_idle1',
      'gelpiyo_idle2',
      'gelpiyo_idle3',
      'gelpiyo_hit',
      'momopliyo_swim_up',
      'momopliyo_fall_down',
      'momopliyo_idle1',
      'momopliyo_idle2',
      'momopliyo_idle3',
      'momopliyo_hit',
    ])
    spriteMock = createSpriteMock(availableTextures)
    controller = new SpriteAnimationController('gelpiyo', spriteMock)
  })

  // ---- swim_up ----

  it('swim_up 状態でスプライトが gelpiyo_swim_up に更新される (Req 15.2)', () => {
    controller.update('swim_up', 0)
    expect(spriteMock.texture.key).toBe('gelpiyo_swim_up')
  })

  it('swim_up 状態が続いても setTexture は重複して呼ばれない（状態変化時のみ）', () => {
    let callCount = 0
    const originalSetTexture = spriteMock.setTexture.bind(spriteMock)
    spriteMock.setTexture = (key: string) => { callCount++; return originalSetTexture(key) }

    controller.update('swim_up', 0)
    controller.update('swim_up', 100)
    controller.update('swim_up', 200)
    expect(callCount).toBe(1)
  })

  // ---- fall_down ----

  it('fall_down 状態でスプライトが gelpiyo_fall_down に更新される (Req 15.3)', () => {
    controller.update('fall_down', 0)
    expect(spriteMock.texture.key).toBe('gelpiyo_fall_down')
  })

  // ---- hit ----

  it('hit 状態でスプライトが gelpiyo_hit に更新される (Req 15.4)', () => {
    controller.update('hit', 0)
    expect(spriteMock.texture.key).toBe('gelpiyo_hit')
  })

  // ---- idle ----

  it('idle 状態に入った直後は idle1 が表示される (Req 19.3)', () => {
    controller.update('idle', 1000)
    expect(spriteMock.texture.key).toBe('gelpiyo_idle1')
    expect(controller.currentIdleFrameIndex).toBe(0)
  })

  it('idle 状態で IDLE_FRAME_DURATION_MS 経過後に idle2 に切り替わる (Req 19.3)', () => {
    controller.update('idle', 0)
    expect(spriteMock.texture.key).toBe('gelpiyo_idle1')

    controller.update('idle', IDLE_FRAME_DURATION_MS)
    expect(spriteMock.texture.key).toBe('gelpiyo_idle2')
    expect(controller.currentIdleFrameIndex).toBe(1)
  })

  it('idle 状態で 2 周期後に idle3 に切り替わる (Req 19.3)', () => {
    controller.update('idle', 0)
    controller.update('idle', IDLE_FRAME_DURATION_MS)
    controller.update('idle', IDLE_FRAME_DURATION_MS * 2)
    expect(spriteMock.texture.key).toBe('gelpiyo_idle3')
    expect(controller.currentIdleFrameIndex).toBe(2)
  })

  it('idle アニメーションが 3 周後に idle1 に戻る（ループ） (Req 19.3)', () => {
    controller.update('idle', 0)
    controller.update('idle', IDLE_FRAME_DURATION_MS)
    controller.update('idle', IDLE_FRAME_DURATION_MS * 2)
    controller.update('idle', IDLE_FRAME_DURATION_MS * 3)
    expect(spriteMock.texture.key).toBe('gelpiyo_idle1')
    expect(controller.currentIdleFrameIndex).toBe(0)
  })

  // ---- 状態遷移 ----

  it('swim_up → idle に遷移したとき idle1 が表示される', () => {
    controller.update('swim_up', 0)
    controller.update('idle', 100)
    expect(spriteMock.texture.key).toBe('gelpiyo_idle1')
  })

  it('idle → hit に遷移したとき hit スプライトが表示される (Req 15.4)', () => {
    controller.update('idle', 0)
    controller.update('hit', 100)
    expect(spriteMock.texture.key).toBe('gelpiyo_hit')
  })

  it('idle からの遷移後に再び idle に戻るとフレームが 0 からリセットされる', () => {
    controller.update('idle', 0)
    controller.update('idle', IDLE_FRAME_DURATION_MS * 2) // idle3 まで進める
    controller.update('swim_up', IDLE_FRAME_DURATION_MS * 2 + 10) // idle を抜ける
    controller.update('idle', IDLE_FRAME_DURATION_MS * 2 + 20) // idle に戻る
    expect(spriteMock.texture.key).toBe('gelpiyo_idle1')
    expect(controller.currentIdleFrameIndex).toBe(0)
  })

  // ---- setCharacter ----

  it('setCharacter でキャラクターを変更すると次の update で新キャラのスプライトが適用される', () => {
    controller.update('swim_up', 0)
    expect(spriteMock.texture.key).toBe('gelpiyo_swim_up')

    controller.setCharacter('momopliyo')
    expect(controller.currentCharacter).toBe('momopliyo')

    controller.update('swim_up', 100)
    expect(spriteMock.texture.key).toBe('momopliyo_swim_up')
  })

  it('setCharacter 後 idle フレームがリセットされる', () => {
    // idle3 まで進める（0→1→2 と 2 回切り替えるため 3 周期分必要）
    controller.update('idle', 0)                          // idle1 (index=0)
    controller.update('idle', IDLE_FRAME_DURATION_MS)     // idle2 (index=1)
    controller.update('idle', IDLE_FRAME_DURATION_MS * 2) // idle3 (index=2)
    expect(controller.currentIdleFrameIndex).toBe(2)

    controller.setCharacter('momopliyo')
    expect(controller.currentIdleFrameIndex).toBe(0)
  })

  // ---- テクスチャ未ロード時の保護 ----

  it('テクスチャが存在しない場合は setTexture を呼び出さない', () => {
    const emptyTextures = new Set<string>() // テクスチャなし
    const emptySprite = createSpriteMock(emptyTextures)
    let callCount = 0
    emptySprite.setTexture = () => { callCount++; return {} as Phaser.GameObjects.Image }

    const safeController = new SpriteAnimationController('gelpiyo', emptySprite)
    safeController.update('swim_up', 0)
    expect(callCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 全キャラクタータイプのスプライトキー網羅テスト
// ---------------------------------------------------------------------------

describe('全キャラクターの命名規則一貫性', () => {
  const characters: CharacterType[] = ['gelpiyo', 'momopliyo', 'palpiyo', 'midoripiyo']
  const singleStates: PlayerAnimationState[] = ['swim_up', 'fall_down', 'hit']

  it.each(characters)('%s のすべての単一状態スプライトキーが正しい命名規則に従う', (character) => {
    for (const state of singleStates) {
      if (state !== 'idle') {
        const key = getSpriteKey(character, state)
        expect(key).toBe(`${character}_${state}`)
      }
    }
  })

  it.each(characters)('%s の idle フレームキーが idle1〜3 の命名規則に従う (Req 19.3)', (character) => {
    for (let i = 0; i < IDLE_FRAME_COUNT; i++) {
      const key = getIdleSpriteKey(character, i)
      expect(key).toBe(`${character}_idle${i + 1}`)
    }
  })

  it.each(characters)('%s の getSpritePaths が 6 エントリを返す', (character) => {
    const paths = getSpritePaths(character)
    expect(paths).toHaveLength(6)
  })
})

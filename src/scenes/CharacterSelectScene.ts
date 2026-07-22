/**
 * CharacterSelectScene — キャラクター選択シーン（縦並び・スマホ縦画面対応）
 *
 * 450×800 の縦向き画面にフィットするよう、4枚のカードを縦1列に並べる。
 * スクロールなしで全キャラクターが一画面に表示される。
 *
 * Requirements: 21.1–21.9
 */

import Phaser from 'phaser'
import { CHARACTER_CONFIGS, type CharacterType } from '../config'
import { StorageManager } from '../utils/StorageManager'
import { BGMManager } from '../systems/BGMManager'

// ---------------------------------------------------------------------------
// 定数 — 縦向き450×800向けに調整
// ---------------------------------------------------------------------------

/** カード1枚のサイズ */
const CARD = {
  WIDTH: 390,   // 画面幅450から余白を引いた横幅
  HEIGHT: 130,  // 4枚 × 130 + gap で800に収まる高さ
  RADIUS: 14,
  GAP: 12,
} as const

/** カードリストの開始Y（タイトル直下） */
const CARD_START_Y = 130

/** アニメーション周期（ms） */
const ANIM_PERIOD_MS = 1200

/** プレビューキャラのサイズ */
const CHAR_PREVIEW_SIZE = 90

// ---------------------------------------------------------------------------
// キャラクター定義（表示順）
// ---------------------------------------------------------------------------

const CHARACTER_ORDER: CharacterType[] = ['gelpiyo', 'momopliyo', 'palpiyo', 'midoripiyo']

interface CardObjects {
  type: CharacterType
  bg: Phaser.GameObjects.Graphics
  border: Phaser.GameObjects.Graphics
  previewCircle: Phaser.GameObjects.Graphics
  previewImage: Phaser.GameObjects.Image | null
  nameText: Phaser.GameObjects.Text
  descText: Phaser.GameObjects.Text
  diffLabel: Phaser.GameObjects.Text
  hitZone: Phaser.GameObjects.Rectangle
  cx: number
  cy: number
}

export class CharacterSelectScene extends Phaser.Scene {
  private selectedCharacter: CharacterType = 'gelpiyo'
  private cards: CardObjects[] = []
  private animTime: number = 0

  constructor() {
    super({ key: 'CharacterSelectScene' })
  }

  preload(): void {
    for (const type of CHARACTER_ORDER) {
      const key = `${type}_idle1`
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/sprites/${key}.png`)
      }
    }
  }

  create(): void {
    const { width, height } = this.scale
    this.animTime = 0

    // キャラクター選択BGM
    BGMManager.play('character_select')
    this.cards = []
    this.selectedCharacter = StorageManager.loadSelectedCharacter()

    // 背景
    this._drawBackground(width, height)

    // タイトル
    this.add.text(width / 2, 60, 'キャラクター選択', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#7EC8E3',
      stroke: '#000033',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2)

    // カードを縦並びで生成
    this._buildCards(width)

    // ボタン（画面下部）
    this._buildButtons(width, height)

    // 初期選択ハイライト
    this._applySelection(this.selectedCharacter)
  }

  update(_time: number, delta: number): void {
    this.animTime += delta
    this._updatePreviewAnimations()
  }

  // -------------------------------------------------------------------------
  // カード生成（縦1列）
  // -------------------------------------------------------------------------

  private _buildCards(width: number): void {
    const cx = width / 2

    CHARACTER_ORDER.forEach((type, index) => {
      const cy = CARD_START_Y + CARD.HEIGHT / 2 + index * (CARD.HEIGHT + CARD.GAP)
      const card = this._createCard(type, cx, cy)
      this.cards.push(card)
    })
  }

  private _createCard(type: CharacterType, cx: number, cy: number): CardObjects {
    const cfg = CHARACTER_CONFIGS[type]
    const accentHex = parseInt(cfg.color.replace('#', ''), 16)

    // カード背景
    const bg = this.add.graphics()
    this._drawCardBg(bg, cx, cy, accentHex, false)

    // 選択枠
    const border = this.add.graphics()
    this._drawCardBorder(border, cx, cy, accentHex, false)

    // キャラプレビュー（左側）
    const previewCircle = this.add.graphics()
    const previewX = cx - CARD.WIDTH / 2 + CHAR_PREVIEW_SIZE / 2 + 10
    const previewY = cy

    previewCircle.fillStyle(accentHex, 0.25)
    previewCircle.fillCircle(previewX, previewY, CHAR_PREVIEW_SIZE / 2 + 4)

    const spriteKey = `${type}_idle1`
    let previewImage: Phaser.GameObjects.Image | null = null
    if (this.textures.exists(spriteKey)) {
      previewImage = this.add.image(previewX, previewY, spriteKey)
        .setDisplaySize(CHAR_PREVIEW_SIZE, CHAR_PREVIEW_SIZE)
        .setDepth(4)
    }

    // テキスト（右側）
    const textX = cx - CARD.WIDTH / 2 + CHAR_PREVIEW_SIZE + 26
    const nameText = this.add.text(textX, cy - 30, cfg.nameJa, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#1a1a4e',
    }).setOrigin(0, 0.5).setDepth(4)

    const descText = this.add.text(textX, cy, cfg.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#3a3a6e',
      wordWrap: { width: CARD.WIDTH - CHAR_PREVIEW_SIZE - 36 },
    }).setOrigin(0, 0.5).setDepth(4)

    // 難易度バッジ
    const badgeX = textX
    const badgeY = cy + 30
    const badgeBg = this.add.graphics()
    badgeBg.fillStyle(accentHex, 0.7)
    badgeBg.fillRoundedRect(badgeX, badgeY - 10, 90, 20, 10)
    badgeBg.setDepth(4)
    const diffLabel = this.add.text(badgeX + 45, badgeY, cfg.difficultyLabel, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#1a1a4e',
    }).setOrigin(0.5).setDepth(5)

    // ヒットエリア
    const hitZone = this.add.rectangle(cx, cy, CARD.WIDTH, CARD.HEIGHT, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(6)

    hitZone.on('pointerdown', () => this._onCardSelected(type))

    // ホバー効果
    hitZone.on('pointerover', () => {
      if (this.selectedCharacter === type) return
      // ホバー時：カードを軽くスケールアップ＋ブライトネス
      this.tweens.add({
        targets: [bg, previewCircle],
        scaleX: 1.03, scaleY: 1.03,
        duration: 100, ease: 'Power1',
      })
      // ホバー用の明るい背景を一時描画
      const hoverG = this.add.graphics().setDepth(3.5)
      hoverG.setName(`hover_${type}`)
      hoverG.fillStyle(0xffffff, 0.08)
      hoverG.fillRoundedRect(cx - CARD.WIDTH / 2, cy - CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT, CARD.RADIUS)
      hoverG.lineStyle(2, accentHex, 0.5)
      hoverG.strokeRoundedRect(cx - CARD.WIDTH / 2, cy - CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT, CARD.RADIUS)
    })

    hitZone.on('pointerout', () => {
      if (this.selectedCharacter === type) return
      this.tweens.add({
        targets: [bg, previewCircle],
        scaleX: 1.0, scaleY: 1.0,
        duration: 100, ease: 'Power1',
      })
      // ホバーグラフィクスを削除
      const hoverG = this.children.getByName(`hover_${type}`)
      if (hoverG) hoverG.destroy()
    })

    return { type, bg, border, previewCircle, previewImage, nameText, descText, diffLabel, hitZone, cx, cy }
  }

  // -------------------------------------------------------------------------
  // 描画ヘルパー
  // -------------------------------------------------------------------------

  private _drawCardBg(g: Phaser.GameObjects.Graphics, cx: number, cy: number, accentHex: number, selected: boolean): void {
    g.clear()
    const x = cx - CARD.WIDTH / 2
    const y = cy - CARD.HEIGHT / 2

    g.fillStyle(0xf0f8ff, 1)
    g.fillRoundedRect(x, y, CARD.WIDTH, CARD.HEIGHT, CARD.RADIUS)

    // 左側カラー帯
    g.fillStyle(accentHex, selected ? 0.6 : 0.35)
    g.fillRoundedRect(x, y, CARD.HEIGHT, CARD.HEIGHT, CARD.RADIUS)

    if (selected) {
      // 選択時の光沢
      g.fillStyle(0xffffff, 0.15)
      g.fillRoundedRect(x + 2, y + 2, CARD.WIDTH - 4, CARD.HEIGHT / 3, { tl: CARD.RADIUS - 1, tr: CARD.RADIUS - 1, bl: 0, br: 0 })
    }
    g.setDepth(3)
  }

  private _drawCardBorder(g: Phaser.GameObjects.Graphics, cx: number, cy: number, accentHex: number, selected: boolean): void {
    g.clear()
    if (!selected) return
    const x = cx - CARD.WIDTH / 2
    const y = cy - CARD.HEIGHT / 2
    g.lineStyle(4, accentHex, 1)
    g.strokeRoundedRect(x - 2, y - 2, CARD.WIDTH + 4, CARD.HEIGHT + 4, CARD.RADIUS + 2)
    g.lineStyle(2, 0xffd700, 0.8)
    g.strokeRoundedRect(x - 5, y - 5, CARD.WIDTH + 10, CARD.HEIGHT + 10, CARD.RADIUS + 4)
    g.setDepth(3)
  }

  private _drawBackground(width: number, height: number): void {
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x000814, 0x000814, 1)
    bg.fillRect(0, 0, width, height)

    const dots = this.add.graphics()
    dots.fillStyle(0x7ec8e3, 0.15)
    for (let i = 0; i < 40; i++) {
      dots.fillCircle(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), Phaser.Math.Between(1, 3))
    }
  }

  // -------------------------------------------------------------------------
  // 選択ロジック
  // -------------------------------------------------------------------------

  private _onCardSelected(type: CharacterType): void {
    if (this.selectedCharacter === type) return
    this.selectedCharacter = type
    this._applySelection(type)
  }

  private _applySelection(type: CharacterType): void {
    this.cards.forEach(card => {
      const cfg = CHARACTER_CONFIGS[card.type]
      const accentHex = parseInt(cfg.color.replace('#', ''), 16)
      const isSelected = card.type === type
      this._drawCardBg(card.bg, card.cx, card.cy, accentHex, isSelected)
      this._drawCardBorder(card.border, card.cx, card.cy, accentHex, isSelected)

      // 選択時はスケールを正常に戻す
      if (isSelected) {
        this.tweens.killTweensOf([card.bg, card.previewCircle])
        card.bg.setScale(1.0)
        card.previewCircle.setScale(1.0)
        // ホバーオーバーレイがあれば削除
        const hoverG = this.children.getByName(`hover_${card.type}`)
        if (hoverG) hoverG.destroy()
      }
    })
  }

  private _updatePreviewAnimations(): void {
    this.cards.forEach(card => {
      if (card.type !== this.selectedCharacter) return
      if (!card.previewImage) return
      const phase = (this.animTime / ANIM_PERIOD_MS) * Math.PI * 2
      const offsetY = Math.sin(phase) * 5
      card.previewImage.setY(card.cy + offsetY)
    })
  }

  // -------------------------------------------------------------------------
  // ボタン
  // -------------------------------------------------------------------------

  private _buildButtons(width: number, height: number): void {
    const btnY = height - 50

    // 戻るボタン
    this._createButton(width / 2 - 90, btnY, '← 戻る', 0x557799, 0x6699bb, () => {
      this.scene.start('TitleScene')
    })

    // 決定ボタン
    this._createButton(width / 2 + 90, btnY, '✔ 決定', 0x2ecc71, 0x27ae60, () => {
      StorageManager.saveSelectedCharacter(this.selectedCharacter)
      this.scene.start('GameScene', { characterType: this.selectedCharacter })
    })
  }

  private _createButton(x: number, y: number, label: string, baseColor: number, hoverColor: number, onClick: () => void): void {
    const BW = 160, BH = 46, BRAD = 12
    const bg = this.add.graphics().setDepth(10)
    const drawBg = (c: number) => {
      bg.clear()
      bg.fillStyle(c, 1)
      bg.fillRoundedRect(x - BW / 2, y - BH / 2, BW, BH, BRAD)
      bg.lineStyle(2, 0xffffff, 0.5)
      bg.strokeRoundedRect(x - BW / 2, y - BH / 2, BW, BH, BRAD)
    }
    drawBg(baseColor)

    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(11)

    const hit = this.add.rectangle(x, y, BW, BH, 0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(12)

    hit.on('pointerover', () => drawBg(hoverColor))
    hit.on('pointerout', () => drawBg(baseColor))
    hit.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scaleX: 0.93, scaleY: 0.93, duration: 80, yoyo: true, onComplete: () => onClick() })
    })
  }
}

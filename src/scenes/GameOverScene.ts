/**
 * GameOverScene — ゲームオーバー画面
 * Requirements: 8.5, 8.6, 12.1-12.7
 */

import Phaser from 'phaser'
import { StorageManager } from '../utils/StorageManager'
import { BGMManager } from '../systems/BGMManager'

interface GameOverData {
  score: number
  highScore: number
  isNewRecord: boolean
}

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0
  private highScore: number = 0
  private isNewRecord: boolean = false
  private retryAllowed: boolean = true
  private titleButtonBounds!: Phaser.Geom.Rectangle

  constructor() {
    super({ key: 'GameOverScene' })
  }

  init(data: Partial<GameOverData>): void {
    this.finalScore = typeof data.score === 'number' ? data.score : 0
    this.highScore  = typeof data.highScore === 'number' ? data.highScore : StorageManager.loadHighScore()
    this.isNewRecord = typeof data.isNewRecord === 'boolean' ? data.isNewRecord : false
    this.retryAllowed = true
  }

  create(): void {
    BGMManager.play('gameover')
    const W = this.scale.width
    const H = this.scale.height

    // ── 背景：深い黒赤グラデーション ────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x110000, 0x110000, 0x000000, 0x000000, 1)
    bg.fillRect(0, 0, W, H)

    // ── GAME OVER 大文字（画面中央上） ───────────────────────
    // 赤い影レイヤー
    this.add.text(W / 2 + 4, H * 0.30 + 4, 'GAME', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '88px',
      color: '#660000',
    }).setOrigin(0.5).setDepth(1)

    this.add.text(W / 2 + 4, H * 0.44 + 4, 'OVER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '88px',
      color: '#660000',
    }).setOrigin(0.5).setDepth(1)

    // メインテキスト（白＋赤縁）
    const gameTxt = this.add.text(W / 2, H * 0.30, 'GAME', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '88px',
      color: '#ffffff',
      stroke: '#cc0000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(2)

    const overTxt = this.add.text(W / 2, H * 0.44, 'OVER', {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '88px',
      color: '#ffffff',
      stroke: '#cc0000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(2)

    // 登場アニメーション（上からスライドイン）
    gameTxt.setAlpha(0).setY(H * 0.10)
    overTxt.setAlpha(0).setY(H * 0.25)

    this.tweens.add({
      targets: gameTxt, alpha: 1, y: H * 0.30,
      duration: 400, ease: 'Back.out',
    })
    this.tweens.add({
      targets: overTxt, alpha: 1, y: H * 0.44,
      duration: 400, delay: 150, ease: 'Back.out',
    })

    // ── 区切り線 ─────────────────────────────────────────────
    const line = this.add.graphics().setDepth(2)
    line.lineStyle(2, 0x882222, 0.8)
    line.strokeRect(W * 0.08, H * 0.53, W * 0.84, 0)

    // ── スコア表示 ───────────────────────────────────────────
    this.add.text(W / 2, H * 0.58, `スコア: ${this.finalScore}`, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#330000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2)

    this.add.text(W / 2, H * 0.67, `ハイスコア: ${this.highScore}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#FFE135',
      stroke: '#443300',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(2)

    // NEW RECORD
    if (this.isNewRecord) {
      const rec = this.add.text(W / 2, H * 0.75, '★ NEW RECORD! ★', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '24px',
        color: '#FFD700',
        stroke: '#664400',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(2)
      this.tweens.add({ targets: rec, scaleX: 1.1, scaleY: 1.1, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }

    // ── リトライプロンプト ────────────────────────────────────
    const retry = this.add.text(W / 2, H * 0.855, 'タップでリトライ', {
      fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#aaddff',
    }).setOrigin(0.5).setDepth(2)
    this.tweens.add({ targets: retry, alpha: 0.2, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // ── タイトルへ戻るボタン ──────────────────────────────────
    const btnW = 180, btnH = 40
    const btnX = W / 2, btnY = H * 0.935

    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x1a3a5c)
      .setStrokeStyle(2, 0x4488cc).setDepth(2)
    this.add.text(btnX, btnY, 'タイトルへ戻る', {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#88ccff',
    }).setOrigin(0.5).setDepth(3)

    const hit = this.add.rectangle(btnX, btnY, btnW, btnH, 0, 0)
      .setDepth(4).setInteractive({ useHandCursor: true })
    hit.on('pointerover', () => btnBg.setFillStyle(0x2255aa))
    hit.on('pointerout',  () => btnBg.setFillStyle(0x1a3a5c))
    hit.on('pointerdown', () => { this.retryAllowed = false; this.scene.start('TitleScene') })

    this.titleButtonBounds = new Phaser.Geom.Rectangle(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH)

    // ── 入力 ──────────────────────────────────────────────────
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (!this.retryAllowed) return
      this._startRetry()
    })
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.retryAllowed) return
      if (this.titleButtonBounds?.contains(pointer.x, pointer.y)) return
      this._startRetry()
    })

    // ── 登場フラッシュ ────────────────────────────────────────
    const flash = this.add.graphics().setDepth(10)
    flash.fillStyle(0xff0000, 0.55)
    flash.fillRect(0, 0, W, H)
    this.tweens.add({ targets: flash, alpha: 0, duration: 450, ease: 'Power3.Out', onComplete: () => flash.destroy() })
  }

  private _startRetry(): void {
    this.retryAllowed = false
    BGMManager.play('game')
    this.scene.start('GameScene')
  }

  update(): void { /* 静止画 */ }
}

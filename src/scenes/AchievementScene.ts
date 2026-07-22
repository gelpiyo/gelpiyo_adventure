/**
 * AchievementScene - 実績一覧 & ゲーム記録
 *
 * マスクを使わずに全実績を縦スクロールで表示する。
 * Phaser の setMask は file:// 環境で白くなるバグがあるため使用しない。
 */

import Phaser from 'phaser'
import { AchievementSystem } from '../systems/AchievementSystem'
import { StorageManager } from '../utils/StorageManager'
import type { Achievement } from '../models/Achievement'

const CARD_H = 70
const CARD_GAP = 8
const MARGIN_X = 20
const HEADER_H = 200   // ヘッダー部分の高さ
const FOOTER_H = 80    // フッター部分の高さ

export class AchievementScene extends Phaser.Scene {
  private achievementSystem!: AchievementSystem
  private achievements: Achievement[] = []

  // スクロール用にカード全体を1つのコンテナで管理
  private cardContainer!: Phaser.GameObjects.Container
  private scrollY: number = 0
  private maxScrollY: number = 0
  private scrollVelocity: number = 0
  private isDragging: boolean = false
  private prevPointerY: number = 0

  constructor() {
    super({ key: 'AchievementScene' })
  }

  preload(): void {}

  create(): void {
    this.scrollY = 0
    this.scrollVelocity = 0
    this.isDragging = false

    const { width, height } = this.scale

    // ---- 背景 ----
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x050518, 0x050518, 0x010108, 0x010108, 1)
    bg.fillRect(0, 0, width, height)
    bg.setDepth(0)

    // 光の粒装飾
    const dots = this.add.graphics().setDepth(0)
    dots.fillStyle(0x7ec8e3, 0.12)
    for (let i = 0; i < 30; i++) {
      dots.fillCircle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(1, 3)
      )
    }

    // ---- データ読み込み ----
    this.achievementSystem = new AchievementSystem()
    this.achievementSystem.load()
    this.achievements = this.achievementSystem.getAll()

    const unlockedCount = this.achievements.filter(a => a.unlocked).length
    const totalCount = this.achievements.length
    const highScore = StorageManager.loadHighScore()

    // ---- ヘッダー（固定表示） ----
    this._drawHeader(width, height, highScore, unlockedCount, totalCount)

    // ---- カードコンテナ（スクロール対象） ----
    const totalCardH = totalCount * (CARD_H + CARD_GAP) - CARD_GAP
    const viewH = height - HEADER_H - FOOTER_H
    this.maxScrollY = Math.max(0, totalCardH - viewH)

    this.cardContainer = this.add.container(0, HEADER_H)
    this.cardContainer.setDepth(5)

    // 全カードをコンテナに追加
    const sorted = [
      ...this.achievements.filter(a => a.unlocked),
      ...this.achievements.filter(a => !a.unlocked),
    ]
    sorted.forEach((ach, i) => {
      const y = i * (CARD_H + CARD_GAP)
      this._addCard(ach, MARGIN_X, y, width - MARGIN_X * 2)
    })

    // ---- フッター（固定表示・戻るボタン） ----
    this._drawFooter(width, height)

    // ---- 入力ハンドラ ----
    this._setupInput(width, viewH)
  }

  update(): void {
    if (!this.isDragging && Math.abs(this.scrollVelocity) > 0.5) {
      this.scrollVelocity *= 0.85
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY + this.scrollVelocity, 0, this.maxScrollY)
      this.cardContainer.y = HEADER_H - this.scrollY
    }
  }

  // -------------------------------------------------------------------------
  // ヘッダー（固定）
  // -------------------------------------------------------------------------

  private _drawHeader(
    width: number, _height: number,
    highScore: number, unlocked: number, total: number
  ): void {
    // タイトル
    this.add.text(width / 2, 30, '実績 & 記録', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#FFE135',
      stroke: '#443300',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    // 記録パネル背景
    const panelBg = this.add.graphics().setDepth(8)
    panelBg.fillStyle(0x0a2244, 0.92)
    panelBg.lineStyle(1.5, 0x3a6ea5, 0.85)
    panelBg.fillRoundedRect(MARGIN_X, 65, width - MARGIN_X * 2, 90, 12)
    panelBg.strokeRoundedRect(MARGIN_X, 65, width - MARGIN_X * 2, 90, 12)

    // ハイスコア
    this.add.text(width / 2, 95, `🏆  ハイスコア: ${highScore}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#FFD700',
      stroke: '#443300',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)

    // 実績数
    const pct = total > 0 ? Math.floor((unlocked / total) * 100) : 0
    this.add.text(width / 2, 128, `実績 ${unlocked} / ${total} 解除（${pct}%）`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#a8d8f0',
    }).setOrigin(0.5).setDepth(10)

    // 区切り線
    this.add.text(MARGIN_X, 165, '── 実績一覧 ──────────────────', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: '#3a6ea5',
    }).setOrigin(0, 0).setDepth(10)
  }

  // -------------------------------------------------------------------------
  // カード1枚
  // -------------------------------------------------------------------------

  private _addCard(ach: Achievement, x: number, y: number, cardW: number): void {
    const isUnlocked = ach.unlocked

    // カード背景
    const cardBg = this.add.graphics()
    cardBg.fillStyle(isUnlocked ? 0x1a3a5a : 0x0d0d22, isUnlocked ? 0.95 : 0.75)
    cardBg.fillRoundedRect(x, y, cardW, CARD_H, 10)
    cardBg.lineStyle(1.5, isUnlocked ? 0x4a8abf : 0x1a1a3a, isUnlocked ? 0.9 : 0.5)
    cardBg.strokeRoundedRect(x, y, cardW, CARD_H, 10)

    if (isUnlocked) {
      // 光沢
      const gloss = this.add.graphics()
      gloss.fillStyle(0xffffff, 0.055)
      gloss.fillRoundedRect(x + 2, y + 2, cardW - 4, CARD_H * 0.35,
        { tl: 9, tr: 9, bl: 0, br: 0 })
      this.cardContainer.add(gloss)
    }

    // アイコン
    const icon = this.add.text(x + 22, y + CARD_H / 2,
      isUnlocked ? '🏆' : '🔒', {
        fontSize: '18px', fontFamily: 'Arial',
      }).setOrigin(0.5).setAlpha(isUnlocked ? 1 : 0.35)

    // タイトル
    const titleTxt = this.add.text(x + 46, y + 14, ach.title, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: isUnlocked ? 'bold' : 'normal',
      color: isUnlocked ? '#FFE135' : '#555566',
    }).setOrigin(0, 0)

    // 説明
    const descTxt = this.add.text(x + 46, y + 36, ach.description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '11px',
      color: isUnlocked ? '#99ccee' : '#333344',
      wordWrap: { width: cardW - 130 },
    }).setOrigin(0, 0)

    // ステータス（日付 or 未取得）
    let statusStr = '未取得'
    let statusColor = '#334455'
    if (isUnlocked && ach.unlockedAt !== undefined) {
      const d = new Date(ach.unlockedAt)
      statusStr = `${d.getMonth() + 1}/${d.getDate()}`
      statusColor = '#88ee88'
    }
    const statusTxt = this.add.text(x + cardW - 6, y + 14, statusStr, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      color: statusColor,
    }).setOrigin(1, 0)

    this.cardContainer.add([cardBg, icon, titleTxt, descTxt, statusTxt])
  }

  // -------------------------------------------------------------------------
  // フッター（固定）
  // -------------------------------------------------------------------------

  private _drawFooter(width: number, height: number): void {
    // フッター背景（カードが透けないよう）
    const footerBg = this.add.graphics().setDepth(20)
    footerBg.fillStyle(0x050518, 1)
    footerBg.fillRect(0, height - FOOTER_H, width, FOOTER_H)

    // 区切り線
    const line = this.add.graphics().setDepth(21)
    line.lineStyle(1, 0x3a6ea5, 0.5)
    line.lineBetween(0, height - FOOTER_H, width, height - FOOTER_H)

    // 戻るボタン
    const btnX = width / 2
    const btnY = height - FOOTER_H / 2
    const BW = 200, BH = 44, BRAD = 12

    const btnBg = this.add.graphics().setDepth(22)
    const draw = (h: boolean) => {
      btnBg.clear()
      btnBg.fillStyle(h ? 0x2a5a8a : 0x1a4a7a, 0.95)
      btnBg.lineStyle(2, 0x7ec8e3, 1)
      btnBg.fillRoundedRect(btnX - BW / 2, btnY - BH / 2, BW, BH, BRAD)
      btnBg.strokeRoundedRect(btnX - BW / 2, btnY - BH / 2, BW, BH, BRAD)
    }
    draw(false)

    const btnLabel = this.add.text(btnX, btnY, '← タイトルへ戻る', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#7ec8e3',
    }).setOrigin(0.5).setDepth(23)
      .setInteractive(
        new Phaser.Geom.Rectangle(-BW / 2, -BH / 2, BW, BH),
        Phaser.Geom.Rectangle.Contains
      )

    btnLabel.on('pointerover', () => draw(true))
    btnLabel.on('pointerout', () => draw(false))
    btnLabel.on('pointerdown', () => this.scene.start('TitleScene'))
  }

  // -------------------------------------------------------------------------
  // 入力
  // -------------------------------------------------------------------------

  private _setupInput(width: number, viewH: number): void {
    const scrollAreaTop = HEADER_H
    const scrollAreaBottom = scrollAreaTop + viewH

    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, deltaY: number) => {
      this.scrollY = Phaser.Math.Clamp(
        this.scrollY + deltaY * 0.5, 0, this.maxScrollY)
      this.scrollVelocity = 0
      this.cardContainer.y = HEADER_H - this.scrollY
    })

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < scrollAreaTop || p.y > scrollAreaBottom) return
      this.isDragging = true
      this.prevPointerY = p.y
      this.scrollVelocity = 0
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return
      const dy = this.prevPointerY - p.y
      this.scrollVelocity = dy
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScrollY)
      this.prevPointerY = p.y
      this.cardContainer.y = HEADER_H - this.scrollY
    })

    this.input.on('pointerup', () => { this.isDragging = false })
    void width  // suppress unused
  }
}

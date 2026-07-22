/**
 * TitleScene - ゲームタイトル画面
 *
 * 責務:
 * - ゲームタイトル「ゲルぴよ深海大冒険」を表示 (Req 1.2)
 * - Gelpiyo のアイドルアニメーション（3 種類ループ）(Req 1.3, 19.3)
 * - ハイスコア表示（StorageManager 経由） (Req 1.4, 1.7)
 * - START プロンプト表示 (Req 1.5)
 * - 深海パーティクル背景 (Req 1.6, 2.1)
 * - Space キー / タップで GameScene 遷移 (Req 2.1, 2.2)
 * - キャラクター選択ボタン → CharacterSelectScene (Req 21.1)
 * - 実績ボタン → AchievementScene (Req 16.4)
 * - ミュートトグルボタン (Req 13.7)
 * - デイリーチャレンジ表示（目標と完了状態） (Req 18.4)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7,
 *               2.1, 2.2, 13.7, 16.4, 18.4, 19.3, 21.1
 */

import Phaser from 'phaser'
import { StorageManager } from '../utils/StorageManager'
import { BGMManager } from '../systems/BGMManager'
import type { DailyChallenge } from '../models/DailyChallenge'

// ---------------------------------------------------------------------------
// アイドルアニメーション設定
// ---------------------------------------------------------------------------

/** アイドルフレームごとの表示時間 ms（Req 19.3: 3 種類を循環） */
const IDLE_FRAME_DURATION_MS = 600

/** アイドルアニメーションのフレーム数 */
const IDLE_FRAME_COUNT = 3

// ---------------------------------------------------------------------------
// パーティクル設定
// ---------------------------------------------------------------------------

/** 同時に浮遊するパーティクルの最大数 */
const PARTICLE_COUNT = 40

// ---------------------------------------------------------------------------
// TitleScene
// ---------------------------------------------------------------------------

export class TitleScene extends Phaser.Scene {
  // -------------------------------------------------------------------------
  // フィールド
  // -------------------------------------------------------------------------

  /** Gelpiyo アイドルアニメーション用スプライト */
  private gelpiyoSprite!: Phaser.GameObjects.Image

  /** アイドルアニメーションフレームインデックス（0–2） */
  private idleFrameIndex: number = 0

  /** 最後にアイドルフレームを切り替えた時刻 ms */
  private lastIdleFrameTime: number = 0

  /** ミュートトグルボタン */
  private muteButton!: Phaser.GameObjects.Text

  /** 深海パーティクル群 */
  private particles: Array<{
    circle: Phaser.GameObjects.Arc
    speedY: number
    wobblePhase: number
    wobbleAmp: number
  }> = []

  /** 深海背景パーティクル群（タイトル用） */
  private bgObjects: Array<{
    g: Phaser.GameObjects.Graphics
    x: number; y: number
    phase: number; speed: number
    type: 'fish' | 'rock' | 'coral' | 'treasure' | 'ship' | 'bubble' | 'shell' | 'seaweed'
    color: number; scale: number; scrollSpeed: number
  }> = []

  /** START プロンプト点滅用 tween */
  private startPromptTween!: Phaser.Tweens.Tween

  /** スタートを受け付けるかどうかのフラグ（多重遷移防止） */
  private transitioning: boolean = false

  // -------------------------------------------------------------------------
  // コンストラクター
  // -------------------------------------------------------------------------

  constructor() {
    super({ key: 'TitleScene' })
  }

  // -------------------------------------------------------------------------
  // preload
  // -------------------------------------------------------------------------

  preload(): void {
    // タイトル背景PNG (Req 15.9)
    this.load.image('title_background', 'assets/sprites/title_background.png')

    // ゲルぴよ idle PNG スプライト (Req 15.7, 15.8)
    for (let i = 1; i <= IDLE_FRAME_COUNT; i++) {
      const key = `gelpiyo_idle${i}`
      // PNG を優先ロード、存在しなければ SVG フォールバック
      this.load.image(key, `assets/sprites/${key}.png`)
    }
  }

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  create(): void {
    // シーン再開のたびに状態をリセット
    this.transitioning = false
    this.particles = []
    this.bgObjects = []
    this.idleFrameIndex = 0
    this.lastIdleFrameTime = 0

    const { width, height } = this.scale

    // BGM: ユーザー操作後に確実に開始するため、ここでは初期化のみ
    // 実際の開始は _setupInput のタップ/クリックで行う

    // 1. 深海グラデーション背景 -----------------------------------------------
    this._createBackground(width, height)

    // 2. 背景オブジェクト（小魚・岩・財宝・沈没船など）-----------------------
    this._createBgObjects(width, height)

    // 3. 浮遊パーティクル背景 (Req 1.6) ----------------------------------------
    this._createParticles(width, height)

    // 3. ゲームタイトル (Req 1.2) ------------------------------------------------
    this._createTitle(width, height)

    // 4. Gelpiyo アイドルアニメーション (Req 1.3, 19.3) --------------------------
    this._createGelpiyoSprite(width, height)

    // 5. ハイスコア表示 (Req 1.4, 1.7) ------------------------------------------
    this._createHighScoreDisplay(width, height)

    // 6. デイリーチャレンジ表示 (Req 18.4) ---------------------------------------
    this._createDailyChallengeDisplay(width, height)

    // 7. START プロンプト (Req 1.5) -----------------------------------------------
    this._createStartPrompt(width, height)

    // 8. キャラクター選択ボタン (Req 21.1) -----------------------------------------
    this._createCharacterSelectButton(width, height)

    // 9. 実績ボタン (Req 16.4) -----------------------------------------------------
    this._createAchievementButton(width, height)

    // 10. ミュートトグルボタン (Req 13.7) ------------------------------------------
    this._createMuteButton(width, height)

    // 11. 入力ハンドラ (Req 2.1, 2.2) -----------------------------------------------
    this._setupInput()
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  update(time: number, _delta: number): void {
    // アイドルアニメーション更新 (Req 19.3)
    this._updateIdleAnimation(time)

    // パーティクル浮遊更新 (Req 1.6)
    this._updateParticles()

    // 背景オブジェクト更新
    this._updateBgObjects()
  }

  // =========================================================================
  // プライベートヘルパー
  // =========================================================================

  // -------------------------------------------------------------------------
  // 背景
  // -------------------------------------------------------------------------

  private _createBackground(width: number, height: number): void {
    // PNG背景が存在すれば使用、なければネオン深海グラデーション描画
    if (this.textures.exists('title_background')) {
      this.add.image(width / 2, height / 2, 'title_background')
        .setOrigin(0.5)
        .setDisplaySize(width, height)
        .setDepth(-1)
      // PNG上にもネオン光線を薄くかぶせる
      const neonRays = this.add.graphics().setDepth(-0.5)
      neonRays.setAlpha(0.06)
      for (let i = 0; i < 5; i++) {
        const rx = width * (0.1 + i * 0.2)
        neonRays.fillStyle(0x00ffff, 1)
        neonRays.fillTriangle(rx - 18, 0, rx + 18, 0, rx + 70, height)
      }
      return
    }

    // ネオン深海グラデーション背景
    const bg = this.add.graphics().setDepth(-1)
    bg.fillGradientStyle(0x001133, 0x001133, 0x000822, 0x000822, 1)
    bg.fillRect(0, 0, width, height)

    // ネオン光線（シアン・マゼンタ）
    const rays = this.add.graphics().setDepth(-0.5).setAlpha(0.07)
    const rayColors = [0x00ffff, 0xff00ff, 0x00ffaa, 0xff44ff, 0x00ccff]
    for (let i = 0; i < 5; i++) {
      const rx = width * (0.1 + i * 0.18)
      rays.fillStyle(rayColors[i % rayColors.length], 1)
      rays.fillTriangle(rx - 18, 0, rx + 18, 0, rx + 65, height)
    }

    // 砂地（下部・ネオンゴールド）
    const sand = this.add.graphics().setDepth(-0.3)
    sand.fillStyle(0xaa8800, 0.8)
    sand.fillRect(0, height - 28, width, 28)
    sand.fillStyle(0xffdd00, 0.3)
    for (let i = 0; i < 20; i++) {
      sand.fillCircle(Phaser.Math.Between(0, width), height - Phaser.Math.Between(5, 22), Phaser.Math.Between(2, 5))
    }
  }

  // ── タイトル背景オブジェクト ────────────────────────────

  private _createBgObjects(width: number, height: number): void {
    const rng = Phaser.Math.RND

    // 遠景：沈没船（背景PNG使用時はスキップ）
    if (!this.textures.exists('title_background')) {
      for (let i = 0; i < 1; i++) {
        const g = this.add.graphics().setDepth(0.5)
        this.bgObjects.push({
          g, x: rng.between(50, width - 50), y: height - 80,
          phase: 0, speed: 0.008, type: 'ship',
          color: 0x554433, scale: 1, scrollSpeed: 0.2,
        })
      }
    }

    // 遠景：大岩
    for (let i = 0; i < 5; i++) {
      const g = this.add.graphics().setDepth(0.3)
      this.bgObjects.push({
        g, x: rng.between(0, width), y: height - rng.between(15, 60),
        phase: 0, speed: 0, type: 'rock',
        color: rng.pick([0x445566, 0x336655, 0x554444]),
        scale: rng.realInRange(0.8, 1.8), scrollSpeed: 0.15,
      })
    }

    // 中景：サンゴ
    const coralColors = [0xff4466, 0xff6633, 0xffaa00, 0xff3399, 0xee2255]
    for (let i = 0; i < 8; i++) {
      const g = this.add.graphics().setDepth(1)
      this.bgObjects.push({
        g, x: rng.between(0, width), y: height - rng.between(10, 50),
        phase: rng.realInRange(0, Math.PI * 2), speed: rng.realInRange(0.02, 0.04),
        type: 'coral', color: coralColors[i % coralColors.length],
        scale: rng.realInRange(0.7, 1.3), scrollSpeed: 0.3,
      })
    }

    // 中景：海草
    for (let i = 0; i < 10; i++) {
      const g = this.add.graphics().setDepth(1.1)
      this.bgObjects.push({
        g, x: rng.between(0, width), y: height - 5,
        phase: rng.realInRange(0, Math.PI * 2), speed: rng.realInRange(0.04, 0.08),
        type: 'seaweed', color: rng.pick([0x44cc44, 0x33bb44, 0x55dd55]),
        scale: rng.realInRange(0.8, 1.4), scrollSpeed: 0.35,
      })
    }

    // 前景：金銀財宝
    for (let i = 0; i < 5; i++) {
      const g = this.add.graphics().setDepth(1.5)
      this.bgObjects.push({
        g, x: rng.between(0, width), y: height - rng.between(15, 35),
        phase: rng.realInRange(0, Math.PI * 2), speed: rng.realInRange(0.03, 0.06),
        type: 'treasure', color: 0xffd700,
        scale: rng.realInRange(0.8, 1.2), scrollSpeed: 0.45,
      })
    }

    // 前景：貝殻
    for (let i = 0; i < 6; i++) {
      const g = this.add.graphics().setDepth(1.5)
      this.bgObjects.push({
        g, x: rng.between(0, width), y: height - rng.between(8, 22),
        phase: rng.realInRange(0, Math.PI * 2), speed: 0.01,
        type: 'shell', color: rng.pick([0xffddaa, 0xffccbb, 0xeeddcc]),
        scale: rng.realInRange(0.7, 1.1), scrollSpeed: 0.5,
      })
    }

    // 前景：小魚の群れ
    const fishColors = [0xff6600, 0xffcc00, 0xff3366, 0x00ccff, 0x66ff33, 0xffaa00]
    for (let i = 0; i < 12; i++) {
      const g = this.add.graphics().setDepth(2)
      this.bgObjects.push({
        g, x: rng.between(0, width), y: rng.between(height * 0.5, height - 80),
        phase: rng.realInRange(0, Math.PI * 2), speed: rng.realInRange(0.06, 0.14),
        type: 'fish', color: fishColors[i % fishColors.length],
        scale: rng.realInRange(0.5, 1.0), scrollSpeed: rng.realInRange(0.4, 0.9),
      })
    }
  }

  private _updateBgObjects(): void {
    const { width } = this.scale
    for (const obj of this.bgObjects) {
      obj.phase += obj.speed
      obj.x -= obj.scrollSpeed
      if (obj.x < -200) obj.x = width + 200

      obj.g.clear()
      switch (obj.type) {
        case 'fish':    this._drawTitleFish(obj.g, obj.x, obj.y, obj.phase, obj.color, obj.scale); break
        case 'rock':    this._drawTitleRock(obj.g, obj.x, obj.y, obj.color, obj.scale); break
        case 'coral':   this._drawTitleCoral(obj.g, obj.x, obj.y, obj.phase, obj.color, obj.scale); break
        case 'treasure':this._drawTitleTreasure(obj.g, obj.x, obj.y, obj.phase, obj.color); break
        case 'ship':    this._drawTitleShip(obj.g, obj.x, obj.y, obj.phase); break
        case 'shell':   this._drawTitleShell(obj.g, obj.x, obj.y, obj.phase, obj.color); break
        case 'seaweed': this._drawTitleSeaweed(obj.g, obj.x, obj.y, obj.phase, obj.color, obj.scale); break
      }
    }
  }

  private _drawTitleFish(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, s: number): void {
    const bobY = y + Math.sin(phase * 0.7) * 5
    const wiggle = Math.sin(phase * 3.5) * 2
    const dir = -1  // 左向き（スクロールに合わせて）
    g.fillStyle(color, 0.9)
    g.fillEllipse(x, bobY, 30 * s, 16 * s)
    g.fillTriangle(x + dir * 13 * s, bobY, x + dir * 23 * s, bobY - 8 * s, x + dir * 23 * s + wiggle, bobY + 8 * s)
    g.fillStyle(0xffffff, 0.3); g.fillRect(x - 4 * s, bobY - 7 * s, 4 * s, 14 * s)
    g.fillStyle(0xffffff, 0.95); g.fillCircle(x - dir * 9 * s, bobY - 3 * s, 4 * s)
    g.fillStyle(0x111111, 0.95); g.fillCircle(x - dir * 8 * s, bobY - 3 * s, 2.5 * s)
    g.fillStyle(0xffffff, 0.7); g.fillCircle(x - dir * 7.5 * s, bobY - 4 * s, 1 * s)
  }

  private _drawTitleRock(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, s: number): void {
    g.fillStyle(color, 0.55)
    g.fillEllipse(x, y - 20 * s, 75 * s, 50 * s)
    g.fillEllipse(x + 30 * s, y - 10 * s, 45 * s, 32 * s)
    g.fillEllipse(x - 28 * s, y - 8 * s, 36 * s, 25 * s)
  }

  private _drawTitleCoral(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, s: number): void {
    g.fillStyle(color, 0.8)
    g.fillRect(x - 3 * s, y - 38 * s, 6 * s, 38 * s)
    g.lineStyle(3 * s, color, 0.8)
    const sway = Math.sin(phase) * 2
    g.strokePoints([{ x, y: y - 22 * s }, { x: x - 16 * s + sway, y: y - 36 * s }], false)
    g.strokePoints([{ x, y: y - 18 * s }, { x: x + 14 * s + sway, y: y - 32 * s }], false)
    g.fillCircle(x - 16 * s + sway, y - 36 * s, 5 * s)
    g.fillCircle(x + 14 * s + sway, y - 32 * s, 4.5 * s)
    g.fillCircle(x, y - 40 * s, 5 * s)
  }

  private _drawTitleTreasure(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number): void {
    const glow = 0.3 + Math.sin(phase * 2) * 0.15
    g.fillStyle(0x884422, 0.9); g.fillRect(x - 13, y - 19, 26, 17)
    g.fillStyle(color, 0.95); g.fillRect(x - 13, y - 23, 26, 7)
    g.fillStyle(color, 0.95); g.fillCircle(x, y - 13, 4)
    for (let i = 0; i < 3; i++) {
      g.fillStyle(color, glow + 0.4)
      g.fillCircle(x - 8 + i * 8, y - 21 - Math.sin(phase + i) * 2.5, 3.5)
    }
    g.fillStyle(0xffffff, glow * 0.6); g.fillCircle(x - 4, y - 26, 2.5)
  }

  private _drawTitleShip(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number): void {
    const sway = Math.sin(phase * 0.3) * 2
    g.fillStyle(0x554433, 0.45)
    // 船体（横倒し）
    g.fillRect(x - 80, y - 25 + sway, 160, 35)
    g.fillStyle(0x665544, 0.4)
    g.fillRect(x - 60, y - 50 + sway, 50, 25)
    g.fillRect(x + 10, y - 42 + sway, 35, 18)
    // マスト
    g.fillStyle(0x443322, 0.35)
    g.fillRect(x - 35, y - 95 + sway, 5, 45)
    g.fillRect(x + 20, y - 80 + sway, 4, 38)
    // 窓（ポートホール）
    g.lineStyle(2, 0x887766, 0.3)
    for (let i = 0; i < 4; i++) {
      g.strokeCircle(x - 55 + i * 30, y - 12 + sway, 6)
    }
  }

  private _drawTitleShell(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number): void {
    g.fillStyle(color, 0.9)
    g.fillEllipse(x, y - 8, 22, 16)
    g.lineStyle(1.5, 0xffffff, 0.3)
    for (let i = 0; i < 4; i++) {
      const angle = ((Math.PI * 0.55) / 3) * i - Math.PI * 0.28 + phase * 0.05
      g.strokePoints([{ x, y }, { x: x + Math.cos(angle) * 11, y: y - Math.abs(Math.sin(angle)) * 14 }], false)
    }
    g.fillStyle(0xffffff, 0.35); g.fillEllipse(x - 2, y - 11, 7, 5)
  }

  private _drawTitleSeaweed(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, s: number): void {
    const h = (38 + (Math.round(x / 35) % 4) * 12) * s
    const sway = Math.sin(phase) * 7 * s
    g.lineStyle(3 * s, color, 0.85)
    g.strokePoints([{ x, y }, { x: x + sway * 0.3, y: y - h * 0.35 }, { x: x + sway * 0.65, y: y - h * 0.65 }, { x: x + sway, y: y - h }], false)
    g.lineStyle(2 * s, color, 0.6)
    g.strokePoints([{ x: x + 7 * s, y }, { x: x + 7 * s + sway * 0.4, y: y - h * 0.5 }, { x: x + 7 * s + sway, y: y - h * 0.85 }], false)
  }

  // -------------------------------------------------------------------------
  // パーティクル (Req 1.6)
  // -------------------------------------------------------------------------

  private _createParticles(width: number, height: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      const radius = Phaser.Math.FloatBetween(2, 6)
      const alpha = Phaser.Math.FloatBetween(0.3, 0.8)
      const speedY = Phaser.Math.FloatBetween(-0.5, -0.15)
      const wobbleAmp = Phaser.Math.FloatBetween(0.4, 1.5)
      const wobblePhase = Phaser.Math.FloatBetween(0, Math.PI * 2)

      // 明るい水色〜白のバブル
      const colors = [0xffffff, 0xaaddff, 0x88eeff, 0xccffff, 0xeeffaa]
      const color = colors[Math.floor(Math.random() * colors.length)]

      const circle = this.add.circle(x, y, radius, color, alpha)
      this.particles.push({ circle, speedY, wobblePhase, wobbleAmp })
    }
  }

  private _updateParticles(): void {
    const { width, height } = this.scale
    for (const p of this.particles) {
      p.wobblePhase += 0.02
      p.circle.x += Math.sin(p.wobblePhase) * p.wobbleAmp
      p.circle.y += p.speedY

      // 上端を超えたら下端から再出現
      if (p.circle.y < -10) {
        p.circle.y = height + 10
        p.circle.x = Phaser.Math.Between(0, width)
      }
    }
  }

  // -------------------------------------------------------------------------
  // タイトル (Req 1.2)
  // -------------------------------------------------------------------------

  private _createTitle(width: number, height: number): void {
    // 背景PNG使用時はタイトルテキストを重ねない（PNG内にロゴが含まれるため）
    if (this.textures.exists('title_background')) return

    const cx = width / 2
    const titleY = height * 0.11

    // 影レイヤー（1枚だけ、薄くオフセット）
    this.add.text(cx + 3, titleY + 3, 'ゲルぴよ深海大冒険', {
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial Black, sans-serif',
      fontSize: '46px',
      color: '#000033',
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5).setAlpha(0.55).setDepth(3)

    // メインタイトルテキスト（黄色文字＋紺縁取り：最高コントラスト）
    const titleText = this.add.text(cx, titleY, 'ゲルぴよ深海大冒険', {
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial Black, sans-serif',
      fontSize: '46px',
      color: '#ffee00',
      stroke: '#001a66',
      strokeThickness: 7,
    }).setOrigin(0.5).setDepth(4)

    // 穏やかな浮遊アニメーション
    this.tweens.add({ targets: titleText, y: titleY - 6, duration: 2200, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 })

    // サブタイトル（読みやすいシンプルなテキスト）
    this.add.text(cx, titleY + 46, 'DEEP SEA ADVENTURE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '13px',
      color: '#88eeff',
      stroke: '#001133',
      strokeThickness: 3,
      letterSpacing: 3,
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5).setDepth(4)
  }

  // -------------------------------------------------------------------------
  // Gelpiyo アイドルスプライト (Req 1.3, 19.3)
  // -------------------------------------------------------------------------

  private _createGelpiyoSprite(width: number, height: number): void {
    const cx = width / 2
    // タイトル直下に配置（Y座標を詰める）
    const cy = this.textures.exists('title_background') ? height * 0.34 : height * 0.30
    const spriteSize = this.textures.exists('title_background') ? 100 : 110

    if (this.textures.exists('gelpiyo_idle1')) {
      this.gelpiyoSprite = this.add
        .image(cx, cy, 'gelpiyo_idle1')
        .setOrigin(0.5)
        .setDisplaySize(spriteSize, spriteSize)
      this.lastIdleFrameTime = this.time.now
    } else {
      // プレースホルダー
      const g = this.add.graphics()
      g.fillStyle(0x7ec8e3, 1)
      g.fillCircle(cx, cy, 36)
      g.fillStyle(0xffffff, 1)
      g.fillCircle(cx - 12, cy - 8, 9)
      g.fillCircle(cx + 12, cy - 8, 9)
      g.fillStyle(0x000000, 1)
      g.fillCircle(cx - 12, cy - 8, 5)
      g.fillCircle(cx + 12, cy - 8, 5)
      const rt = this.add.renderTexture(cx, cy, 80, 80).setOrigin(0.5)
      rt.draw(g, 40, 40)
      g.destroy()
      this.gelpiyoSprite = this.add.image(cx, cy, '__DEFAULT').setVisible(false)
    }

    this.tweens.add({
      targets: this.gelpiyoSprite,
      y: cy - 8,
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  /**
   * アイドルアニメーションフレームを切り替える (Req 19.3: 3 種類のアニメ)
   */
  private _updateIdleAnimation(time: number): void {
    if (!this.textures.exists('gelpiyo_idle1')) return
    if (!this.gelpiyoSprite?.visible) return

    if (time - this.lastIdleFrameTime >= IDLE_FRAME_DURATION_MS) {
      this.idleFrameIndex = (this.idleFrameIndex + 1) % IDLE_FRAME_COUNT
      const key = `gelpiyo_idle${this.idleFrameIndex + 1}`
      if (this.textures.exists(key)) {
        this.gelpiyoSprite.setTexture(key)
      }
      this.lastIdleFrameTime = time
    }
  }

  // -------------------------------------------------------------------------
  // ハイスコア表示 (Req 1.4, 1.7)
  // -------------------------------------------------------------------------

  private _createHighScoreDisplay(width: number, height: number): void {
    const highScore = StorageManager.loadHighScore()
    this.add
      .text(width / 2, height * 0.48, `🏆 ハイスコア: ${highScore}`, {
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial, sans-serif',
        fontSize: '20px',
        color: '#FFE135',
        stroke: '#442200',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5)
  }

  // -------------------------------------------------------------------------
  // デイリーチャレンジ表示 (Req 18.4)
  // -------------------------------------------------------------------------

  private _createDailyChallengeDisplay(width: number, height: number): void {
    const challenge: DailyChallenge = StorageManager.loadDailyChallenge()

    // 目標ラベルを日本語に変換
    const typeLabel: Record<DailyChallenge['type'], string> = {
      score: 'スコア',
      items: 'アイテム取得数',
      survive: '生存時間（秒）',
    }

    const objectiveText = `${typeLabel[challenge.type]}: ${challenge.objective}`
    const completedMark = challenge.completed ? '✅ 達成済み！' : '⭐ 挑戦中'

    // 背景パネル
    const panelX = width / 2
    const panelY = height * 0.58
    const panelW = 340
    const panelH = 52

    const panel = this.add.graphics()
    panel.fillStyle(0x001a4a, 0.7)
    panel.lineStyle(1.5, 0x3a6ea5, 0.9)
    panel.fillRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 10)
    panel.strokeRoundedRect(panelX - panelW / 2, panelY - panelH / 2, panelW, panelH, 10)

    // ラベル
    this.add
      .text(panelX, panelY - 10, `📅 デイリーチャレンジ: ${objectiveText}`, {
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial, sans-serif',
        fontSize: '13px',
        color: '#a8d8f0',
      })
      .setOrigin(0.5)

    this.add
      .text(panelX, panelY + 11, completedMark, {
        fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial, sans-serif',
        fontSize: '13px',
        color: challenge.completed ? '#88ff88' : '#ffdd88',
      })
      .setOrigin(0.5)
  }

  // -------------------------------------------------------------------------
  // START プロンプト (Req 1.5)
  // -------------------------------------------------------------------------

  private _createStartPrompt(width: number, height: number): void {
    // シンプルで読みやすいプロンプト
    const pY = height * 0.68
    const pW = 240, pH = 42

    const pBg = this.add.graphics().setDepth(3)
    pBg.fillStyle(0x002244, 0.88)
    pBg.lineStyle(2, 0x44aaff, 1)
    pBg.fillRoundedRect(width / 2 - pW / 2, pY - pH / 2, pW, pH, 12)
    pBg.strokeRoundedRect(width / 2 - pW / 2, pY - pH / 2, pW, pH, 12)

    const prompt = this.add.text(width / 2, pY, 'タップでスタート！', {
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial, sans-serif',
      fontSize: '21px',
      color: '#ffffff',
      stroke: '#002244',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4)

    this.startPromptTween = this.tweens.add({
      targets: [prompt, pBg],
      alpha: 0.35,
      duration: 750,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    })
  }

  // -------------------------------------------------------------------------
  // キャラクター選択ボタン (Req 21.1)
  // -------------------------------------------------------------------------

  private _createCharacterSelectButton(width: number, height: number): void {
    const btnX = width / 2
    const btnY = height * 0.77

    const bg = this.add.graphics().setDepth(2)
    bg.fillStyle(0x003322, 0.92)
    bg.lineStyle(2, 0x00cc88, 1)
    bg.fillRoundedRect(btnX - 110, btnY - 22, 220, 44, 11)
    bg.strokeRoundedRect(btnX - 110, btnY - 22, 220, 44, 11)

    const label = this.add.text(btnX, btnY, '👾 キャラクター選択', {
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial, sans-serif',
      fontSize: '17px',
      color: '#aaffdd',
      stroke: '#001a11',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3)

    label.setInteractive(
      new Phaser.Geom.Rectangle(-110, -22, 220, 44),
      Phaser.Geom.Rectangle.Contains,
    )
    label.on('pointerover', () => { bg.clear(); bg.fillStyle(0x005533, 0.95); bg.lineStyle(2, 0x44ffbb, 1); bg.fillRoundedRect(btnX - 110, btnY - 22, 220, 44, 11); bg.strokeRoundedRect(btnX - 110, btnY - 22, 220, 44, 11) })
    label.on('pointerout',  () => { bg.clear(); bg.fillStyle(0x003322, 0.92); bg.lineStyle(2, 0x00cc88, 1); bg.fillRoundedRect(btnX - 110, btnY - 22, 220, 44, 11); bg.strokeRoundedRect(btnX - 110, btnY - 22, 220, 44, 11) })
    label.on('pointerdown', () => {
      if (this.transitioning) return
      this.transitioning = true
      this.scene.start('CharacterSelectScene')
    })
  }

  // -------------------------------------------------------------------------
  // 実績ボタン (Req 16.4)
  // -------------------------------------------------------------------------

  private _createAchievementButton(width: number, height: number): void {
    const btnX = width / 2
    const btnY = height * 0.855

    const bg = this.add.graphics().setDepth(2)
    bg.fillStyle(0x332200, 0.92)
    bg.lineStyle(2, 0xffcc00, 1)
    bg.fillRoundedRect(btnX - 85, btnY - 20, 170, 40, 11)
    bg.strokeRoundedRect(btnX - 85, btnY - 20, 170, 40, 11)

    const label = this.add.text(btnX, btnY, '🏆 実績一覧', {
      fontFamily: '"Hiragino Kaku Gothic ProN", "Noto Sans JP", Arial, sans-serif',
      fontSize: '17px',
      color: '#ffdd55',
      stroke: '#221100',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3)

    label.setInteractive(
      new Phaser.Geom.Rectangle(-85, -20, 170, 40),
      Phaser.Geom.Rectangle.Contains,
    )
    label.on('pointerdown', () => {
      if (this.transitioning) return
      this.transitioning = true
      this.scene.start('AchievementScene')
    })
  }

  // -------------------------------------------------------------------------
  // ミュートトグルボタン (Req 13.7)
  // -------------------------------------------------------------------------

  private _createMuteButton(width: number, _height: number): void {
    this.muteButton = this.add
      .text(width - 16, 16, BGMManager.isMuted() ? '🔇' : '🔊', {
        fontFamily: 'Arial',
        fontSize: '26px',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })

    this.muteButton.on('pointerdown', () => {
      BGMManager.toggleMute()
      this.muteButton.setText(BGMManager.isMuted() ? '🔇' : '🔊')
    })
  }

  // -------------------------------------------------------------------------
  // 入力ハンドラ (Req 2.1, 2.2)
  // -------------------------------------------------------------------------

  private _setupInput(): void {
    // Space キーでゲーム開始 (Req 2.1)
    this.input.keyboard?.on('keydown-SPACE', () => {
      BGMManager.userInteracted('title')
      this._startGame()
    })

    // ポインターダウン（タップ・クリック）でゲーム開始 (Req 2.2)
    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, targets: unknown[]) => {
      // 全てのタップでBGMを開始（AudioContext resume含む）
      BGMManager.userInteracted('title')
      // インタラクティブな UI 上のクリックは無視（ボタン類がその下に処理される）
      if (targets && (targets as Phaser.GameObjects.GameObject[]).length > 0) return
      this._startGame()
    })
  }

  /**
   * GameScene へ遷移する（多重遷移防止付き）
   */
  private _startGame(): void {
    if (this.transitioning) return
    this.transitioning = true

    // 点滅 tween を止めてからフェードアウト
    if (this.startPromptTween) {
      this.startPromptTween.stop()
    }

    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene')
    })
  }
}

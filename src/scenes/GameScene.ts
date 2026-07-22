/**
 * GameScene - Main gameplay scene (full integration)
 *
 * Requirements: 2.3, 2.4, 3.1-3.5, 4.1-4.5, 5.1-5.5, 6.1-6.4, 7.1-7.7,
 *               8.1-8.6, 9.1-9.5, 10.1-10.6, 11.1-11.6, 12.5-12.7,
 *               13.1-13.7, 15.1-15.6, 17.1-17.5, 19.1-19.5, 20.1-20.3
 */

import Phaser from 'phaser'
import { PhysicsEngine } from '../systems/PhysicsEngine'
import { ScrollEngine } from '../systems/ScrollEngine'
import { ObstacleGenerator } from '../systems/ObstacleGenerator'
import { CollisionDetector } from '../systems/CollisionDetector'
import { ScoreSystem } from '../systems/ScoreSystem'
import { DifficultyManager } from '../systems/DifficultyManager'
import { ItemSystem } from '../systems/ItemSystem'
import { PowerUpSystem } from '../systems/PowerUpSystem'
import { ComboSystem } from '../systems/ComboSystem'
import { BackgroundRenderer } from '../systems/BackgroundRenderer'
import { AchievementSystem } from '../systems/AchievementSystem'
import { DailyChallengeSystem } from '../systems/DailyChallengeSystem'
import { StorageManager } from '../utils/StorageManager'
import { BGMManager } from '../systems/BGMManager'
import {
  CHARACTER_CONFIGS,
  SCORE_UI,
  UI_TIMING,
  POWERUP_CONFIGS,
  DEATH_ANIMATION,
  type AreaTheme,
  type CharacterType,
} from '../config'
import type { Player } from '../models/Player'
import type { GameBounds } from '../models/GameBounds'

export class GameScene extends Phaser.Scene {
  // --- Systems ---
  private physicsEngine!: PhysicsEngine
  private scrollEngine!: ScrollEngine
  private obstacleGenerator!: ObstacleGenerator
  private collisionDetector!: CollisionDetector
  private scoreSystem!: ScoreSystem
  private difficultyManager!: DifficultyManager
  private itemSystem!: ItemSystem
  private powerUpSystem!: PowerUpSystem
  private comboSystem!: ComboSystem
  private bgRenderer!: BackgroundRenderer
  private achievementSystem!: AchievementSystem
  private dailyChallengeSystem!: DailyChallengeSystem

  // --- Player state ---
  private player!: Player
  private playerImage!: Phaser.GameObjects.Image
  private playerGraphics!: Phaser.GameObjects.Graphics
  private bubbleShieldGraphics!: Phaser.GameObjects.Graphics
  private usePngSprite: boolean = false

  // --- Death animation state ---
  private deathAnimActive: boolean = false
  private deathVelocityY: number = 0

  // --- UI ---
  private scoreText!: Phaser.GameObjects.Text
  private comboText!: Phaser.GameObjects.Text
  private powerUpText!: Phaser.GameObjects.Text
  private areaNotifText!: Phaser.GameObjects.Text
  private pauseButton!: Phaser.GameObjects.Text

  // --- Game state ---
  private gameActive: boolean = false
  private paused: boolean = false
  private currentArea: AreaTheme = 'shallow_reef'
  private selectedCharacter: CharacterType = 'gelpiyo'
  private lastMilestone: number = 0
  private totalItemsCollected: number = 0

  // --- Item spawn timer ---
  itemSpawnTimer: number = 0
  private readonly ITEM_SPAWN_INTERVAL_MS: number = 800  // 元の2000msの約2.5倍頻度

  // --- Special effect timers ---
  scoreDoubleTimer: number = 0
  invincibleTimer: number = 0

  // --- Item / Obstacle graphics maps ---
  private itemGraphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map()
  private obstacleGraphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map()

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { characterType?: CharacterType }): void {
    this.selectedCharacter = data?.characterType ?? StorageManager.loadSelectedCharacter()
  }

  // -------------------------------------------------------------------------
  // preload
  // -------------------------------------------------------------------------

  preload(): void {
    const chars: CharacterType[] = ['gelpiyo', 'momopliyo', 'palpiyo', 'midoripiyo']
    const states = ['swim_up', 'fall_down', 'idle1', 'hit']
    for (const c of chars) {
      for (const s of states) {
        const key = `${c}_${s}`
        if (!this.textures.exists(key)) {
          this.load.image(key, `assets/sprites/${key}.png`)
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  create(): void {
    const W = this.scale.width
    const H = this.scale.height

    this.bgRenderer = new BackgroundRenderer(this)

    this.scrollEngine = new ScrollEngine()
    this.physicsEngine = new PhysicsEngine(0, H)
    this.physicsEngine.loadCharacterPhysics(CHARACTER_CONFIGS[this.selectedCharacter])
    this.obstacleGenerator = new ObstacleGenerator(W, H)
    this.collisionDetector = new CollisionDetector()
    this.scoreSystem = new ScoreSystem()
    this.scoreSystem.initialize()
    this.difficultyManager = new DifficultyManager()
    this.itemSystem = new ItemSystem()
    this.powerUpSystem = new PowerUpSystem(this.scrollEngine)
    this.comboSystem = new ComboSystem()
    this.achievementSystem = new AchievementSystem()
    this.achievementSystem.load()
    this.dailyChallengeSystem = new DailyChallengeSystem()

    this.achievementSystem.setNotifyCallback((achievement) => {
      this._showAchievementNotification(achievement.title)
    })

    this.player = {
      x: 100,
      y: H / 2,
      velocityY: 0,
      radius: 22,
      hasBubbleShield: false,
      animationState: 'fall_down',
    }

    this.playerGraphics = this.add.graphics().setDepth(20)
    this.bubbleShieldGraphics = this.add.graphics().setDepth(21)

    const swimKey = `${this.selectedCharacter}_swim_up`
    this.usePngSprite = this.textures.exists(swimKey)
    if (this.usePngSprite) {
      this.playerImage = this.add.image(this.player.x, this.player.y, swimKey)
        .setDisplaySize(80, 80)
        .setDepth(20)
    }

    this.deathAnimActive = false
    this.deathVelocityY = 0

    this._createUI(W, H)

    this.input.keyboard?.on('keydown-SPACE', () => this._onJump())
    this.input.keyboard?.on('keydown-ESC', () => this._togglePause())
    this.input.on('pointerdown', (_ptr: Phaser.Input.Pointer, targets: unknown[]) => {
      // ポーズボタン以外のタップはジャンプ
      if (targets && (targets as Phaser.GameObjects.GameObject[]).length > 0) return
      this._onJump()
    })

    // ゲームBGM開始
    BGMManager.play('game')
    this.paused = false

    this.currentArea = 'shallow_reef'
    this.lastMilestone = 0
    this.totalItemsCollected = 0
    this.itemSpawnTimer = 0
    this.scoreDoubleTimer = 0
    this.invincibleTimer = 0
    this.itemGraphicsMap.clear()
    this.obstacleGraphicsMap.clear()
    this.gameActive = true
  }

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  update(_time: number, delta: number): void {
    if (this.deathAnimActive) {
      this._updateDeathAnimation(delta)
      return
    }
    if (!this.gameActive || this.paused) return

    const dtSec = delta / 1000

    this.difficultyManager.update(delta)
    const newArea = this.difficultyManager.getAreaForScore(this.scoreSystem.currentScore)
    if (newArea !== this.currentArea) {
      this._onAreaChange(newArea)
    }

    this.scrollEngine.setSpeed(this.difficultyManager.state.scrollSpeed)
    this.obstacleGenerator.setScrollSpeed(this.scrollEngine.currentSpeed)
    this.obstacleGenerator.setSpawnInterval(this.difficultyManager.state.spawnInterval)
    this.bgRenderer.setScrollSpeed(this.scrollEngine.currentSpeed)

    this.bgRenderer.update(delta)
    this.powerUpSystem.update(delta)

    if (this.scoreDoubleTimer > 0) {
      this.scoreDoubleTimer = Math.max(0, this.scoreDoubleTimer - delta)
    }
    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - delta)
    }

    this.physicsEngine.update(this.player, dtSec)
    this.player.animationState = this.player.velocityY < 0 ? 'swim_up' : 'fall_down'

    this.obstacleGenerator.update(dtSec)
    this.obstacleGenerator.removeOffscreen()
    this._syncObstacleGraphics()

    if (this.powerUpSystem.isActive('magnet')) {
      this._applyMagnet(dtSec)
    }
    this.itemSystem.update(this.scrollEngine.currentSpeed, dtSec)
    this.itemSystem.removeOffscreen(this.scale.width)
    this._syncItemGraphics()

    this.itemSpawnTimer += delta
    if (this.itemSpawnTimer >= this.ITEM_SPAWN_INTERVAL_MS) {
      this.itemSpawnTimer -= this.ITEM_SPAWN_INTERVAL_MS
      this._spawnItemWave()
    }

    this._checkCollisions()
    this._checkObstaclePassed()
    this._updateUI()
    this._drawPlayer()
  }

  // -------------------------------------------------------------------------
  // resetGame
  // -------------------------------------------------------------------------

  resetGame(): void {
    this.scoreSystem.reset()
    this.difficultyManager.reset()
    this.comboSystem.reset()

    for (const t of this.powerUpSystem.getActiveTypes()) {
      this.powerUpSystem.deactivate(t)
    }

    this.obstacleGraphicsMap.forEach(g => g.destroy())
    this.obstacleGraphicsMap.clear()
    this.itemGraphicsMap.forEach(g => g.destroy())
    this.itemGraphicsMap.clear()
    this.obstacleGenerator = new ObstacleGenerator(this.scale.width, this.scale.height)
    this.itemSystem = new ItemSystem()

    this.player.x = 100
    this.player.y = this.scale.height / 2
    this.player.velocityY = 0
    this.player.hasBubbleShield = false
    this.player.animationState = 'fall_down'
    if (this.playerImage) this.playerImage.setPosition(100, this.scale.height / 2)

    this.deathAnimActive = false
    this.deathVelocityY = 0

    this.currentArea = 'shallow_reef'
    this.lastMilestone = 0
    this.totalItemsCollected = 0
    this.itemSpawnTimer = 0
    this.scoreDoubleTimer = 0
    this.invincibleTimer = 0
    this.gameActive = true

    if (this.scoreText) this.scoreText.setText('Score: 0')
    this.paused = false
    this.tweens.resumeAll()
    this.time.paused = false
    if (this.pauseButton) this.pauseButton.setText('⏸')
  }
  // -------------------------------------------------------------------------

  triggerGameOver(): void {
    if (!this.gameActive) return
    this.gameActive = false
    this.scoreSystem.checkAndUpdateHighScore()
    this._startDeathAnimation()
  }

  private _startDeathAnimation(): void {
    this.deathAnimActive = true
    this.player.animationState = 'hit'
    this.deathVelocityY = DEATH_ANIMATION.JUMP_IMPULSE
    BGMManager.sfx.playGameOver()
    BGMManager.play('gameover')
  }

  private _updateDeathAnimation(delta: number): void {
    const dtSec = delta / 1000
    this.deathVelocityY += DEATH_ANIMATION.GRAVITY * dtSec
    this.player.y += this.deathVelocityY * dtSec
    this._drawPlayer()
    this.bubbleShieldGraphics.clear()

    if (this.player.y > this.scale.height + 80) {
      this.deathAnimActive = false
      this.time.delayedCall(DEATH_ANIMATION.GAMEOVER_DELAY_MS, () => {
        this.scene.start('GameOverScene', {
          score: this.scoreSystem.currentScore,
          highScore: this.scoreSystem.highScore,
          isNewRecord: this.scoreSystem.currentScore > 0
            && this.scoreSystem.currentScore >= this.scoreSystem.highScore,
        })
      })
    }
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  private _spawnItemWave(): void {
    const W = this.scale.width
    const H = this.scale.height
    const count = Phaser.Math.Between(3, 6)  // 2〜4 → 3〜6（さらに増量・約2倍）

    // アクティブな障害物のX範囲を取得してアイテムと重ならないようにする
    const obstacles = this.obstacleGenerator.getActiveObstacles()

    for (let i = 0; i < count; i++) {
      const spawnX = W + 30 + i * 50

      // このX位置に近い障害物がないか確認
      const nearObstacle = obstacles.find(
        obs => Math.abs(obs.x - spawnX) < 80
      )

      let spawnY: number
      if (nearObstacle && nearObstacle.type === 'cave_wall'
          && nearObstacle.gapY !== undefined && nearObstacle.gapSize !== undefined) {
        // cave_wallのギャップ内に配置
        const gapTop = nearObstacle.gapY - nearObstacle.gapSize / 2 + 20
        const gapBottom = nearObstacle.gapY + nearObstacle.gapSize / 2 - 20
        if (gapBottom - gapTop > 40) {
          spawnY = Phaser.Math.Between(Math.ceil(gapTop), Math.floor(gapBottom))
        } else {
          spawnY = nearObstacle.gapY  // ギャップ中央
        }
      } else if (nearObstacle) {
        // cave_wall以外の障害物がある場合はY位置をずらす
        const obsCenter = nearObstacle.y + nearObstacle.height / 2
        const avoid = nearObstacle.height / 2 + 30
        // 障害物の上か下かをランダムに選ぶ
        spawnY = Math.random() < 0.5
          ? Phaser.Math.Clamp(obsCenter - avoid, 60, H - 60)
          : Phaser.Math.Clamp(obsCenter + avoid, 60, H - 60)
      } else {
        // 障害物なし — 自由にランダム配置
        spawnY = Phaser.Math.Between(60, H - 60)
      }

      this.itemSystem.spawnItem(spawnX, spawnY)
    }
  }

  private _onJump(): void {
    if (this.paused) return
    if (!this.gameActive) return
    BGMManager.userInteracted('game')  // ゲームBGM開始/維持
    this.physicsEngine.applyJump(this.player)
    BGMManager.sfx.playJump()
  }

  private _togglePause(): void {
    if (!this.gameActive || this.deathAnimActive) return
    this.paused = !this.paused
    if (this.paused) {
      // BGMを一時停止
      BGMManager.pause()
      // Phaserの物理・タイムイベントも完全停止
      this.physics?.world?.pause()
      this.tweens.pauseAll()
      this.time.paused = true
    } else {
      // BGMを再開
      BGMManager.resume()
      this.physics?.world?.resume()
      this.tweens.resumeAll()
      this.time.paused = false
    }
    // ボタンアイコンを切り替え
    if (this.pauseButton) {
      this.pauseButton.setText(this.paused ? '▶' : '⏸')
    }
  }

  private _onAreaChange(newArea: AreaTheme): void {
    this.currentArea = newArea
    this.bgRenderer.transitionToTheme(newArea, UI_TIMING.BACKGROUND_TRANSITION_DURATION_MS)
    this._showAreaNotification(newArea)
    this.achievementSystem.check({ type: 'area_reached', area: newArea })
    this.dailyChallengeSystem.updateProgress({ type: 'area_reached', area: newArea })
  }

  private _checkCollisions(): void {
    const bounds: GameBounds = {
      top: 0,
      bottom: this.scale.height,
      left: 0,
      right: this.scale.width,
    }

    if (this.collisionDetector.checkBoundaryCollision(this.player, bounds) !== null) {
      this.triggerGameOver()
      return
    }

    const hitObstacle = this.collisionDetector.checkObstacleCollision(
      this.player,
      this.obstacleGenerator.getActiveObstacles()
    )
    if (hitObstacle) {
      if (this.invincibleTimer > 0) {
        // invincible - no damage
      } else if (this.powerUpSystem.isActive('bubble_shield') || this.player.hasBubbleShield) {
        this.player.hasBubbleShield = false
        if (this.powerUpSystem.isActive('bubble_shield')) {
          this.powerUpSystem.deactivate('bubble_shield')
        }
      } else {
        this.triggerGameOver()
        return
      }
    }

    const hitItem = this.collisionDetector.checkItemCollision(
      this.player,
      this.itemSystem.getActiveItems()
    )
    if (hitItem) {
      const result = this.itemSystem.collectItem(hitItem, this.player)

      if (result.pointsAwarded > 0) {
        const comboMult = this.comboSystem.getMultiplier()
        const doubleBonus = this.scoreDoubleTimer > 0 ? 2 : 1
        const points = this.scoreSystem.applyComboMultiplier(comboMult, result.pointsAwarded) * doubleBonus
        this.scoreSystem.incrementScore(points)
        this.comboSystem.onItemCollected()
        this.totalItemsCollected++
        this._onItemCollected()
        const label = doubleBonus > 1 ? `+${points} x2!` : `+${points}`
        this._showItemPopup(hitItem.x, hitItem.y, label, result.itemType)
        BGMManager.sfx.playItem(result.itemType)
      }

      switch (result.effect) {
        case 'shield':
          this._showItemPopup(hitItem.x, hitItem.y, 'Shield!', result.itemType)
          BGMManager.sfx.playItem(result.itemType)
          break
        case 'invincible':
          this.invincibleTimer = result.effectDurationMs ?? 2000
          this._showItemPopup(hitItem.x, hitItem.y, 'Invincible!', result.itemType)
          BGMManager.sfx.playItem(result.itemType)
          break
        case 'score_double':
          this.scoreDoubleTimer = result.effectDurationMs ?? 5000
          this._showItemPopup(hitItem.x, hitItem.y, 'Score x2!', result.itemType)
          BGMManager.sfx.playItem(result.itemType)
          break
        case 'slow':
          this.powerUpSystem.activate('slow_motion')
          this._showItemPopup(hitItem.x, hitItem.y, 'Slow!', result.itemType)
          BGMManager.sfx.playItem(result.itemType)
          break
      }

      const g = this.itemGraphicsMap.get(hitItem.id)
      if (g) { g.destroy(); this.itemGraphicsMap.delete(hitItem.id) }
    }

    const push = this.obstacleGenerator.applyCurrentZone(this.player)
    if (push !== 0) {
      this.player.x = Phaser.Math.Clamp(
        this.player.x + push * (1 / 60),
        this.player.radius,
        this.scale.width - this.player.radius
      )
    }
  }

  private _checkObstaclePassed(): void {
    const obstacles = this.obstacleGenerator.getActiveObstacles()
    for (const obs of obstacles) {
      if (obs.type === 'cave_wall' && !obs.scored && obs.x + obs.width < this.player.x) {
        obs.scored = true
        this.scoreSystem.incrementScore(1)
        this.comboSystem.onObstaclePassed()
        BGMManager.sfx.playScore()
        this._onScoreUpdate()
      }
    }
  }

  private _onScoreUpdate(): void {
    const score = this.scoreSystem.currentScore
    if (score >= this.lastMilestone + SCORE_UI.MILESTONE_INTERVAL) {
      this.lastMilestone = Math.floor(score / SCORE_UI.MILESTONE_INTERVAL) * SCORE_UI.MILESTONE_INTERVAL
      this._showMilestoneText()
      BGMManager.sfx.playMilestone()
    }
    this.achievementSystem.check({ type: 'score_reached', score })
    this.dailyChallengeSystem.updateProgress({ type: 'score_reached', score })
  }

  private _onItemCollected(): void {
    this.achievementSystem.check({
      type: 'item_collected',
      itemType: 'pearl',
      totalCollected: this.totalItemsCollected,
    })
    this.dailyChallengeSystem.updateProgress({
      type: 'item_collected',
      itemType: 'pearl',
      totalCollected: this.totalItemsCollected,
    })
  }

  private _applyMagnet(dtSec: number): void {
    const items = this.itemSystem.getActiveItems()
    for (const item of items) {
      const dx = this.player.x - item.x
      const dy = this.player.y - item.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < POWERUP_CONFIGS.MAGNET_RADIUS_PX && dist > 1) {
        item.x += (dx / dist) * POWERUP_CONFIGS.MAGNET_ATTRACT_SPEED * dtSec
        item.y += (dy / dist) * POWERUP_CONFIGS.MAGNET_ATTRACT_SPEED * dtSec
      }
    }
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  private _drawPlayer(): void {
    const state = this.player.animationState
    const spriteKey = state === 'idle'
      ? `${this.selectedCharacter}_fall_down`
      : `${this.selectedCharacter}_${state}`

    if (this.usePngSprite && this.playerImage) {
      this.playerImage.setPosition(this.player.x, this.player.y)
      if (this.textures.exists(spriteKey)) {
        this.playerImage.setTexture(spriteKey)
      }
      this.playerImage.setAngle(state === 'swim_up' ? -15 : state === 'hit' ? 20 : 0)
      this.playerGraphics.clear()
    } else {
      this.playerGraphics.clear()
      const cfg = CHARACTER_CONFIGS[this.selectedCharacter]
      const color = parseInt(cfg.color.replace('#', ''), 16)
      const r = this.player.radius
      this.playerGraphics.fillStyle(color, 1)
      this.playerGraphics.fillCircle(this.player.x, this.player.y, r)
      this.playerGraphics.fillStyle(0xffffff, 1)
      this.playerGraphics.fillCircle(this.player.x - r * 0.3, this.player.y - r * 0.2, r * 0.35)
      this.playerGraphics.fillCircle(this.player.x + r * 0.3, this.player.y - r * 0.2, r * 0.35)
      this.playerGraphics.fillStyle(0x000000, 1)
      this.playerGraphics.fillCircle(this.player.x - r * 0.3, this.player.y - r * 0.2, r * 0.18)
      this.playerGraphics.fillCircle(this.player.x + r * 0.3, this.player.y - r * 0.2, r * 0.18)
    }

    this.bubbleShieldGraphics.clear()
    if (this.player.hasBubbleShield || this.powerUpSystem.isActive('bubble_shield')) {
      const t = this.time.now / 400
      this.bubbleShieldGraphics.lineStyle(3, 0x88eeff, 0.7 + 0.3 * Math.sin(t))
      this.bubbleShieldGraphics.strokeCircle(this.player.x, this.player.y, this.player.radius + 8)
    }
  }

  private _syncObstacleGraphics(): void {
    const obstacles = this.obstacleGenerator.getActiveObstacles()
    const activeIds = new Set(obstacles.map(o => o.id))

    this.obstacleGraphicsMap.forEach((g, id) => {
      if (!activeIds.has(id)) { g.destroy(); this.obstacleGraphicsMap.delete(id) }
    })

    for (const obs of obstacles) {
      let g = this.obstacleGraphicsMap.get(obs.id)
      if (!g) {
        g = this.add.graphics().setDepth(5)
        this.obstacleGraphicsMap.set(obs.id, g)
      }
      g.clear()

      switch (obs.type) {
        case 'cave_wall': {
          if (obs.gapY !== undefined && obs.gapSize !== undefined) {
            const half = obs.gapSize / 2
            // 上壁 — 明るいサンゴ色・緑
            g.fillStyle(0x228844, 1)
            g.fillRect(obs.x, 0, obs.width, obs.gapY - half)
            g.lineStyle(3, 0x44cc66, 1)
            g.strokeRect(obs.x, 0, obs.width, obs.gapY - half)
            // 壁の上にサンゴを描く
            g.fillStyle(0xff4466, 0.9)
            for (let ci = 0; ci < 3; ci++) {
              g.fillCircle(obs.x + 8 + ci * 15, obs.gapY - half, 5)
            }
            // 下壁
            g.fillStyle(0x228844, 1)
            g.fillRect(obs.x, obs.gapY + half, obs.width, this.scale.height - (obs.gapY + half))
            g.lineStyle(3, 0x44cc66, 1)
            g.strokeRect(obs.x, obs.gapY + half, obs.width, this.scale.height - (obs.gapY + half))
            // 壁の下にサンゴ
            g.fillStyle(0xff6633, 0.9)
            for (let ci = 0; ci < 3; ci++) {
              g.fillCircle(obs.x + 8 + ci * 15, obs.gapY + half, 5)
            }
          }
          break
        }
        case 'jellyfish': {
          // 明るいピンク・紫クラゲ
          g.fillStyle(0xff88cc, 0.9)
          g.fillCircle(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2)
          g.fillStyle(0xffccee, 0.6)
          g.fillCircle(obs.x + obs.width / 2 - 4, obs.y + obs.height / 3, obs.width / 3)
          // 触手
          g.lineStyle(1.5, 0xff55aa, 0.8)
          for (let i = -2; i <= 2; i++) {
            const tx = obs.x + obs.width / 2 + i * 6
            g.strokePoints([
              { x: tx, y: obs.y + obs.height / 2 + 8 },
              { x: tx + Math.sin(i) * 4, y: obs.y + obs.height / 2 + 22 },
            ], false)
          }
          break
        }
        case 'squid': {
          // 明るいオレンジ・紫イカ
          g.fillStyle(0xff6633, 0.9)
          g.fillEllipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width, obs.height)
          g.fillStyle(0xffaa66, 0.6)
          g.fillEllipse(obs.x + obs.width / 2 - 3, obs.y + obs.height / 2 - 6, obs.width * 0.5, obs.height * 0.4)
          // 目
          g.fillStyle(0xffffff, 1)
          g.fillCircle(obs.x + obs.width / 2 - 5, obs.y + obs.height / 2 - 3, 5)
          g.fillCircle(obs.x + obs.width / 2 + 5, obs.y + obs.height / 2 - 3, 5)
          g.fillStyle(0x222244, 1)
          g.fillCircle(obs.x + obs.width / 2 - 4, obs.y + obs.height / 2 - 3, 3)
          g.fillCircle(obs.x + obs.width / 2 + 6, obs.y + obs.height / 2 - 3, 3)
          break
        }
        case 'seaweed': {
          const phase = obs.phase ?? 0
          const sway = Math.sin(phase) * 8
          g.lineStyle(4, 0x33cc55, 0.95)
          g.strokePoints([
            { x: obs.x, y: obs.y + obs.height },
            { x: obs.x + sway * 0.3, y: obs.y + obs.height * 0.6 },
            { x: obs.x + sway * 0.7, y: obs.y + obs.height * 0.3 },
            { x: obs.x + sway, y: obs.y },
          ], false)
          g.lineStyle(3, 0x55ee66, 0.7)
          g.strokePoints([
            { x: obs.x + 8, y: obs.y + obs.height },
            { x: obs.x + 8 + sway * 0.4, y: obs.y + obs.height * 0.5 },
            { x: obs.x + 8 + sway, y: obs.y + obs.height * 0.15 },
          ], false)
          break
        }
        case 'current_zone': {
          // 明るい青緑の流れゾーン
          g.fillStyle(0x33ccff, 0.18)
          g.fillRect(obs.x, obs.y, obs.width, obs.height)
          g.lineStyle(2, 0x66eeff, 0.5)
          g.strokeRect(obs.x, obs.y, obs.width, obs.height)
          // 矢印で流れを示す
          const arrowY = obs.y + obs.height / 2
          g.lineStyle(2, 0xaaeeff, 0.6)
          for (let ai = 0; ai < 3; ai++) {
            const ax = obs.x + 15 + ai * 30
            g.strokePoints([{ x: ax, y: arrowY }, { x: ax + 14, y: arrowY }], false)
            g.fillStyle(0xaaeeff, 0.6)
            g.fillTriangle(ax + 14, arrowY - 5, ax + 22, arrowY, ax + 14, arrowY + 5)
          }
          break
        }
      }
    }
  }

  private _syncItemGraphics(): void {
    const items = this.itemSystem.getActiveItems()
    const activeIds = new Set(items.map(i => i.id))

    this.itemGraphicsMap.forEach((g, id) => {
      if (!activeIds.has(id)) { g.destroy(); this.itemGraphicsMap.delete(id) }
    })

    for (const item of items) {
      let g = this.itemGraphicsMap.get(item.id)
      if (!g) {
        g = this.add.graphics().setDepth(15)
        this.itemGraphicsMap.set(item.id, g)
      }
      g.clear()

      const t = this.time.now / 600
      const pulse = 1 + Math.sin(t) * 0.10
      const r = item.radius * pulse

      switch (item.type) {
        case 'golden_egg': {
          const hue = (this.time.now / 30) % 360
          const glowColor = Phaser.Display.Color.HSLToColor(hue / 360, 0.9, 0.6).color
          g.fillStyle(glowColor, 0.4)
          g.fillEllipse(item.x, item.y, r * 2.4, r * 3.0)
          g.fillStyle(0xffd700, 0.95)
          g.fillEllipse(item.x, item.y, r * 2, r * 2.6)
          g.fillStyle(0xffee88, 0.7)
          g.fillEllipse(item.x - r * 0.3, item.y - r * 0.6, r * 0.7, r * 0.8)
          break
        }
        case 'pearl': {
          g.fillStyle(0xeeeeff, 0.95)
          g.fillCircle(item.x, item.y, r)
          g.fillStyle(0xffffff, 0.7)
          g.fillCircle(item.x - r * 0.3, item.y - r * 0.3, r * 0.35)
          g.lineStyle(1.5, 0xaabbcc, 0.5)
          g.strokeCircle(item.x, item.y, r)
          break
        }
        case 'treasure_jar': {
          g.fillStyle(0x336644, 0.9)
          g.fillEllipse(item.x, item.y + r * 0.2, r * 2, r * 2.2)
          g.fillStyle(0x557766, 0.8)
          g.fillRect(item.x - r * 0.7, item.y - r * 1.2, r * 1.4, r * 0.5)
          g.fillStyle(0x99ccaa, 0.5)
          g.fillEllipse(item.x - r * 0.3, item.y - r * 0.3, r * 0.6, r * 0.8)
          break
        }
        case 'glowing_jelly': {
          const glowAlpha = 0.3 + Math.sin(t * 2) * 0.2
          g.fillStyle(0x88eeff, glowAlpha)
          g.fillCircle(item.x, item.y, r * 1.5)
          g.fillStyle(0xaaffff, 0.9)
          g.fillEllipse(item.x, item.y - r * 0.2, r * 2, r * 1.4)
          g.lineStyle(1, 0x44ccff, 0.8)
          for (let i = -1; i <= 1; i++) {
            g.strokePoints([
              { x: item.x + i * r * 0.5, y: item.y + r * 0.5 },
              { x: item.x + i * r * 0.7, y: item.y + r * 1.5 },
            ], false)
          }
          break
        }
        case 'gold_coin': {
          g.fillStyle(0xcc9900, 0.9)
          g.fillCircle(item.x, item.y, r)
          g.fillStyle(0xffcc00, 0.95)
          g.fillCircle(item.x, item.y, r * 0.85)
          g.fillStyle(0xffee44, 0.8)
          g.fillCircle(item.x - r * 0.2, item.y - r * 0.2, r * 0.35)
          g.lineStyle(2, 0x885500, 0.7)
          g.strokePoints([{ x: item.x, y: item.y - r * 0.4 }, { x: item.x, y: item.y + r * 0.4 }], false)
          break
        }
        case 'deep_fish': {
          g.fillStyle(0x334455, 0.9)
          g.fillEllipse(item.x, item.y, r * 2.2, r * 1.6)
          g.fillStyle(0x88ffcc, 0.9)
          g.fillCircle(item.x - r * 0.3, item.y - r * 1.1, r * 0.4)
          g.fillStyle(0xffffff, 0.7)
          g.fillCircle(item.x - r * 0.3, item.y - r * 1.1, r * 0.2)
          g.fillStyle(0xffffff, 1)
          g.fillCircle(item.x + r * 0.5, item.y - r * 0.2, r * 0.3)
          g.fillStyle(0x000000, 1)
          g.fillCircle(item.x + r * 0.55, item.y - r * 0.2, r * 0.15)
          break
        }
        case 'starfish': {
          g.fillStyle(0xff4422, 0.95)
          const pts: { x: number; y: number }[] = []
          for (let i = 0; i < 10; i++) {
            const angle = (Math.PI / 5) * i - Math.PI / 2
            const rad = i % 2 === 0 ? r : r * 0.4
            pts.push({ x: item.x + Math.cos(angle) * rad, y: item.y + Math.sin(angle) * rad })
          }
          g.fillPoints(pts, true)
          g.fillStyle(0xff8866, 0.6)
          g.fillCircle(item.x, item.y, r * 0.35)
          break
        }
        case 'time_capsule': {
          g.fillStyle(0xaa8833, 0.9)
          g.fillCircle(item.x, item.y, r)
          g.fillStyle(0xddcc88, 0.8)
          g.fillCircle(item.x, item.y, r * 0.8)
          g.lineStyle(1.5, 0x665511, 0.9)
          g.strokePoints([{ x: item.x, y: item.y }, { x: item.x, y: item.y - r * 0.55 }], false)
          g.strokePoints([{ x: item.x, y: item.y }, { x: item.x + r * 0.4, y: item.y + r * 0.2 }], false)
          g.strokeCircle(item.x, item.y, r * 0.8)
          break
        }
        case 'bubble_shield': {
          const alpha2 = 0.2 + Math.sin(t * 1.5) * 0.1
          g.fillStyle(0x88ccff, alpha2)
          g.fillCircle(item.x, item.y, r * 1.2)
          g.lineStyle(2, 0xaaddff, 0.85)
          g.strokeCircle(item.x, item.y, r)
          g.fillStyle(0xffffff, 0.5)
          g.fillCircle(item.x - r * 0.35, item.y - r * 0.35, r * 0.28)
          break
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // UI creation & update
  // -------------------------------------------------------------------------

  private _createUI(W: number, _H: number): void {
    this.scoreText = this.add.text(W - 16, 16, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000033',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(30)

    this.comboText = this.add.text(W / 2, 16, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffee44',
      stroke: '#443300',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setDepth(30)

    this.powerUpText = this.add.text(16, 54, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#88eeff',
      stroke: '#003344',
      strokeThickness: 2,
    }).setOrigin(0, 0).setDepth(30)

    this.areaNotifText = this.add.text(W / 2, 80, '', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000033',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(30)

    // ポーズボタン（左上）
    this.pauseButton = this.add.text(16, 16, '⏸', {
      fontFamily: 'Arial',
      fontSize: '28px',
    }).setOrigin(0, 0).setDepth(31).setInteractive({ useHandCursor: true })

    this.pauseButton.on('pointerdown', () => this._togglePause())
  }

  private _updateUI(): void {
    this.scoreText.setText(`Score: ${this.scoreSystem.currentScore}`)

    const combo = this.comboSystem.count
    if (combo >= 3) {
      const mult = this.comboSystem.getMultiplier()
      this.comboText.setText(`Combo ${combo} x${mult}`)
    } else {
      this.comboText.setText('')
    }

    const lines: string[] = []
    if (this.scoreDoubleTimer > 0) {
      lines.push(`x2 Score: ${(this.scoreDoubleTimer / 1000).toFixed(1)}s`)
    }
    if (this.invincibleTimer > 0) {
      lines.push(`Invincible: ${(this.invincibleTimer / 1000).toFixed(1)}s`)
    }
    const shieldRemain = this.powerUpSystem.getRemainingDuration('bubble_shield')
    if (shieldRemain > 0) {
      lines.push(`Shield: ${(shieldRemain / 1000).toFixed(1)}s`)
    }
    const slowRemain = this.powerUpSystem.getRemainingDuration('slow_motion')
    if (slowRemain > 0) {
      lines.push(`Slow: ${(slowRemain / 1000).toFixed(1)}s`)
    }
    const magnetRemain = this.powerUpSystem.getRemainingDuration('magnet')
    if (magnetRemain > 0) {
      lines.push(`Magnet: ${(magnetRemain / 1000).toFixed(1)}s`)
    }
    this.powerUpText.setText(lines.join('\n'))
  }

  private _showAreaNotification(area: AreaTheme): void {
    const labels: Record<AreaTheme, string> = {
      shallow_reef: 'Shallow Reef',
      cave: 'Cave',
      sunken_ship: 'Sunken Ship',
      deep_ruins: 'Deep Ruins',
      ultra_deep: 'Ultra Deep',
    }
    this.areaNotifText.setText(labels[area] ?? area)
    this.areaNotifText.setAlpha(1)
    this.tweens.add({
      targets: this.areaNotifText,
      alpha: 0,
      duration: UI_TIMING.AREA_NOTIFICATION_DURATION_MS,
      ease: 'Linear',
    })
  }

  private _showMilestoneText(): void {
    const W = this.scale.width
    const H = this.scale.height
    const score = this.scoreSystem.currentScore
    const msg = score > 0 && score % 50 === 0 ? `🎉 ${score} POINTS!! 🎉` : 'GREAT!!'

    // 画面揺れ
    this.cameras.main.shake(180, 0.012)

    // フラッシュ
    const flash = this.add.graphics().setDepth(48)
    flash.fillStyle(0xffffff, 0.45)
    flash.fillRect(0, 0, W, H)
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, ease: 'Power2.Out', onComplete: () => flash.destroy() })

    // メインテキスト
    const txt = this.add.text(W / 2, H / 2, msg, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: '46px',
      color: '#ffdd00',
      stroke: '#aa4400',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(50).setScale(0.2)

    this.tweens.add({
      targets: txt, scaleX: 1.3, scaleY: 1.3,
      duration: 130, ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: txt, y: H / 2 - 100, alpha: 0, scaleX: 0.7, scaleY: 0.7,
          duration: SCORE_UI.MILESTONE_DISPLAY_DURATION_MS,
          ease: 'Cubic.Out', onComplete: () => txt.destroy(),
        })
      }
    })

    // 花火パーティクル（5方向）
    const fireworkColors = [0xff4444, 0xff8800, 0xffdd00, 0x44ff88, 0x44aaff, 0xff44ff]
    for (let burst = 0; burst < 5; burst++) {
      const bx = Phaser.Math.Between(W * 0.1, W * 0.9)
      const by = Phaser.Math.Between(H * 0.1, H * 0.6)
      const delay = burst * 80
      for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14
        const speed = Phaser.Math.Between(100, 220)
        const col = fireworkColors[Phaser.Math.Between(0, fireworkColors.length - 1)]
        const dot = this.add.graphics().setDepth(49)
        dot.fillStyle(col, 1)
        dot.fillCircle(0, 0, Phaser.Math.Between(3, 7))
        dot.x = bx; dot.y = by
        this.tweens.add({
          targets: dot,
          x: bx + Math.cos(angle) * speed * 0.9,
          y: by + Math.sin(angle) * speed * 0.9 + 60,
          alpha: 0, scaleX: 0, scaleY: 0,
          duration: Phaser.Math.Between(500, 850),
          delay,
          ease: 'Power2.Out',
          onComplete: () => dot.destroy(),
        })
      }
    }

    // 虹色テキストシャワー
    const emojis = ['⭐', '💫', '✨', '🌟', '💥']
    for (let i = 0; i < 10; i++) {
      const em = this.add.text(
        Phaser.Math.Between(W * 0.05, W * 0.95),
        Phaser.Math.Between(H * 0.1, H * 0.7),
        emojis[i % emojis.length],
        { fontSize: `${Phaser.Math.Between(20, 38)}px` }
      ).setDepth(49).setAlpha(0)
      this.tweens.add({
        targets: em,
        alpha: { from: 1, to: 0 },
        y: em.y - 90,
        duration: Phaser.Math.Between(700, 1100),
        delay: i * 60,
        ease: 'Power2.Out',
        onComplete: () => em.destroy(),
      })
    }
  }

  private _showAchievementNotification(title: string): void {
    const W = this.scale.width
    const txt = this.add.text(W / 2, 120, `Achievement: ${title}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffdd88',
      stroke: '#443300',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(40)

    this.tweens.add({
      targets: txt,
      y: 80,
      alpha: 0,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    })
  }

  // -------------------------------------------------------------------------
  // _showItemPopup — 派手なアイテム取得エフェクト
  // -------------------------------------------------------------------------

  private _showItemPopup(
    x: number,
    y: number,
    label: string,
    itemType: string
  ): void {
    const colorMap: Record<string, number> = {
      golden_egg:    0xffd700,
      pearl:         0xeeeeff,
      treasure_jar:  0x99dd88,
      glowing_jelly: 0x88eeff,
      gold_coin:     0xffcc00,
      deep_fish:     0x88ffcc,
      starfish:      0xff5533,
      time_capsule:  0xddcc88,
      bubble_shield: 0xaaddff,
    }
    const hexColor = colorMap[itemType] ?? 0xffffff
    const cssColor = `#${hexColor.toString(16).padStart(6, '0')}`

    // ── レアアイテムは特別演出 ──────────────────────────
    const isRare = itemType === 'golden_egg' || itemType === 'starfish'
    const isSpecial = isRare || itemType === 'treasure_jar' || itemType === 'glowing_jelly'

    // ① スコアテキスト（大きく弾む）
    const fontSize = isRare ? '38px' : isSpecial ? '28px' : '22px'
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize,
      color: cssColor,
      stroke: '#000033',
      strokeThickness: isRare ? 5 : 3,
    }).setOrigin(0.5).setDepth(45).setScale(0.5)

    // テキストを弾ませる
    this.tweens.add({
      targets: txt,
      scaleX: 1.4, scaleY: 1.4,
      duration: 80,
      ease: 'Back.out',
      yoyo: false,
      onComplete: () => {
        this.tweens.add({
          targets: txt,
          y: y - 80,
          scaleX: 0.8, scaleY: 0.8,
          alpha: 0,
          duration: isRare ? 1100 : 800,
          ease: 'Power2.Out',
          onComplete: () => txt.destroy(),
        })
      }
    })

    // ② パーティクル爆発
    const particleCount = isRare ? 20 : isSpecial ? 12 : 7
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount
      const speed = isRare
        ? Phaser.Math.Between(90, 180)
        : Phaser.Math.Between(50, 120)
      const size = isRare ? Phaser.Math.Between(5, 10) : Phaser.Math.Between(3, 7)

      const dot = this.add.graphics().setDepth(44)
      dot.fillStyle(hexColor, 1)
      dot.fillCircle(0, 0, size)
      dot.x = x
      dot.y = y

      const vx = Math.cos(angle) * speed
      const vy = Math.sin(angle) * speed
      const duration = isRare ? Phaser.Math.Between(550, 900) : Phaser.Math.Between(350, 650)

      this.tweens.add({
        targets: dot,
        x: x + vx * (duration / 1000) * 1.5,
        y: y + vy * (duration / 1000) * 1.5 + 40,  // 重力感
        scaleX: 0, scaleY: 0,
        alpha: 0,
        duration,
        ease: 'Power2.Out',
        onComplete: () => dot.destroy(),
      })
    }

    // ③ レアアイテムは画面フラッシュ
    if (isRare) {
      const flash = this.add.graphics().setDepth(43)
      flash.fillStyle(hexColor, 0.25)
      flash.fillRect(0, 0, this.scale.width, this.scale.height)
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        ease: 'Power2.Out',
        onComplete: () => flash.destroy(),
      })
    }

    // ④ 金の卵は星パーティクル追加
    if (itemType === 'golden_egg') {
      for (let i = 0; i < 8; i++) {
        const star = this.add.text(
          x + Phaser.Math.Between(-60, 60),
          y + Phaser.Math.Between(-40, 40),
          '⭐',
          { fontSize: `${Phaser.Math.Between(16, 28)}px` }
        ).setDepth(44).setAlpha(0)

        this.tweens.add({
          targets: star,
          alpha: { from: 1, to: 0 },
          y: star.y - 80,
          duration: Phaser.Math.Between(600, 1000),
          delay: i * 80,
          ease: 'Power2.Out',
          onComplete: () => star.destroy(),
        })
      }
    }

    // ⑤ スターフィッシュはスコア2倍演出
    if (itemType === 'starfish') {
      const x2txt = this.add.text(this.scale.width / 2, this.scale.height / 2, 'SCORE x2!!', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '52px',
        color: '#ff5533',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(50).setAlpha(0).setScale(0.3)

      this.tweens.add({
        targets: x2txt,
        alpha: 1, scaleX: 1.2, scaleY: 1.2,
        duration: 200, ease: 'Back.out',
        onComplete: () => {
          this.tweens.add({
            targets: x2txt,
            alpha: 0, scaleX: 0.8, scaleY: 0.8,
            duration: 500, delay: 400, ease: 'Power2.In',
            onComplete: () => x2txt.destroy(),
          })
        }
      })
    }
  }
}


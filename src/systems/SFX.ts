/**
 * SFX - ゲーム効果音（Web Audio API プロシージャル生成）
 *
 * 外部ファイル不要。ジャンプ・アイテム取得・スコア・ゲームオーバーなど
 * ゲームの各アクションに対して専用の効果音を生成する。
 */

type ItemSoundType =
  | 'golden_egg'
  | 'pearl'
  | 'treasure_jar'
  | 'glowing_jelly'
  | 'gold_coin'
  | 'deep_fish'
  | 'starfish'
  | 'time_capsule'
  | 'bubble_shield'
  | string

class SFXClass {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted = false

  private _getCtx(): AudioContext | null {
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.value = 0.5
        this.masterGain.connect(this.ctx.destination)
      }
      return this.ctx
    } catch {
      return null
    }
  }

  setMuted(m: boolean): void { this.muted = m }

  // -------------------------------------------------------------------------
  // ジャンプ音（ぷよっと上昇する感じ）
  // -------------------------------------------------------------------------

  playJump(): void {
    const ctx = this._getCtx()
    if (!ctx || !this.masterGain || this.muted) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(320, now)
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.12)

    gain.gain.setValueAtTime(0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(now)
    osc.stop(now + 0.2)
  }

  // -------------------------------------------------------------------------
  // 障害物通過音（達成感のある明るい音）
  // -------------------------------------------------------------------------

  playScore(): void {
    const ctx = this._getCtx()
    if (!ctx || !this.masterGain || this.muted) return
    const now = ctx.currentTime

    // 2音の上昇コード
    const freqs = [523.3, 784.0]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + i * 0.04)
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.04 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.2)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(now + i * 0.04)
      osc.stop(now + i * 0.04 + 0.25)
    })
  }

  // -------------------------------------------------------------------------
  // アイテム取得音（アイテムごとに異なる）
  // -------------------------------------------------------------------------

  playItem(itemType: ItemSoundType): void {
    const ctx = this._getCtx()
    if (!ctx || !this.masterGain || this.muted) return

    switch (itemType) {
      case 'golden_egg':       this._playGoldenEgg(ctx); break
      case 'pearl':            this._playPearl(ctx); break
      case 'treasure_jar':     this._playTreasureJar(ctx); break
      case 'glowing_jelly':    this._playGlowingJelly(ctx); break
      case 'gold_coin':        this._playGoldCoin(ctx); break
      case 'deep_fish':        this._playDeepFish(ctx); break
      case 'starfish':         this._playStarfish(ctx); break
      case 'time_capsule':     this._playTimeCapsule(ctx); break
      case 'bubble_shield':    this._playBubbleShield(ctx); break
      default:                 this._playDefault(ctx); break
    }
  }

  /** 金の卵：超豪華アルペジオ + ファンファーレ */
  private _playGoldenEgg(ctx: AudioContext): void {
    if (!this.masterGain) return
    const now = ctx.currentTime

    // 上昇アルペジオ（7音）
    const freqs = [261.6, 329.6, 392, 523.3, 659.3, 784, 1046.5]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const t = now + i * 0.055
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.32, t + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
      osc.connect(g); g.connect(this.masterGain!)
      osc.start(t); osc.stop(t + 0.5)
    })

    // 最後に輝き音
    const sparkTime = now + freqs.length * 0.055
    const sparkFreqs = [1318, 1568, 1760, 2093, 2637]
    sparkFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const t = sparkTime + i * 0.04
      osc.type = 'sine'; osc.frequency.value = freq
      g.gain.setValueAtTime(0.18, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
      osc.connect(g); g.connect(this.masterGain!)
      osc.start(t); osc.stop(t + 0.32)
    })

    // 低音の「ドーン」
    const boom = ctx.createOscillator()
    const bG = ctx.createGain()
    boom.frequency.setValueAtTime(120, now); boom.frequency.exponentialRampToValueAtTime(40, now + 0.4)
    bG.gain.setValueAtTime(0.5, now); bG.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    boom.connect(bG); bG.connect(this.masterGain!)
    boom.start(now); boom.stop(now + 0.55)
  }

  /** 真珠：きれいな高音 */
  private _playPearl(ctx: AudioContext): void {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.linearRampToValueAtTime(1100, now + 0.1)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.28)
  }

  /** 宝の壺：重厚「ドン！」＋コイン連打 */
  private _playTreasureJar(ctx: AudioContext): void {
    if (!this.masterGain) return
    const now = ctx.currentTime
    // ドスン
    const osc1 = ctx.createOscillator()
    const g1 = ctx.createGain()
    osc1.frequency.setValueAtTime(220, now)
    osc1.frequency.exponentialRampToValueAtTime(55, now + 0.25)
    g1.gain.setValueAtTime(0.6, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(g1); g1.connect(this.masterGain!); osc1.start(now); osc1.stop(now + 0.38)

    // コイン×5連打
    for (let i = 0; i < 5; i++) {
      const t = now + 0.12 + i * 0.06
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'square'; osc.frequency.setValueAtTime(1100 - i * 80, t)
      osc.frequency.exponentialRampToValueAtTime(700 - i * 50, t + 0.06)
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      osc.connect(g); g.connect(this.masterGain!); osc.start(t); osc.stop(t + 0.1)
    }
  }

  /** 光るクラゲ：神秘的な揺らぎ音 */
  private _playGlowingJelly(ctx: AudioContext): void {
    const now = ctx.currentTime
    const freqs = [440, 550, 660]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const lfo = ctx.createOscillator()
      const lfoGain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = freq
      lfo.frequency.value = 8
      lfoGain.gain.value = 10
      lfo.connect(lfoGain)
      lfoGain.connect(osc.frequency)

      const t = now + i * 0.05
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

      osc.connect(gain)
      gain.connect(this.masterGain!)
      lfo.start(t)
      osc.start(t)
      osc.stop(t + 0.55)
      lfo.stop(t + 0.55)
    })
  }

  /** 金貨袋：コイン音 × 3 */
  private _playGoldCoin(ctx: AudioContext): void {
    const now = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.07
      osc.type = 'square'
      osc.frequency.setValueAtTime(900 + i * 150, t)
      osc.frequency.exponentialRampToValueAtTime(600 + i * 100, t + 0.08)
      gain.gain.setValueAtTime(0.18, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.12)
    }
  }

  /** 深海魚：ぽこっとした泡音 */
  private _playDeepFish(ctx: AudioContext): void {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(500, now)
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.15)
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.2)
  }

  /** スターフィッシュ：超パワーアップファンファーレ */
  private _playStarfish(ctx: AudioContext): void {
    if (!this.masterGain) return
    const now = ctx.currentTime

    // ファンファーレ4音（sawtooth）
    const notes = [392, 523.3, 659.3, 784, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const g = ctx.createGain()
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2000
      const t = now + i * 0.09

      osc.type = 'sawtooth'; osc.frequency.value = freq
      osc2.type = 'square'; osc2.frequency.value = freq * 1.5  // パワーコード感

      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.22, t + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)

      osc.connect(f); osc2.connect(f); f.connect(g); g.connect(this.masterGain!)
      osc.start(t); osc.stop(t + 0.4)
      osc2.start(t); osc2.stop(t + 0.4)
    })

    // 最後に派手なヒット音
    const hitT = now + notes.length * 0.09
    const hit = ctx.createOscillator()
    const hg = ctx.createGain()
    hit.frequency.setValueAtTime(880, hitT)
    hit.frequency.exponentialRampToValueAtTime(220, hitT + 0.3)
    hg.gain.setValueAtTime(0.4, hitT); hg.gain.exponentialRampToValueAtTime(0.001, hitT + 0.4)
    hit.connect(hg); hg.connect(this.masterGain!)
    hit.start(hitT); hit.stop(hitT + 0.45)
  }

  /** タイムカプセル：時計のような音 */
  private _playTimeCapsule(ctx: AudioContext): void {
    const now = ctx.currentTime
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.06
      osc.type = 'square'
      osc.frequency.value = i % 2 === 0 ? 660 : 440
      gain.gain.setValueAtTime(0.15, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.07)
    }
  }

  /** 泡シールド：シュワシュワっとした水音 */
  private _playBubbleShield(ctx: AudioContext): void {
    const now = ctx.currentTime
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.04
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600 + i * 100, t)
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.1)
      gain.gain.setValueAtTime(0.12, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.15)
    }
  }


  /** デフォルトアイテム音 */
  private _playDefault(ctx: AudioContext): void {
    if (!this.masterGain || this.muted) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(660, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1)
    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
    osc.connect(gain)
    gain.connect(this.masterGain!)
    osc.start(now)
    osc.stop(now + 0.22)
  }

  // -------------------------------------------------------------------------
  // ゲームオーバー音
  // -------------------------------------------------------------------------

  playGameOver(): void {
    const ctx = this._getCtx()
    if (!ctx || !this.masterGain || this.muted) return
    const now = ctx.currentTime
    const descend = [523.3, 440, 349.2, 261.6]
    descend.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.18
      osc.type = 'sawtooth'
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, t)
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.35)
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.connect(filter)
      filter.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.45)
    })
  }

  // -------------------------------------------------------------------------
  // マイルストーン音（10点ごと）
  // -------------------------------------------------------------------------

  playMilestone(): void {
    const ctx = this._getCtx()
    if (!ctx || !this.masterGain || this.muted) return
    const now = ctx.currentTime
    const freqs = [523.3, 659.3, 784.0, 1046.5]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const t = now + i * 0.07
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.2, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.connect(gain)
      gain.connect(this.masterGain!)
      osc.start(t)
      osc.stop(t + 0.28)
    })
  }
}

/** グローバルシングルトン */
export const SFX = new SFXClass()

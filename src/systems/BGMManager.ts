/**
 * BGMManager - シーン別BGM管理
 *
 * ユーザーの最初の操作（タップ/クリック）後に AudioContext を作成・開始する。
 * これによりブラウザのAutoplay Policyを回避する。
 */

import { SFX } from './SFX'

// BGMの種類
export type BGMType = 'title' | 'game' | 'character_select' | 'gameover'

class BGMManagerClass {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private muted = false
  private currentBGM: BGMType | null = null

  // スケジューラー
  private schedId: ReturnType<typeof setTimeout> | null = null
  private step = 0
  private nextTime = 0

  // BGM設定（今風スマホゲーム向けにテンポアップ）
  private bpm = 152
  private get tick16() { return 60 / this.bpm / 4 }

  // ─────────────────────────────────────────────
  // 公開API
  // ─────────────────────────────────────────────

  /**
   * ユーザー操作時に必ず呼ぶ。AudioContextを初期化してBGMを開始。
   */
  userInteracted(bgm: BGMType = 'title'): void {
    this._ensureCtx()
    if (this.currentBGM !== bgm) {
      this._stopBGM()
      this.currentBGM = bgm
      this._startBGM(bgm)
    }
  }

  /**
   * BGMを切り替える（ユーザー操作後に呼ぶこと）
   */
  play(bgm: BGMType): void {
    this._ensureCtx()
    if (this.currentBGM === bgm) return
    this._stopBGM()
    this.currentBGM = bgm
    this._startBGM(bgm)
  }

  /**
   * BGMを停止する
   */
  stop(): void {
    this._stopBGM()
    this.currentBGM = null
  }

  /**
   * BGMを一時停止する（AudioContextをsuspend）
   */
  pause(): void {
    if (this.schedId !== null) { clearTimeout(this.schedId); this.schedId = null }
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {})
    }
  }

  /**
   * 一時停止したBGMを再開する（AudioContextをresume）
   */
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        // スケジューラを再起動
        if (this.currentBGM) {
          this.nextTime = this.ctx!.currentTime + 0.05
          this._schedule(this.currentBGM)
        }
      }).catch(() => {})
    }
  }

  toggleMute(): void {
    this.muted = !this.muted
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.7, this.ctx.currentTime, 0.1)
    }
    SFX.setMuted(this.muted)
  }

  isMuted(): boolean { return this.muted }

  get sfx() { return SFX }

  // ─────────────────────────────────────────────
  // 内部実装
  // ─────────────────────────────────────────────

  private _ensureCtx(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.value = this.muted ? 0 : 0.7
        this.masterGain.connect(this.ctx.destination)
      } catch { /* fallback */ }
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  private _stopBGM(): void {
    if (this.schedId !== null) { clearTimeout(this.schedId); this.schedId = null }
    this.step = 0
    this.nextTime = 0
  }

  private _startBGM(type: BGMType): void {
    if (!this.ctx || !this.masterGain) return
    this.nextTime = this.ctx.currentTime + 0.1
    this.step = 0
    this._schedule(type)
  }

  private _schedule(type: BGMType): void {
    if (!this.ctx || this.currentBGM !== type) return

    const ahead = 0.18
    while (this.nextTime < this.ctx.currentTime + ahead) {
      this._playStep(type, this.nextTime)
      this.nextTime += this.tick16
      this.step++
    }
    this.schedId = setTimeout(() => this._schedule(type), 40)
  }

  private _playStep(type: BGMType, t: number): void {
    switch (type) {
      case 'title': this._stepTitle(t); break
      case 'game': this._stepGame(t); break
      case 'character_select': this._stepCharSelect(t); break
      case 'gameover': this._stepGameOver(t); break
    }
  }

  // ─────────────────────────────────────────────
  // タイトルBGM: ゆったり明るい海のテーマ
  // ─────────────────────────────────────────────

  // 明るく爽やかなポップ調メロディ（8分刻み・64ステップ）
  private readonly TITLE_MELODY = [
    // C - G - Am - F 進行
    784, -1, 659, 784,  1047, -1, 988, -1,   880, -1, 784, 659,  784, -1, -1, -1,
    659, -1, 587, 659,   784, -1, 880, -1,   988, -1, 880, 784,  659, -1, -1, -1,
    880, -1, 784, 880,  1047, -1, 1175, -1,  1047, -1, 988, 880, 784, -1, -1, -1,
    659, 784, 880, -1,   988, -1, 880, 784,  880, -1, 1047, -1,  -1, -1, -1, -1,
  ]

  // アルペジオ（16分・きらめく高音）
  private readonly TITLE_ARP = [
    [523, 659, 784, 988],  // C
    [392, 587, 784, 988],  // G
    [440, 523, 659, 880],  // Am
    [349, 523, 698, 880],  // F
  ]

  private _stepTitle(t: number): void {
    const s = this.step % 64
    const bar = Math.floor(s / 16)
    const s16 = s % 16

    // メロディ（sine + triangleで柔らかく）
    const mFreq = this.TITLE_MELODY[s]
    if (mFreq > 0) {
      this._note(mFreq, t, this.tick16 * 2.2, 'sine', 0.22)
      this._note(mFreq, t, this.tick16 * 2.2, 'triangle', 0.08)
    }

    // きらめくアルペジオ（16分刻み）
    const arp = this.TITLE_ARP[bar]
    this._note(arp[s16 % 4] * 1, t, this.tick16 * 1.2, 'triangle', 0.07)

    // 柔らかいベース（各小節2音）
    if (s16 === 0 || s16 === 8) {
      const roots = [131, 98, 110, 87]
      this._noteBass(roots[bar] * 2, t, this.tick16 * 6, 0.18)
    }

    // 軽やかなビート（四つ打ち＋ソフトハット）
    if (s16 % 4 === 0) this._kick(t, 0.5)
    if (s16 === 4 || s16 === 12) this._snare(t)
    this._hihat(t, s16 % 2 === 1 ? 0.035 : 0.02)
  }

  // ─────────────────────────────────────────────
  // ゲームBGM: 元気なアーケード海中アドベンチャー
  // ─────────────────────────────────────────────

  // 16ステップ x 4小節 = 64ステップのループ（コード進行 Am-F-C-G 風）
  // ノリのいいシンコペーション主体のリードメロディ
  private readonly GAME_MELODY = [
    // 小節1 (Am)
    880, -1, 880, 988, 1047, -1, 988, 880,  784, -1, 880, -1, 659, -1, 784, -1,
    // 小節2 (F)
    698, -1, 698, 784,  880, -1, 784, 698,  659, -1, 698, -1, 523, -1, 659, -1,
    // 小節3 (C)
    784, -1, 784, 880, 1047, -1, 988, 880,  784, -1, 659, -1, 523, -1, 587, -1,
    // 小節4 (G)
    784, 880, 988, -1,  880, -1, 784, 659,  784, -1, 988, -1, 1047, -1, -1, -1,
  ]

  // オフビート気味の躍動するベース（ルート音中心）
  private readonly GAME_BASS = [
    220, 220, -1, 220,  165, 165, -1, 165,  131, 131, -1, 131,  196, 196, -1, 196,
  ]

  // コード進行（各小節のルート和音）
  private readonly GAME_CHORDS = [
    [220, 262, 330],  // Am
    [175, 220, 262],  // F
    [196, 262, 330],  // C
    [196, 247, 294],  // G
  ]

  private _stepGame(t: number): void {
    const s = this.step % 64      // 4小節ループ
    const bar = Math.floor(s / 16)
    const s16 = s % 16

    // ── リードメロディ（明るいスクエア波＋薄いディチューン）──
    const mFreq = this.GAME_MELODY[s]
    if (mFreq > 0) {
      this._note(mFreq, t, this.tick16 * 1.6, 'square', 0.16)
      this._note(mFreq * 1.005, t, this.tick16 * 1.6, 'square', 0.06) // ディチューンで厚み
    }

    // ── ベース（8分の躍動グルーヴ）──
    const bFreq = this.GAME_BASS[s16]
    if (bFreq > 0) this._noteBass(bFreq, t, this.tick16 * 1.6, 0.32)

    // ── 四つ打ちキック（EDM感）＋オフビートの追加キック ──
    if (s16 % 4 === 0) this._kick(t, 1.0)
    if (s16 === 10) this._kick(t, 0.6)

    // ── スネア（2・4拍） ──
    if (s16 === 4 || s16 === 12) this._snare(t)

    // ── ハイハット（16分の刻み・オフビート強調） ──
    this._hihat(t, s16 % 2 === 1 ? 0.05 : 0.025)
    // オープンハット風アクセント
    if (s16 === 14) this._hihat(t, 0.07)

    // ── コードパッド（各小節頭で鳴らす・薄く支える） ──
    if (s16 === 0) {
      for (const f of this.GAME_CHORDS[bar]) {
        this._note(f * 2, t, this.tick16 * 14, 'triangle', 0.05)
      }
    }
  }

  // ─────────────────────────────────────────────
  // キャラクター選択BGM: ワクワクする選択テーマ
  // ─────────────────────────────────────────────

  // 軽快でポップな選択テーマ（32ステップ・弾むリズム）
  private readonly CHAR_MELODY = [
    784, -1, 880, 784,  659, -1, 784, -1,   880, -1, 988, 880,  784, -1, 659, -1,
    880, -1, 988, 880,  1047, -1, 988, -1,  880, 784, 659, 784, 880, -1, -1, -1,
  ]

  private _stepCharSelect(t: number): void {
    const s = this.step % 32

    const mFreq = this.CHAR_MELODY[s]
    if (mFreq > 0) {
      this._note(mFreq, t, this.tick16 * 1.5, 'triangle', 0.20)
      this._note(mFreq * 1.005, t, this.tick16 * 1.5, 'square', 0.05)
    }

    // 弾むベース（8分）
    if (s % 2 === 0) {
      const roots = [262, 220, 196, 262]
      const ci = Math.floor(s / 8) % 4
      this._noteBass(roots[ci], t, this.tick16 * 1.5, 0.22)
    }

    // ノリのいいビート
    if (s % 4 === 0) this._kick(t, 0.6)
    if (s % 8 === 4) this._snare(t)
    this._hihat(t, s % 2 === 1 ? 0.05 : 0.03)
  }

  // ─────────────────────────────────────────────
  // ゲームオーバーBGM: 悔しさとリベンジ感
  // ─────────────────────────────────────────────

  private readonly GO_MELODY = [
    523, 494, 466, 440,  415, -1, -1, -1,
    392, 370, 349, 330,  311, -1, -1, -1,
    330, 349, 392, 440,  -1,  494, -1, 523,
    -1,  -1,  -1,  -1,   -1,  -1,  -1, -1,
  ]

  private _stepGameOver(t: number): void {
    const s = this.step % 32

    // 下降するメロディ（悔しさ）
    if (s % 2 === 0) {
      const freq = this.GO_MELODY[s]
      if (freq > 0) {
        this._note(freq, t, this.tick16 * 1.8, 'sawtooth', 0.15)
        // 3度下の和音を重ねる
        this._note(freq * 0.794, t, this.tick16 * 1.8, 'sine', 0.08)
      }
    }

    // ゆっくりした重いビート
    if (s % 16 === 0) this._kick(t, 0.8)
    if (s % 16 === 8) this._snare(t)
  }

  // ─────────────────────────────────────────────
  // 楽器生成ヘルパー
  // ─────────────────────────────────────────────

  private _note(freq: number, t: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = 2400
    osc.type = type; osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(f); f.connect(g); g.connect(this.masterGain)
    osc.start(t); osc.stop(t + dur + 0.02)
  }

  private _noteBass(freq: number, t: number, dur: number, vol: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'; f.frequency.value = 500
    osc.type = 'sawtooth'; osc.frequency.value = freq
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(f); f.connect(g); g.connect(this.masterGain)
    osc.start(t); osc.stop(t + dur + 0.02)
  }

  private _kick(t: number, vol: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15)
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    osc.connect(g); g.connect(this.masterGain)
    osc.start(t); osc.stop(t + 0.22)
  }

  private _snare(t: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return
    const len = Math.floor(this.ctx.sampleRate * 0.08)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource(); src.buffer = buf
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    src.connect(f); f.connect(g); g.connect(this.masterGain!)
    src.start(t); src.stop(t + 0.1)
  }

  private _hihat(t: number, vol: number): void {
    if (!this.ctx || !this.masterGain || this.muted) return
    const len = Math.floor(this.ctx.sampleRate * 0.02)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource(); src.buffer = buf
    const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 10000
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.02)
    src.connect(f); f.connect(g); g.connect(this.masterGain!)
    src.start(t)
  }
}

export const BGMManager = new BGMManagerClass()

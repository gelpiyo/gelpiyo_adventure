/**
 * AudioManager - BGM / SFX の再生管理クラス
 *
 * Web Audio API 未対応ブラウザでは全メソッドがサイレントフォールバック（何もしない）
 * となり、ミュート状態でゲームを動作継続させる（Req 13.7）。
 *
 * Requirements: 2.4, 3.5, 5.5, 8.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */

import Phaser from 'phaser';
import { UI_TIMING } from '../config';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** ゲーム内で使用するサウンドキーの列挙 */
export type SoundKey =
  | 'bgm_shallow'
  | 'bgm_cave'
  | 'bgm_sunken'
  | 'bgm_ruins'
  | 'bgm_ultra'
  | 'sfx_swim'
  | 'sfx_score'
  | 'sfx_item'
  | 'sfx_gameover'
  | 'sfx_achievement'
  | 'sfx_powerup';

// ---------------------------------------------------------------------------
// AudioManager
// ---------------------------------------------------------------------------

/**
 * Phaser の `scene.sound` マネージャーを薄くラップする音声制御クラス。
 *
 * - BGM は `loop: true` で再生する（Req 13.1）
 * - BGM クロスフェードは `crossfadeBGM()` で 2 秒（Req 13.6）
 * - SFX は都度トリガー再生（Req 13.3）
 * - `toggleMute()` でゲーム全体をミュート切り替え（Req 13.4）
 * - Web Audio API 未対応時はサイレントフォールバック（Req 13.7）
 */
export class AudioManager {
  /** ミュート状態フラグ（true = ミュート中） */
  public muted: boolean = false;

  /** Phaser Sound Manager への参照（未対応時は null） */
  private readonly soundManager: Phaser.Sound.BaseSoundManager | null;

  /** 現在再生中の BGM インスタンス（null = 再生なし） */
  private currentBGM: Phaser.Sound.BaseSound | null = null;

  /** 現在再生中の BGM のキー */
  private currentBGMKey: SoundKey | null = null;

  // ---------------------------------------------------------------------------
  // コンストラクター
  // ---------------------------------------------------------------------------

  /**
   * @param scene - オーナーとなる Phaser.Scene
   */
  constructor(scene: Phaser.Scene) {
    // Web Audio API 未対応時は scene.sound が WebAudioSoundManager ではなく
    // HTML5AudioSoundManager / NoAudioSoundManager になる場合がある。
    // Phaser 自体が存在しない環境では null としてサイレントフォールバック。
    try {
      this.soundManager = scene.sound ?? null;
    } catch {
      this.soundManager = null;
    }
  }

  // ---------------------------------------------------------------------------
  // BGM 制御
  // ---------------------------------------------------------------------------

  /**
   * 指定した BGM キーを再生する。
   * 同じキーが既に再生中の場合は何もしない（Req 13.5）。
   *
   * @param key - 再生する BGM の SoundKey
   */
  public playBGM(key: SoundKey): void {
    if (!this.soundManager) return;

    // 同一キーが既に再生中ならスキップ（Req 13.5）
    if (this.currentBGMKey === key && this.currentBGM?.isPlaying) return;

    // 現在の BGM を停止
    this.currentBGM?.stop();

    // 新しい BGM を再生（アセットが未ロードでも Phaser は例外を無視する）
    try {
      const bgm = this.soundManager.add(key, { loop: true, volume: this.muted ? 0 : 1 });
      bgm.play();
      this.currentBGM = bgm;
      this.currentBGMKey = key;
    } catch {
      // アセット未ロード等のエラーはサイレントに無視
    }
  }

  /**
   * 現在の BGM から `toKey` へクロスフェード遷移する（Req 13.6）。
   * デフォルト duration は `UI_TIMING.BGM_CROSSFADE_DURATION_MS`（2000ms）。
   *
   * フェードアウト: 既存 BGM のボリュームを 0 まで線形減衰
   * フェードイン : 新 BGM のボリュームを 0 → 1 まで線形増加
   *
   * @param toKey    - フェードイン先の BGM キー
   * @param duration - クロスフェード全体の時間 ms（省略時: 2000ms）
   */
  public crossfadeBGM(
    toKey: SoundKey,
    duration: number = UI_TIMING.BGM_CROSSFADE_DURATION_MS,
  ): void {
    if (!this.soundManager) return;

    // ミュート中はクロスフェードせず単純切り替え
    if (this.muted) {
      this.playBGM(toKey);
      return;
    }

    // 同一キーが再生中ならスキップ
    if (this.currentBGMKey === toKey && this.currentBGM?.isPlaying) return;

    const outgoing = this.currentBGM;

    // フェードイン先の BGM を音量 0 で開始
    try {
      const incoming = this.soundManager.add(toKey, { loop: true, volume: 0 });
      incoming.play();

      // Phaser の tween で音量をアニメーション
      // soundManager.scene は保護されているが、TweenManager は scene 経由で取得可能
      const scene = (this.soundManager as unknown as { scene: Phaser.Scene }).scene;
      if (scene?.tweens) {
        // フェードアウト
        if (outgoing) {
          scene.tweens.add({
            targets: outgoing,
            volume: 0,
            duration,
            onComplete: () => {
              outgoing.stop();
              outgoing.destroy();
            },
          });
        }

        // フェードイン
        scene.tweens.add({
          targets: incoming,
          volume: 1,
          duration,
        });
      } else {
        // Tween が使えない場合は即座に切り替え
        outgoing?.stop();
        outgoing?.destroy();
        (incoming as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound).setVolume(1);
      }

      this.currentBGM = incoming;
      this.currentBGMKey = toKey;
    } catch {
      // アセット未ロード等のエラーはサイレントに無視
      this.playBGM(toKey);
    }
  }

  // ---------------------------------------------------------------------------
  // SFX 制御
  // ---------------------------------------------------------------------------

  /**
   * 効果音を 1 回再生する（Req 13.3）。
   * ミュート中は再生しない。
   *
   * @param key - 再生する SFX の SoundKey
   */
  public playSFX(key: SoundKey): void {
    if (!this.soundManager) return;
    if (this.muted) return;

    try {
      this.soundManager.play(key, { loop: false, volume: 1 });
    } catch {
      // アセット未ロード等のエラーはサイレントに無視
    }
  }

  // ---------------------------------------------------------------------------
  // ミュート制御
  // ---------------------------------------------------------------------------

  /**
   * ミュート状態をトグルする（Req 13.4）。
   * `muted` フラグを反転し、現在再生中の全サウンドのミュートを更新する。
   */
  public toggleMute(): void {
    if (!this.soundManager) return;

    this.muted = !this.muted;

    // Phaser Sound Manager 全体のミュートを更新（Req 13.4）
    this.soundManager.mute = this.muted;
  }

  // ---------------------------------------------------------------------------
  // 全停止
  // ---------------------------------------------------------------------------

  /**
   * 全サウンドを停止する（Req 13.2）。
   * シーン遷移・ゲームオーバー時に使用する。
   */
  public stopAll(): void {
    if (!this.soundManager) return;

    try {
      this.soundManager.stopAll();
    } catch {
      // サイレントに無視
    }

    this.currentBGM = null;
    this.currentBGMKey = null;
  }
}

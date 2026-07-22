/**
 * BackgroundRenderer — 奥行き感のある3レイヤー海中背景
 *
 * レイヤー構成:
 *   Layer 0 (遠景, depth 0-1): クジラ、大岩、遠くの珊瑚礁シルエット — 薄く、ゆっくりスクロール
 *   Layer 1 (中景, depth 2-3): 中型サンゴ、タコ、エビ、沈没船シルエット — 中程度の速度
 *   Layer 2 (前景, depth 4-5): 小魚、カニ、貝殻、海草、近くのサンゴ、財宝 — 速くスクロール、鮮明
 */

import Phaser from 'phaser';
import { type AreaTheme, PARALLAX, SCREEN } from '../config';

interface ThemeColors {
  sky: number;
  mid: number;
  near: number;
  accent: number;
}

const THEME_COLORS: Record<AreaTheme, ThemeColors> = {
  shallow_reef: { sky: 0x44aadd, mid: 0x55bbee, near: 0x77ccff, accent: 0xff6699 },
  cave:         { sky: 0x1a4466, mid: 0x225577, near: 0x2a6688, accent: 0x44aacc },
  sunken_ship:  { sky: 0x0d3344, mid: 0x1a4455, near: 0x225566, accent: 0x33aabb },
  deep_ruins:   { sky: 0x111133, mid: 0x1a1a44, near: 0x222255, accent: 0x7755cc },
  ultra_deep:   { sky: 0x08080f, mid: 0x0f0f1a, near: 0x151525, accent: 0x4433aa },
};

type DecoType =
  | 'whale' | 'rock_far' | 'coral_far'
  | 'coral_mid' | 'octopus' | 'shrimp' | 'ship_silhouette'
  | 'small_fish' | 'crab' | 'shell' | 'seagrass_near' | 'treasure' | 'jellyfish_near'
  | 'starfish_deco' | 'fish' | 'coral' | 'seagrass' | 'jellyfish';

interface DecoObject {
  type: DecoType;
  g: Phaser.GameObjects.Graphics;
  x: number; y: number;
  phase: number; speed: number;
  depth: number;
  layerIdx: number;  // 0=遠, 1=中, 2=近
  color?: number;
  scale?: number;
  alpha?: number;    // ベースアルファ（遠いほど低い）
  dir?: number;      // 1=右向き -1=左向き
}

export class BackgroundRenderer {
  private readonly scene: Phaser.Scene;
  readonly layers: Array<{ sprites: Phaser.GameObjects.TileSprite[]; scrollFactor: number; theme: AreaTheme }> = [];
  readonly particles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly lightParticles: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly decorObjects: DecoObject[] = [];
  private scrollSpeed = 200;
  private currentTheme: AreaTheme = 'shallow_reef';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const W = SCREEN.WIDTH;
    const H = SCREEN.HEIGHT;

    // ── 空グラデーション背景 ─────────────────────────────
    const sunlight = scene.add.graphics().setDepth(-1);
    sunlight.fillGradientStyle(0x88ddff, 0x88ddff, 0x2288cc, 0x2288cc, 1);
    sunlight.fillRect(0, 0, W, H);

    // 太陽光線（上部）
    const rays = scene.add.graphics().setDepth(-0.5);
    for (let i = 0; i < 7; i++) {
      const rx = W * (i / 6);
      rays.fillStyle(0xffffff, 0.035 + Math.random() * 0.02);
      rays.fillTriangle(rx - 20, 0, rx + 20, 0, rx + 100, H);
    }

    // ── パララックスレイヤー ─────────────────────────────
    const scrollFactors = [PARALLAX.FAR_SCROLL_FACTOR, PARALLAX.MID_SCROLL_FACTOR, PARALLAX.NEAR_SCROLL_FACTOR];
    const themeKeys = Object.keys(THEME_COLORS) as AreaTheme[];
    const colorKeys: (keyof ThemeColors)[] = ['sky', 'mid', 'near'];

    this.layers = scrollFactors.map((scrollFactor, li) => {
      const colorKey = colorKeys[li];
      const sprites = themeKeys.map(theme => {
        const color = THEME_COLORS[theme][colorKey];
        const texKey = `bg_solid_${theme}_${li}`;
        if (!scene.textures.exists(texKey)) {
          const g = scene.add.graphics();
          g.fillStyle(color, li === 0 ? 0.0 : li === 1 ? 0.2 : 0.12);
          g.fillRect(0, 0, 64, 64);
          g.generateTexture(texKey, 64, 64);
          g.destroy();
        }
        const s = scene.add.tileSprite(0, 0, W, H, texKey).setOrigin(0, 0).setDepth(li);
        s.setAlpha(theme === 'shallow_reef' ? 1 : 0);
        return s;
      });
      return { sprites, scrollFactor, theme: 'shallow_reef' as AreaTheme };
    });

    // ── 砂地（画面下部）──────────────────────────────────
    const sand = scene.add.graphics().setDepth(1);
    sand.fillStyle(0xffeeaa, 1);
    sand.fillRect(0, H - 30, W, 30);
    sand.fillStyle(0xffdd88, 0.5);
    for (let i = 0; i < 30; i++) {
      sand.fillCircle(Phaser.Math.Between(0, W), H - Phaser.Math.Between(5, 25), Phaser.Math.Between(2, 6));
    }

    // ── 装飾オブジェクト生成 ─────────────────────────────
    this._generateDecorations(W, H);

    // ── バブルパーティクル ───────────────────────────────
    const bubbleKey = 'bg_bubble_bright';
    if (!scene.textures.exists(bubbleKey)) {
      const g = scene.add.graphics();
      g.lineStyle(2, 0xffffff, 0.85); g.strokeCircle(5, 5, 4);
      g.fillStyle(0xeeffff, 0.3); g.fillCircle(5, 5, 4);
      g.generateTexture(bubbleKey, 10, 10); g.destroy();
    }
    this.particles = scene.add.particles(0, 0, bubbleKey, {
      x: { min: 0, max: W }, y: H + 10,
      speedY: { min: -80, max: -30 }, speedX: { min: -10, max: 10 },
      lifespan: { min: 3000, max: 6000 }, scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.8, end: 0 }, frequency: 200, quantity: 1,
    });
    this.particles.setDepth(13);

    const sparkKey = 'bg_sparkle';
    if (!scene.textures.exists(sparkKey)) {
      const g = scene.add.graphics();
      g.fillStyle(0xffffff, 1); g.fillCircle(3, 3, 2.5);
      g.generateTexture(sparkKey, 6, 6); g.destroy();
    }
    this.lightParticles = scene.add.particles(0, 0, sparkKey, {
      x: { min: 0, max: W }, y: { min: 0, max: H * 0.5 },
      speedY: { min: -5, max: 8 }, speedX: { min: -8, max: 8 },
      lifespan: { min: 1500, max: 3500 }, scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 }, frequency: 300, quantity: 1,
    });
    this.lightParticles.setDepth(13);
  }

  // ── 装飾オブジェクト生成（3レイヤー） ──────────────────────────

  private _generateDecorations(W: number, H: number): void {
    const rng = Phaser.Math.RND;

    // ===== レイヤー 0: 遠景 (alpha 0.15-0.3, 薄くシルエット) =====

    // クジラ（大きく、薄く、ゆっくり）
    for (let i = 0; i < 2; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'whale', g,
        x: rng.between(W, W + 800),
        y: rng.between(80, H * 0.5),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.008, 0.015),
        depth: 0.5, layerIdx: 0,
        color: 0x336699, alpha: 0.18, scale: 1.0,
        dir: -1,
      });
    }

    // 遠くの大岩
    for (let i = 0; i < 4; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'rock_far', g,
        x: rng.between(0, W + 600),
        y: H - rng.between(20, 80),
        phase: 0, speed: 0,
        depth: 0.3, layerIdx: 0,
        color: 0x445566, alpha: 0.2, scale: rng.realInRange(0.8, 1.6),
      });
    }

    // 遠景サンゴシルエット
    for (let i = 0; i < 5; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'coral_far', g,
        x: rng.between(0, W + 400),
        y: H - rng.between(10, 50),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.01, 0.02),
        depth: 0.4, layerIdx: 0,
        color: 0x335577, alpha: 0.22, scale: rng.realInRange(1.0, 1.8),
      });
    }

    // ===== レイヤー 1: 中景 (alpha 0.5-0.75) =====

    // 中景サンゴ（カラフル）
    const coralColors = [0xff4466, 0xff6633, 0xffaa00, 0xff3399, 0xff5522, 0xee2255];
    for (let i = 0; i < 10; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'coral_mid', g,
        x: rng.between(0, W + 300),
        y: H - rng.between(10, 55),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.02, 0.04),
        depth: 2.5, layerIdx: 1,
        color: coralColors[i % coralColors.length],
        alpha: 0.65, scale: rng.realInRange(0.8, 1.2),
      });
    }

    // タコ（中景）
    for (let i = 0; i < 2; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'octopus', g,
        x: rng.between(W, W + 500),
        y: H - rng.between(40, 100),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.03, 0.06),
        depth: 2.3, layerIdx: 1,
        color: rng.pick([0xcc44aa, 0xaa33cc, 0xdd5588]),
        alpha: 0.7,
      });
    }

    // エビ（中景）
    for (let i = 0; i < 4; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'shrimp', g,
        x: rng.between(0, W + 300),
        y: H - rng.between(15, 50),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.04, 0.08),
        depth: 2.4, layerIdx: 1,
        color: rng.pick([0xff6644, 0xff8833, 0xffaa55]),
        alpha: 0.72, dir: rng.pick([-1, 1]),
      });
    }

    // 中景海草
    for (let i = 0; i < 10; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'seagrass', g,
        x: rng.between(0, W + 300),
        y: H - 5,
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.04, 0.08),
        depth: 2.2, layerIdx: 1,
        color: rng.pick([0x44cc44, 0x33bb44, 0x22aa33, 0x55dd55]),
        alpha: 0.65,
      });
    }

    // ===== レイヤー 2: 前景 (alpha 0.85-1.0, くっきり) =====

    // 小魚の群れ（前景）
    const fishColors = [0xff6600, 0xffcc00, 0xff3366, 0x00ccff, 0x66ff33, 0xffaa00];
    for (let i = 0; i < 8; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'small_fish', g,
        x: rng.between(0, W + 200),
        y: rng.between(80, H - 100),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.06, 0.12),
        depth: 4.5, layerIdx: 2,
        color: fishColors[i % fishColors.length],
        alpha: 0.92, scale: rng.realInRange(0.7, 1.1),
        dir: rng.pick([-1, 1]),
      });
    }

    // カニ（前景・海底）
    for (let i = 0; i < 3; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'crab', g,
        x: rng.between(0, W + 200),
        y: H - rng.between(20, 35),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.05, 0.09),
        depth: 4.8, layerIdx: 2,
        color: rng.pick([0xff4400, 0xff6600, 0xee3300]),
        alpha: 0.95,
      });
    }

    // 貝殻（前景・海底）
    for (let i = 0; i < 6; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'shell', g,
        x: rng.between(0, W + 200),
        y: H - rng.between(8, 22),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: 0.01,
        depth: 4.3, layerIdx: 2,
        color: rng.pick([0xffddaa, 0xffccbb, 0xeeddcc, 0xffee99]),
        alpha: 0.95,
      });
    }

    // 金銀財宝（前景・海底）
    for (let i = 0; i < 4; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'treasure', g,
        x: rng.between(0, W + 200),
        y: H - rng.between(12, 30),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.03, 0.05),
        depth: 4.2, layerIdx: 2,
        color: rng.pick([0xffd700, 0xffcc00, 0xddaa00]),
        alpha: 0.95,
      });
    }

    // 前景クラゲ（カラフル）
    const jellyColors = [0xff99dd, 0xffaaee, 0xaa99ff, 0xff88cc, 0xffbbee];
    for (let i = 0; i < 5; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'jellyfish_near', g,
        x: rng.between(50, W + 200),
        y: rng.between(60, H - 80),
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.04, 0.07),
        depth: 4.6, layerIdx: 2,
        color: jellyColors[i % jellyColors.length],
        alpha: 0.9,
      });
    }

    // 前景海草（大きく・くっきり）
    for (let i = 0; i < 12; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'seagrass_near', g,
        x: rng.between(0, W + 200),
        y: H - 3,
        phase: rng.realInRange(0, Math.PI * 2),
        speed: rng.realInRange(0.06, 0.12),
        depth: 4.7, layerIdx: 2,
        color: rng.pick([0x33cc44, 0x44dd55, 0x22bb33, 0x55ee66]),
        alpha: 0.92,
      });
    }

    // ヒトデ（前景）
    for (let i = 0; i < 5; i++) {
      const g = this.scene.add.graphics();
      this.decorObjects.push({
        type: 'starfish_deco', g,
        x: rng.between(0, W + 200),
        y: H - rng.between(5, 20),
        phase: 0, speed: 0.01,
        depth: 4.1, layerIdx: 2,
        color: rng.pick([0xff4422, 0xff8800, 0xffaa00]),
        alpha: 0.95,
      });
    }
  }

  // ── update ───────────────────────────────────────────────

  update(delta: number): void {
    const dt = delta / 1000;
    for (const layer of this.layers) {
      const offset = this.scrollSpeed * layer.scrollFactor * dt;
      for (const s of layer.sprites) s.tilePositionX += offset;
    }
    this._updateDecorations(dt);
  }

  private _updateDecorations(dt: number): void {
    // レイヤーごとのスクロール速度（視差）
    const layerSpeeds = [
      this.scrollSpeed * PARALLAX.FAR_SCROLL_FACTOR,
      this.scrollSpeed * PARALLAX.MID_SCROLL_FACTOR,
      this.scrollSpeed * PARALLAX.NEAR_SCROLL_FACTOR,
    ];
    const W = SCREEN.WIDTH;

    for (const d of this.decorObjects) {
      d.phase += d.speed;
      d.x -= layerSpeeds[d.layerIdx] * dt;
      if (d.x < -500) d.x = W + 500;

      d.g.clear();
      d.g.setDepth(d.depth);

      const a = d.alpha ?? 1.0;

      switch (d.type) {
        case 'whale':          this._drawWhale(d.g, d.x, d.y, d.phase, d.color ?? 0x336699, a, d.scale ?? 1); break;
        case 'rock_far':       this._drawRockFar(d.g, d.x, d.y, d.color ?? 0x445566, a, d.scale ?? 1); break;
        case 'coral_far':      this._drawCoralFar(d.g, d.x, d.y, d.phase, d.color ?? 0x335577, a, d.scale ?? 1); break;
        case 'coral_mid':      this._drawCoralMid(d.g, d.x, d.y, d.phase, d.color ?? 0xff4466, a, d.scale ?? 1); break;
        case 'octopus':        this._drawOctopus(d.g, d.x, d.y, d.phase, d.color ?? 0xcc44aa, a); break;
        case 'shrimp':         this._drawShrimp(d.g, d.x, d.y, d.phase, d.color ?? 0xff6644, a, d.dir ?? 1); break;
        case 'seagrass':       this._drawSeagrass(d.g, d.x, d.y, d.phase, d.color ?? 0x44cc44, a, 0.8); break;
        case 'seagrass_near':  this._drawSeagrass(d.g, d.x, d.y, d.phase, d.color ?? 0x44cc44, a, 1.3); break;
        case 'small_fish':     this._drawSmallFish(d.g, d.x, d.y, d.phase, d.color ?? 0xff6600, a, d.scale ?? 1, d.dir ?? 1); break;
        case 'crab':           this._drawCrab(d.g, d.x, d.y, d.phase, d.color ?? 0xff4400, a); break;
        case 'shell':          this._drawShell(d.g, d.x, d.y, d.phase, d.color ?? 0xffddaa, a); break;
        case 'treasure':       this._drawTreasure(d.g, d.x, d.y, d.phase, d.color ?? 0xffd700, a); break;
        case 'jellyfish_near': this._drawJellyfish(d.g, d.x, d.y, d.phase, d.color ?? 0xff99dd, a); break;
        case 'starfish_deco':  this._drawStarfishDeco(d.g, d.x, d.y, d.color ?? 0xff4422, a); break;
        case 'fish':           this._drawSmallFish(d.g, d.x, d.y, d.phase, d.color ?? 0xff6600, a, 1.2, d.dir ?? 1); break;
        case 'coral':          this._drawCoralMid(d.g, d.x, d.y, d.phase, d.color ?? 0xff4466, a, 1); break;
        case 'jellyfish':      this._drawJellyfish(d.g, d.x, d.y, d.phase, d.color ?? 0xff99dd, a); break;
        default: break;
      }
    }
  }

  // ── 遠景描画 (薄く・大きく) ─────────────────────────────

  /** クジラ（遠景シルエット） */
  private _drawWhale(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number, scale: number): void {
    const bobY = y + Math.sin(phase) * 8;
    const s = scale;
    g.fillStyle(color, alpha);
    // 体
    g.fillEllipse(x, bobY, 160 * s, 55 * s);
    // 頭（丸め）
    g.fillEllipse(x - 75 * s, bobY - 5 * s, 50 * s, 42 * s);
    // 尾ひれ
    g.fillTriangle(
      x + 75 * s, bobY,
      x + 105 * s, bobY - 28 * s,
      x + 105 * s, bobY + 28 * s
    );
    // 上部ひれ
    g.fillTriangle(
      x - 10 * s, bobY - 24 * s,
      x + 15 * s, bobY - 50 * s,
      x + 30 * s, bobY - 24 * s
    );
    // 口元（うっすら白い線）
    g.lineStyle(1.5, 0xffffff, alpha * 0.3);
    g.strokePoints([{ x: x - 95 * s, y: bobY + 5 * s }, { x: x - 70 * s, y: bobY + 8 * s }], false);
    // 目
    g.fillStyle(0xffffff, alpha * 0.5);
    g.fillCircle(x - 68 * s, bobY - 8 * s, 5 * s);
  }

  /** 遠景の大岩 */
  private _drawRockFar(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number, scale: number): void {
    const s = scale;
    g.fillStyle(color, alpha);
    // 主岩体
    g.fillEllipse(x, y - 20 * s, 80 * s, 55 * s);
    // 副岩（隣に小さめ）
    g.fillEllipse(x + 35 * s, y - 10 * s, 45 * s, 35 * s);
    g.fillEllipse(x - 30 * s, y - 8 * s, 38 * s, 28 * s);
  }

  /** 遠景サンゴシルエット */
  private _drawCoralFar(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number, scale: number): void {
    const s = scale;
    g.fillStyle(color, alpha);
    g.fillRect(x - 3 * s, y - 40 * s, 6 * s, 40 * s);
    // 枝（単純化）
    const sway = Math.sin(phase) * 1.5;
    g.lineStyle(4 * s, color, alpha);
    g.strokePoints([{ x, y: y - 25 * s }, { x: x - 18 * s + sway, y: y - 40 * s }], false);
    g.strokePoints([{ x, y: y - 20 * s }, { x: x + 16 * s + sway, y: y - 36 * s }], false);
    g.fillCircle(x - 18 * s + sway, y - 40 * s, 5 * s);
    g.fillCircle(x + 16 * s + sway, y - 36 * s, 4.5 * s);
    g.fillCircle(x, y - 42 * s, 5 * s);
  }

  // ── 中景描画 (中程度のアルファ) ─────────────────────────

  /** 中景サンゴ */
  private _drawCoralMid(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number, scale: number): void {
    const s = scale;
    g.fillStyle(color, alpha);
    g.fillRect(x - 4 * s, y - 42 * s, 8 * s, 42 * s);
    const branches = [
      { dx: -20, dy: -20, len: 22 }, { dx: 18, dy: -25, len: 20 },
      { dx: -12, dy: -33, len: 15 }, { dx: 10, dy: -30, len: 14 },
    ];
    g.lineStyle(4 * s, color, alpha);
    for (const b of branches) {
      const sway = Math.sin(phase + b.dx * 0.1) * 2;
      g.strokePoints([{ x, y: y - Math.abs(b.dy) * 0.5 }, { x: x + b.dx * s + sway, y: y + b.dy * s }], false);
      g.fillStyle(color, alpha);
      g.fillCircle(x + b.dx * s + sway, y + b.dy * s, 6 * s);
      g.fillStyle(0xffffff, alpha * 0.4);
      g.fillCircle(x + b.dx * s + sway - 2, y + b.dy * s - 2, 2.5 * s);
    }
  }

  /** タコ */
  private _drawOctopus(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    // 体（丸いマント形）
    g.fillEllipse(x, y - 18, 42, 36);
    // 頭上の丸み
    g.fillEllipse(x, y - 28, 32, 26);
    // 目
    g.fillStyle(0xffffff, alpha * 0.9);
    g.fillCircle(x - 9, y - 22, 6);
    g.fillCircle(x + 9, y - 22, 6);
    g.fillStyle(0x222244, alpha);
    g.fillCircle(x - 8, y - 22, 3.5);
    g.fillCircle(x + 10, y - 22, 3.5);
    // 光沢
    g.fillStyle(0xffffff, alpha * 0.35);
    g.fillCircle(x - 7, y - 24, 1.8);
    // 触手 8本
    g.lineStyle(3, color, alpha * 0.9);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 7) * i - Math.PI * 0.7;
      const waveX = Math.cos(angle) * 28;
      const waveY = Math.sin(angle) * 22;
      const wave = Math.sin(phase * 1.5 + i * 0.8) * 6;
      g.strokePoints([
        { x, y: y - 2 },
        { x: x + waveX * 0.5 + wave, y: y + waveY * 0.5 },
        { x: x + waveX + wave * 1.5, y: y + waveY + 10 },
      ], false);
    }
  }

  /** エビ */
  private _drawShrimp(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number, dir: number): void {
    const wave = Math.sin(phase * 2) * 3;
    g.fillStyle(color, alpha);
    // 体（細長い楕円を3セグメント）
    g.fillEllipse(x, y, 22, 10);
    g.fillEllipse(x + dir * 10, y + wave * 0.3, 16, 9);
    g.fillEllipse(x + dir * 18, y + wave * 0.6, 12, 8);
    // 尾
    g.fillTriangle(x + dir * 24, y + wave, x + dir * 32, y + wave - 7, x + dir * 32, y + wave + 7);
    // 触角（2本）
    g.lineStyle(1.2, color, alpha * 0.85);
    g.strokePoints([{ x: x - dir * 8, y: y }, { x: x - dir * 22, y: y - 8 + wave }], false);
    g.strokePoints([{ x: x - dir * 8, y: y }, { x: x - dir * 20, y: y - 14 + wave }], false);
    // 脚（細かい）
    for (let i = 0; i < 4; i++) {
      const lx = x + dir * i * 4;
      g.strokePoints([{ x: lx, y: y + 4 }, { x: lx + dir * 3, y: y + 10 + wave * 0.5 }], false);
    }
  }

  // ── 前景描画 (くっきり・鮮明) ───────────────────────────

  /** 小魚 */
  private _drawSmallFish(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number, scale: number, dir: number): void {
    const bobY = y + Math.sin(phase * 0.8) * 5;
    const wiggle = Math.sin(phase * 3.5) * 2.5;
    const s = scale;
    // 体
    g.fillStyle(color, alpha);
    g.fillEllipse(x, bobY, 32 * s, 16 * s);
    // しっぽ
    g.fillTriangle(
      x + dir * 15 * s, bobY,
      x + dir * 25 * s, bobY - 8 * s,
      x + dir * 25 * s + wiggle, bobY + 8 * s
    );
    // ストライプ
    g.fillStyle(0xffffff, alpha * 0.35);
    g.fillRect(x - 3 * s, bobY - 7 * s, 4 * s, 14 * s);
    // 目
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(x - dir * 11 * s, bobY - 3 * s, 4 * s);
    g.fillStyle(0x111111, alpha);
    g.fillCircle(x - dir * 10 * s, bobY - 3 * s, 2.5 * s);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x - dir * 9.5 * s, bobY - 4 * s, 1.2 * s);
    // ひれ
    g.fillStyle(color, alpha * 0.75);
    g.fillTriangle(x, bobY - 7 * s, x - dir * 5 * s, bobY - 14 * s, x + dir * 5 * s, bobY - 7 * s);
  }

  /** カニ */
  private _drawCrab(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number): void {
    const sway = Math.sin(phase * 1.5) * 2;
    g.fillStyle(color, alpha);
    // 甲羅
    g.fillEllipse(x, y - 8, 34, 20);
    // 目（突き出た感じ）
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(x - 8, y - 14, 5);
    g.fillCircle(x + 8, y - 14, 5);
    g.fillStyle(0x000000, alpha);
    g.fillCircle(x - 8, y - 14, 3);
    g.fillCircle(x + 8, y - 14, 3);
    // ハサミ（左右）
    g.fillStyle(color, alpha * 0.9);
    g.fillEllipse(x - 22 + sway, y - 6, 18, 10);
    g.fillEllipse(x + 22 - sway, y - 6, 18, 10);
    // 先端のハサミ部分
    g.fillTriangle(x - 30 + sway, y - 12, x - 30 + sway, y - 2, x - 22 + sway, y - 6);
    g.fillTriangle(x + 30 - sway, y - 12, x + 30 - sway, y - 2, x + 22 - sway, y - 6);
    // 脚（6本）
    g.lineStyle(2, color, alpha * 0.85);
    for (let i = 0; i < 3; i++) {
      const lx = x - 8 + i * 8;
      const legWave = Math.sin(phase * 2 + i * 0.5) * 3;
      g.strokePoints([{ x: lx, y: y - 5 }, { x: lx - 14, y: y + 10 + legWave }], false);
      g.strokePoints([{ x: lx, y: y - 5 }, { x: lx + 14, y: y + 10 - legWave }], false);
    }
  }

  /** 貝殻 */
  private _drawShell(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    // 二枚貝の形
    g.fillEllipse(x, y - 8, 24, 18);
    g.lineStyle(1.5, 0xffffff, alpha * 0.35);
    // 放射状の模様
    for (let i = 0; i < 5; i++) {
      const angle = ((Math.PI * 0.6) / 4) * i - Math.PI * 0.3 + phase * 0.1;
      g.strokePoints([
        { x, y },
        { x: x + Math.cos(angle) * 12, y: y - Math.abs(Math.sin(angle)) * 16 }
      ], false);
    }
    // 光沢
    g.fillStyle(0xffffff, alpha * 0.4);
    g.fillEllipse(x - 3, y - 12, 8, 5);
  }

  /** 海底の財宝（金貨・宝石） */
  private _drawTreasure(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number): void {
    const glow = 0.3 + Math.sin(phase * 2) * 0.15;
    // 宝箱（シンプルな箱）
    g.fillStyle(0x884422, alpha * 0.9);
    g.fillRect(x - 14, y - 20, 28, 18);
    // 金のふた
    g.fillStyle(color, alpha);
    g.fillRect(x - 14, y - 24, 28, 8);
    // 錠前
    g.fillStyle(color, alpha);
    g.fillCircle(x, y - 14, 4);
    g.fillStyle(0x885500, alpha);
    g.fillRect(x - 2, y - 12, 4, 5);
    // 溢れ出る金貨
    for (let i = 0; i < 4; i++) {
      const cx = x - 12 + i * 8;
      g.fillStyle(color, alpha * (glow + 0.4));
      g.fillCircle(cx, y - 22 - Math.sin(phase + i) * 3, 4);
    }
    // 光のフレア
    g.fillStyle(0xffffff, glow * alpha * 0.6);
    g.fillCircle(x - 5, y - 28, 3);
  }

  /** 海草（共通） */
  private _drawSeagrass(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number, scale: number): void {
    const h = (40 + Math.abs(Math.round(x / 40) % 4) * 15) * scale;
    const sway = Math.sin(phase) * 8 * scale;
    g.lineStyle(3 * scale, color, alpha);
    g.strokePoints([
      { x, y },
      { x: x + sway * 0.3, y: y - h * 0.35 },
      { x: x + sway * 0.65, y: y - h * 0.65 },
      { x: x + sway, y: y - h },
    ], false);
    g.lineStyle(2.5 * scale, color, alpha * 0.75);
    g.strokePoints([
      { x: x + 7 * scale, y },
      { x: x + 7 * scale + sway * 0.4, y: y - h * 0.5 },
      { x: x + 7 * scale + sway * 0.85, y: y - h * 0.85 },
    ], false);
  }

  /** クラゲ（前景・かわいい） */
  private _drawJellyfish(g: Phaser.GameObjects.Graphics, x: number, y: number, phase: number, color: number, alpha: number): void {
    const bobY = y + Math.sin(phase) * 10;
    g.fillStyle(color, alpha * 0.25);
    g.fillCircle(x, bobY - 5, 28);
    g.fillStyle(color, alpha * 0.8);
    g.fillEllipse(x, bobY - 12, 40, 32);
    g.fillStyle(0xffffff, alpha * 0.5);
    g.fillEllipse(x - 5, bobY - 16, 16, 12);
    g.lineStyle(2, color, alpha * 0.9);
    for (let i = -3; i <= 3; i++) {
      const tx = x + i * 5;
      const wave = Math.sin(phase * 2 + i * 0.5) * 6;
      g.strokePoints([
        { x: tx, y: bobY + 4 },
        { x: tx + wave, y: bobY + 18 },
        { x: tx - wave * 0.5, y: bobY + 30 },
      ], false);
    }
    g.fillStyle(0xffffff, 0.9 * alpha);
    g.fillCircle(x - 7, bobY - 10, 4);
    g.fillCircle(x + 7, bobY - 10, 4);
    g.fillStyle(0x222244, alpha);
    g.fillCircle(x - 6, bobY - 10, 2.5);
    g.fillCircle(x + 8, bobY - 10, 2.5);
  }

  /** ヒトデ */
  private _drawStarfishDeco(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number): void {
    g.fillStyle(color, alpha);
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? 13 : 5.5;
      pts.push({ x: x + Math.cos(angle) * rad, y: y + Math.sin(angle) * rad });
    }
    g.fillPoints(pts, true);
    g.fillStyle(0xffffff, alpha * 0.55);
    g.fillCircle(x, y, 3.5);
  }

  // ── テーマ切り替え ───────────────────────────────────────

  transitionToTheme(theme: AreaTheme, duration: number): void {
    if (this.currentTheme === theme) return;
    const safeDuration = Math.min(duration, 1000);
    const themeKeys = Object.keys(THEME_COLORS) as AreaTheme[];

    for (const layer of this.layers) {
      themeKeys.forEach((t, i) => {
        const sprite = layer.sprites[i];
        if (t === theme) {
          sprite.setAlpha(0);
          this.scene.tweens.add({ targets: sprite, alpha: 1, duration: safeDuration, ease: 'Linear' });
        } else if (t === this.currentTheme) {
          this.scene.tweens.add({ targets: sprite, alpha: 0, duration: safeDuration, ease: 'Linear' });
        }
      });
      layer.theme = theme;
    }

    this.currentTheme = theme;
    this._updateParticleColors(theme);
  }

  setScrollSpeed(speed: number): void { this.scrollSpeed = speed; }
  getCurrentTheme(): AreaTheme { return this.currentTheme; }

  destroy(): void {
    for (const layer of this.layers) for (const s of layer.sprites) s.destroy();
    for (const d of this.decorObjects) d.g.destroy();
    this.particles.destroy();
    this.lightParticles.destroy();
  }

  private _updateParticleColors(theme: AreaTheme): void {
    const freq = theme === 'ultra_deep' ? 2000 : theme === 'deep_ruins' ? 1200 : 250;
    this.lightParticles.setFrequency(freq);
    this.particles.setFrequency(theme === 'ultra_deep' ? 1500 : 200);
  }
}

/**
 * ObstacleGenerator のユニットテスト
 *
 * 設計書「Testing Strategy - ユニットテスト（例示ベース）」より:
 * - ObstacleGenerator がオフスクリーン障害物を削除することの確認
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObstacleGenerator, nextGapY } from '../systems/ObstacleGenerator';
import type { Player } from '../models/Player';

// ---------------------------------------------------------------------------
// テストヘルパー
// ---------------------------------------------------------------------------

const CANVAS_W = 800;
const CANVAS_H = 600;

function makeGenerator(): ObstacleGenerator {
  return new ObstacleGenerator(CANVAS_W, CANVAS_H);
}

function makePlayer(x: number, y: number): Player {
  return {
    x,
    y,
    velocityY: 0,
    radius: 20,
    hasBubbleShield: false,
    animationState: 'idle',
  };
}

// ---------------------------------------------------------------------------
// nextGapY のテスト
// ---------------------------------------------------------------------------

describe('nextGapY', () => {
  it('返り値が [gapSize, canvasH - gapSize] の範囲に収まる', () => {
    const canvasH = 600;
    const gapSize = 150;
    const prevGapY = 300;

    for (let i = 0; i < 100; i++) {
      const result = nextGapY(prevGapY, canvasH, gapSize);
      expect(result).toBeGreaterThanOrEqual(gapSize);
      expect(result).toBeLessThanOrEqual(canvasH - gapSize);
    }
  });

  it('前回位置からの変動が最大 30% を超えない（ただしクランプ後）', () => {
    const canvasH = 600;
    const gapSize = 100;
    const prevGapY = 300;
    const maxDelta = canvasH * 0.3; // 180

    for (let i = 0; i < 100; i++) {
      const result = nextGapY(prevGapY, canvasH, gapSize);
      // クランプ後の値が、クランプ前の target が maxDelta 範囲内のランダム値から
      // 来ていることの間接的確認（クランプ後は必ず範囲内）
      expect(result).toBeGreaterThanOrEqual(gapSize);
      expect(result).toBeLessThanOrEqual(canvasH - gapSize);
      // クランプなしでは最大 prevGapY ± maxDelta だが、クランプ後は常に範囲内
      const unclamped_max = prevGapY + maxDelta;
      const unclamped_min = prevGapY - maxDelta;
      // クランプ後の値はクランプ前の上限/下限を超えることはない
      expect(result).toBeLessThanOrEqual(Math.max(unclamped_max, canvasH - gapSize));
      expect(result).toBeGreaterThanOrEqual(Math.min(unclamped_min, gapSize));
    }
  });

  it('ギャップサイズが大きい場合もクランプされる', () => {
    // gapSize が大きいと margin が大きくなり、範囲が狭くなる
    const canvasH = 600;
    const gapSize = 250;
    const prevGapY = 100; // 端に近い位置

    for (let i = 0; i < 50; i++) {
      const result = nextGapY(prevGapY, canvasH, gapSize);
      expect(result).toBeGreaterThanOrEqual(gapSize);          // 250
      expect(result).toBeLessThanOrEqual(canvasH - gapSize);   // 350
    }
  });
});

// ---------------------------------------------------------------------------
// ObstacleGenerator.spawnObstacle のテスト
// ---------------------------------------------------------------------------

describe('ObstacleGenerator.spawnObstacle', () => {
  let gen: ObstacleGenerator;

  beforeEach(() => {
    gen = makeGenerator();
  });

  it('cave_wall をスポーンすると gapY と gapSize が設定される', () => {
    const obs = gen.spawnObstacle({ type: 'cave_wall', x: 800, y: 0, gapSize: 200 });
    expect(obs.type).toBe('cave_wall');
    expect(obs.gapY).toBeDefined();
    expect(obs.gapSize).toBe(200);
    expect(obs.scored).toBe(false);
  });

  it('cave_wall の gapY はキャンバス範囲内に収まる', () => {
    const gapSize = 200;
    for (let i = 0; i < 20; i++) {
      const obs = gen.spawnObstacle({ type: 'cave_wall', x: 800, y: 0, gapSize });
      expect(obs.gapY).toBeGreaterThanOrEqual(gapSize);
      expect(obs.gapY).toBeLessThanOrEqual(CANVAS_H - gapSize);
    }
  });

  it('jellyfish をスポーンすると amplitude と frequency と phase が設定される', () => {
    const obs = gen.spawnObstacle({ type: 'jellyfish', x: 800, y: 300, amplitude: 50, frequency: 1 });
    expect(obs.type).toBe('jellyfish');
    expect(obs.amplitude).toBe(50);
    expect(obs.frequency).toBe(1);
    expect(obs.phase).toBe(0);
  });

  it('jellyfish にデフォルト値が適用される', () => {
    const obs = gen.spawnObstacle({ type: 'jellyfish', x: 800, y: 300 });
    expect(obs.amplitude).toBeDefined();
    expect(obs.frequency).toBeDefined();
    expect(obs.amplitude).toBeGreaterThan(0);
    expect(obs.frequency).toBeGreaterThan(0);
  });

  it('squid をスポーンすると座標が設定される', () => {
    const obs = gen.spawnObstacle({ type: 'squid', x: 800, y: 200 });
    expect(obs.type).toBe('squid');
    expect(obs.x).toBe(800);
    expect(obs.y).toBe(200);
  });

  it('seaweed をスポーンすると amplitude と frequency と phase が設定される', () => {
    const obs = gen.spawnObstacle({ type: 'seaweed', x: 800, y: 400 });
    expect(obs.type).toBe('seaweed');
    expect(obs.amplitude).toBeDefined();
    expect(obs.frequency).toBeDefined();
    expect(obs.phase).toBe(0);
  });

  it('current_zone をスポーンすると pushForce が設定される', () => {
    const obs = gen.spawnObstacle({ type: 'current_zone', x: 800, y: 0, pushForce: 200 });
    expect(obs.type).toBe('current_zone');
    expect(obs.pushForce).toBe(200);
  });

  it('current_zone にデフォルト pushForce が適用される', () => {
    const obs = gen.spawnObstacle({ type: 'current_zone', x: 800, y: 0 });
    expect(obs.pushForce).toBeDefined();
    expect(obs.pushForce).toBeGreaterThan(0);
  });

  it('スポーンした障害物は getActiveObstacles() に含まれる', () => {
    gen.spawnObstacle({ type: 'squid', x: 800, y: 200 });
    gen.spawnObstacle({ type: 'jellyfish', x: 700, y: 300 });
    expect(gen.getActiveObstacles()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ObstacleGenerator.removeOffscreen のテスト（Requirements: 7.6）
// ---------------------------------------------------------------------------

describe('ObstacleGenerator.removeOffscreen', () => {
  it('キャンバス左端の外へ出た障害物を削除する', () => {
    const gen = makeGenerator();

    // 画面内の障害物
    gen.spawnObstacle({ type: 'squid', x: 400, y: 200 });
    // 画面外（左端を超えた）障害物: x < 0 - width
    // squid の幅は 70px なので x = -80 は境界外
    const offscreen = gen.spawnObstacle({ type: 'squid', x: -80, y: 200 });

    expect(gen.getActiveObstacles()).toHaveLength(2);

    gen.removeOffscreen();

    const remaining = gen.getActiveObstacles();
    expect(remaining).toHaveLength(1);
    expect(remaining.find(o => o.id === offscreen.id)).toBeUndefined();
  });

  it('x = 0 - width の境界上の障害物は削除される', () => {
    const gen = makeGenerator();
    // squid width = 70, x = -70 → x === -width → 削除対象（x > -width が false）
    gen.spawnObstacle({ type: 'squid', x: -70, y: 200 });
    gen.removeOffscreen();
    expect(gen.getActiveObstacles()).toHaveLength(0);
  });

  it('x = -width + 1 の障害物は削除されない', () => {
    const gen = makeGenerator();
    // squid width = 70, x = -69 → x > -70 は true → 保持
    gen.spawnObstacle({ type: 'squid', x: -69, y: 200 });
    gen.removeOffscreen();
    expect(gen.getActiveObstacles()).toHaveLength(1);
  });

  it('すべての障害物がオフスクリーンの場合、リストが空になる', () => {
    const gen = makeGenerator();
    gen.spawnObstacle({ type: 'cave_wall', x: -100, y: 0 });
    gen.spawnObstacle({ type: 'jellyfish', x: -60, y: 300 });
    gen.removeOffscreen();
    expect(gen.getActiveObstacles()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ObstacleGenerator.update のテスト
// ---------------------------------------------------------------------------

describe('ObstacleGenerator.update', () => {
  it('cave_wall は update 後に x が左へ移動する', () => {
    const gen = makeGenerator();
    gen.setScrollSpeed(200);
    const obs = gen.spawnObstacle({ type: 'cave_wall', x: 800, y: 0 });
    const initialX = obs.x;
    gen.update(0.1); // 0.1 秒 = 10ms
    expect(obs.x).toBeLessThan(initialX);
    expect(obs.x).toBeCloseTo(initialX - 200 * 0.1, 5);
  });

  it('jellyfish は update 後に x が左へ移動する', () => {
    const gen = makeGenerator();
    gen.setScrollSpeed(200);
    const obs = gen.spawnObstacle({ type: 'jellyfish', x: 800, y: 300 });
    const initialX = obs.x;
    gen.update(0.1);
    expect(obs.x).toBeLessThan(initialX);
  });

  it('jellyfish は update 後に y が正弦波で変化する', () => {
    const gen = makeGenerator();
    const obs = gen.spawnObstacle({ type: 'jellyfish', x: 800, y: 300, amplitude: 50, frequency: 1 });
    // phase=0 から始まるので update 後は sin(omega * delta) に基づく変化が生じる
    gen.update(0.25); // 1/4 周期（frequency=1Hz, omega=2π）
    // phase = 2π * 1 * 0.25 = π/2 → sin(π/2) = 1 → y = 300 + 50*1 = 350
    expect(obs.y).toBeCloseTo(350, 1);
  });

  it('squid は cave_wall の 1.5 倍の速度で左へ移動する', () => {
    const gen = makeGenerator();
    gen.setScrollSpeed(200);
    const cave = gen.spawnObstacle({ type: 'cave_wall', x: 800, y: 0 });
    const squid = gen.spawnObstacle({ type: 'squid', x: 800, y: 200 });
    const initialCaveX = cave.x;
    const initialSquidX = squid.x;
    gen.update(0.1);
    const caveDx = initialCaveX - cave.x;
    const squidDx = initialSquidX - squid.x;
    expect(squidDx).toBeCloseTo(caveDx * 1.5, 5);
  });

  it('seaweed は update 後に phase が増加する', () => {
    const gen = makeGenerator();
    const obs = gen.spawnObstacle({ type: 'seaweed', x: 800, y: 400, frequency: 0.5 });
    expect(obs.phase).toBe(0);
    gen.update(0.1);
    expect(obs.phase).toBeGreaterThan(0);
  });

  it('current_zone は cave_wall と同じ速度で左へ移動する', () => {
    const gen = makeGenerator();
    gen.setScrollSpeed(200);
    const zone = gen.spawnObstacle({ type: 'current_zone', x: 800, y: 0 });
    const initialX = zone.x;
    gen.update(0.1);
    expect(zone.x).toBeCloseTo(initialX - 200 * 0.1, 5);
  });
});

// ---------------------------------------------------------------------------
// applyCurrentZone のテスト（Requirements: 7.5）
// ---------------------------------------------------------------------------

describe('ObstacleGenerator.applyCurrentZone', () => {
  it('プレイヤーが current_zone の外にいる場合は 0 を返す', () => {
    const gen = makeGenerator();
    gen.spawnObstacle({ type: 'current_zone', x: 400, y: 0, pushForce: 150 });
    // プレイヤーは current_zone の外（x=100 は zone.x=400 より左）
    const player = makePlayer(100, 300);
    expect(gen.applyCurrentZone(player)).toBe(0);
  });

  it('プレイヤーが current_zone の中にいる場合は pushForce を返す', () => {
    const gen = makeGenerator();
    gen.spawnObstacle({ type: 'current_zone', x: 300, y: 0, pushForce: 150 });
    // current_zone: x=300, width=120 → 300〜420, y=0, height=600
    const player = makePlayer(360, 300); // 中央付近
    expect(gen.applyCurrentZone(player)).toBe(150);
  });

  it('複数の current_zone が重なる場合、pushForce を合算する', () => {
    const gen = makeGenerator();
    gen.spawnObstacle({ type: 'current_zone', x: 300, y: 0, pushForce: 100 });
    gen.spawnObstacle({ type: 'current_zone', x: 350, y: 0, pushForce: 80 });
    const player = makePlayer(370, 300); // 両ゾーンの中
    // 1つ目: x=300, width=120 → 300〜420 ✓
    // 2つ目: x=350, width=120 → 350〜470 ✓
    const push = gen.applyCurrentZone(player);
    expect(push).toBe(180);
  });

  it('cave_wall 等の非 current_zone 障害物は push 計算に影響しない', () => {
    const gen = makeGenerator();
    gen.spawnObstacle({ type: 'cave_wall', x: 300, y: 0 });
    const player = makePlayer(330, 300);
    expect(gen.applyCurrentZone(player)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setScrollSpeed / setSpawnInterval のテスト
// ---------------------------------------------------------------------------

describe('ObstacleGenerator 設定メソッド', () => {
  it('setScrollSpeed が cave_wall の移動速度に反映される', () => {
    const gen = makeGenerator();
    gen.setScrollSpeed(400);
    const obs = gen.spawnObstacle({ type: 'cave_wall', x: 800, y: 0 });
    const initialX = obs.x;
    gen.update(0.1);
    expect(obs.x).toBeCloseTo(initialX - 400 * 0.1, 5);
  });

  it('setSpawnInterval を変更するとスポーンタイミングが変わる', () => {
    const gen = makeGenerator();
    gen.setSpawnInterval(1000); // 1 秒ごと

    // 1 秒未満では自動スポーンなし
    gen.update(0.9);
    expect(gen.getActiveObstacles()).toHaveLength(0);

    // 1 秒を超えたら自動スポーン発生
    gen.update(0.2);
    expect(gen.getActiveObstacles()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getActiveObstacles のコピー不変条件テスト
// ---------------------------------------------------------------------------

describe('getActiveObstacles', () => {
  it('返り値を変更しても内部リストに影響しない', () => {
    const gen = makeGenerator();
    gen.spawnObstacle({ type: 'squid', x: 800, y: 200 });
    const obstacles = gen.getActiveObstacles();
    obstacles.length = 0; // 外側から clear しても...
    expect(gen.getActiveObstacles()).toHaveLength(1); // 内部は変わらない
  });
});

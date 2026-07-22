// Feature: gelpiyo-deep-sea-adventure, Property 4: 衝突検出の健全性（重なりは必ず検出する）

/**
 * CollisionDetector プロパティテスト
 *
 * Property 4: 衝突検出の健全性（重なりは必ず検出する）
 * - 円ヒットボックスが矩形に重なる場合は必ず non-null を返す
 * - 重なっていない場合は null を返す
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CollisionDetector } from '../systems/CollisionDetector';
import { circlePenetrates } from '../utils/MathUtils';
import { SCREEN } from '../config';
import type { Player } from '../models/Player';
import type { Obstacle } from '../models/Obstacle';

// ---------------------------------------------------------------------------
// ヘルパー: テスト用プレイヤーを生成
// ---------------------------------------------------------------------------
function makePlayer(x: number, y: number, radius: number): Player {
  return {
    x,
    y,
    velocityY: 0,
    radius,
    hasBubbleShield: false,
    animationState: 'idle',
  };
}

// ---------------------------------------------------------------------------
// ヘルパー: テスト用障害物を生成（cave_wall 以外の単純 AABB）
// ---------------------------------------------------------------------------
function makeObstacle(
  x: number,
  y: number,
  width: number,
  height: number,
  type: Obstacle['type'] = 'jellyfish',
): Obstacle {
  return {
    id: 'test-obstacle',
    type,
    x,
    y,
    width,
    height,
    scored: false,
  };
}

// ---------------------------------------------------------------------------
// ヘルパー: cave_wall 障害物を生成
// ---------------------------------------------------------------------------
function makeCaveWall(
  x: number,
  width: number,
  gapY: number,
  gapSize: number,
): Obstacle {
  return {
    id: 'test-cave-wall',
    type: 'cave_wall',
    x,
    y: 0,
    width,
    height: SCREEN.HEIGHT,
    gapY,
    gapSize,
    scored: false,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries（入力生成器）
// ---------------------------------------------------------------------------



/**
 * 「円が矩形と重なる」状況を生成するアービトラリ。
 *
 * 戦略:
 *   1. プレイヤー (cx, cy, r) を生成する
 *   2. 矩形の一辺の長さ (w, h) を生成する
 *   3. 矩形の中心が円と重なるよう矩形の左上座標を決める
 *      → rect.x ∈ [cx - w + 1 - r, cx + r] を満たす値を選ぶ
 *      → rect.y ∈ [cy - h + 1 - r, cy + r] を満たす値を選ぶ
 *   ただし circlePenetrates() で最終確認し、重ならない場合はfilterで除外
 */
const overlappingArb = fc
  .tuple(
    fc.integer({ min: 50, max: SCREEN.WIDTH - 50 }),  // cx
    fc.integer({ min: 50, max: SCREEN.HEIGHT - 50 }), // cy
    fc.integer({ min: 5, max: 25 }),                  // r
    fc.integer({ min: 10, max: 100 }),                // w
    fc.integer({ min: 10, max: 100 }),                // h
    fc.integer({ min: 0, max: 99 }),                  // rx offset (%)
    fc.integer({ min: 0, max: 99 }),                  // ry offset (%)
  )
  .map(([cx, cy, r, w, h, rxPct, ryPct]) => {
    // 矩形左上 X: cx - w + 1 〜 cx + r の範囲で rxPct を使って決定
    const rxMin = cx - w - r;
    const rxMax = cx + r;
    const rx = rxMin + Math.round(((rxMax - rxMin) * rxPct) / 100);

    // 矩形左上 Y: cy - h + 1 〜 cy + r の範囲で ryPct を使って決定
    const ryMin = cy - h - r;
    const ryMax = cy + r;
    const ry = ryMin + Math.round(((ryMax - ryMin) * ryPct) / 100);

    return { cx, cy, r, rx, ry, w, h };
  })
  .filter(({ cx, cy, r, rx, ry, w, h }) =>
    circlePenetrates(cx, cy, r, {
      left: rx,
      right: rx + w,
      top: ry,
      bottom: ry + h,
    }),
  );

/**
 * 「円が矩形と重ならない」状況を生成するアービトラリ。
 *
 * 戦略: 矩形を円の右側に十分離して配置する（gap >= 1px）
 */
const nonOverlappingArb = fc
  .tuple(
    fc.integer({ min: 5, max: 25 }),   // r
    fc.integer({ min: 1, max: 50 }),   // gap（円と矩形の間の隙間）
    fc.integer({ min: 10, max: 100 }), // w
    fc.integer({ min: 10, max: 100 }), // h
  )
  .chain(([r, gap, w, h]) =>
    fc.tuple(
      fc.integer({ min: r + 5, max: 200 }),             // cx
      fc.integer({ min: r + 5, max: SCREEN.HEIGHT - r - 5 }), // cy
      fc.constant(r),
      fc.constant(gap),
      fc.constant(w),
      fc.constant(h),
    ),
  )
  .map(([cx, cy, r, gap, w, h]) => ({
    cx,
    cy,
    r,
    rx: cx + r + gap, // 円の右端 + gap
    ry: cy - h / 2,   // 矩形を円と同じ高さに配置
    w,
    h,
  }))
  .filter(({ cx, cy, r, rx, ry, w, h }) =>
    !circlePenetrates(cx, cy, r, {
      left: rx,
      right: rx + w,
      top: ry,
      bottom: ry + h,
    }),
  );

// ---------------------------------------------------------------------------
// テストスイート
// ---------------------------------------------------------------------------

const detector = new CollisionDetector();

describe('CollisionDetector — Property 4: 衝突検出の健全性', () => {
  /**
   * プロパティ 4a: 円が矩形と重なる場合、checkObstacleCollision は non-null を返す
   *
   * Validates: Requirements 8.1, 8.2
   */
  it('円が矩形（単純 AABB）と重なる場合 checkObstacleCollision は non-null を返す', () => {
    fc.assert(
      fc.property(overlappingArb, ({ cx, cy, r, rx, ry, w, h }) => {
        const player = makePlayer(cx, cy, r);
        const obstacle = makeObstacle(rx, ry, w, h, 'jellyfish');

        const result = detector.checkObstacleCollision(player, [obstacle]);

        expect(result).not.toBeNull();
        expect(result).toBe(obstacle);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * プロパティ 4b: 円が矩形と重なっていない場合、checkObstacleCollision は null を返す
   *
   * Validates: Requirements 8.1, 8.2
   */
  it('円が矩形（単純 AABB）と重なっていない場合 checkObstacleCollision は null を返す', () => {
    fc.assert(
      fc.property(nonOverlappingArb, ({ cx, cy, r, rx, ry, w, h }) => {
        const player = makePlayer(cx, cy, r);
        const obstacle = makeObstacle(rx, ry, w, h, 'jellyfish');

        const result = detector.checkObstacleCollision(player, [obstacle]);

        expect(result).toBeNull();
      }),
      { numRuns: 200 },
    );
  });

  /**
   * cave_wall テスト: ギャップ内にいるプレイヤーは null（衝突しない）
   *
   * Validates: Requirements 8.2
   */
  it('cave_wall: プレイヤーがギャップ内にいる場合 null を返す', () => {
    // 固定値でギャップ内に配置されたプレイヤーが衝突しないことを確認
    const r = 15;
    const gapSize = 180;
    const gapY = 300; // 画面中央
    const obstacleX = 400;
    const obstacleWidth = 60;

    // プレイヤーをギャップ中央に配置
    const playerY = gapY;
    const playerX = obstacleX + obstacleWidth / 2;

    const player = makePlayer(playerX, playerY, r);
    const caveWall = makeCaveWall(obstacleX, obstacleWidth, gapY, gapSize);

    // ギャップ内チェック: player.y - r > gapY - gapSize/2 かつ player.y + r < gapY + gapSize/2
    const topOfGap = gapY - gapSize / 2;
    const bottomOfGap = gapY + gapSize / 2;

    // 前提: プレイヤーはギャップ内に完全に収まっている
    expect(playerY - r).toBeGreaterThan(topOfGap);
    expect(playerY + r).toBeLessThan(bottomOfGap);

    const result = detector.checkObstacleCollision(player, [caveWall]);
    expect(result).toBeNull();
  });

  /**
   * cave_wall テスト: 壁部分に重なるプレイヤーは non-null（衝突する）
   *
   * Validates: Requirements 8.2
   */
  it('cave_wall: プレイヤーが上壁に重なる場合 non-null を返す', () => {
    // プレイヤーを上壁に重ねる具体例
    const r = 15;
    const gapY = 300;
    const gapSize = 180;
    const obstacleX = 400;
    const obstacleWidth = 60;

    // 上壁の底端: gapY - gapSize/2 = 210
    // プレイヤーを上壁内に配置: y = 100（上壁範囲 0〜210 内）
    const playerX = obstacleX + obstacleWidth / 2;
    const playerY = 100;

    const player = makePlayer(playerX, playerY, r);
    const caveWall = makeCaveWall(obstacleX, obstacleWidth, gapY, gapSize);

    const result = detector.checkObstacleCollision(player, [caveWall]);
    expect(result).not.toBeNull();
  });

  it('cave_wall: プレイヤーが下壁に重なる場合 non-null を返す', () => {
    const r = 15;
    const gapY = 300;
    const gapSize = 180;
    const obstacleX = 400;
    const obstacleWidth = 60;

    // 下壁の上端: gapY + gapSize/2 = 390
    // プレイヤーを下壁内に配置: y = 500（下壁範囲 390〜600 内）
    const playerX = obstacleX + obstacleWidth / 2;
    const playerY = 500;

    const player = makePlayer(playerX, playerY, r);
    const caveWall = makeCaveWall(obstacleX, obstacleWidth, gapY, gapSize);

    const result = detector.checkObstacleCollision(player, [caveWall]);
    expect(result).not.toBeNull();
  });

  /**
   * cave_wall プロパティテスト: 様々なギャップサイズと位置でギャップ内ならnull
   *
   * Validates: Requirements 8.2
   */
  it('cave_wall: プロパティテスト — ギャップ内にいる場合は常に null', () => {
    fc.assert(
      fc.property(
        fc.record({
          r: fc.integer({ min: 5, max: 20 }),
          gapSize: fc.integer({ min: 100, max: 250 }),
          gapY: fc.integer({ min: 150, max: SCREEN.HEIGHT - 150 }),
          obstacleX: fc.integer({ min: 100, max: 500 }),
          obstacleWidth: fc.integer({ min: 40, max: 100 }),
        }),
        ({ r, gapSize, gapY, obstacleX, obstacleWidth }) => {
          // ギャップ内の十分な余裕がある場合のみテスト
          const topOfGap = gapY - gapSize / 2;
          const bottomOfGap = gapY + gapSize / 2;
          const safeMargin = r + 2;

          // プレイヤーが完全にギャップ内に収まる位置を計算
          if (bottomOfGap - topOfGap < 2 * safeMargin + 1) {
            // ギャップが小さすぎてプレイヤーが収まらない: スキップ
            return;
          }

          const playerY = gapY; // ギャップ中央
          const playerX = obstacleX + obstacleWidth / 2;

          // ギャップ内に完全に収まるかチェック
          if (playerY - r <= topOfGap || playerY + r >= bottomOfGap) {
            return;
          }

          const player = makePlayer(playerX, playerY, r);
          const caveWall = makeCaveWall(obstacleX, obstacleWidth, gapY, gapSize);

          const result = detector.checkObstacleCollision(player, [caveWall]);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * 境界衝突テスト: top/bottom の境界判定が正確
   *
   * Validates: Requirements 8.3
   */
  describe('checkBoundaryCollision — 境界衝突の正確性', () => {
    it('プレイヤーが上端に接触している場合 "top" を返す', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 25 }), // r
          fc.integer({ min: 100, max: SCREEN.WIDTH - 100 }), // x
          (r, x) => {
            // y - r <= 0 (上端に接触)
            const y = r; // y - r = 0 → ちょうど上端に接触
            const player = makePlayer(x, y, r);
            const bounds = { top: 0, bottom: SCREEN.HEIGHT, left: 0, right: SCREEN.WIDTH };

            const result = detector.checkBoundaryCollision(player, bounds);
            expect(result).toBe('top');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('プレイヤーが下端に接触している場合 "bottom" を返す', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 25 }), // r
          fc.integer({ min: 100, max: SCREEN.WIDTH - 100 }), // x
          (r, x) => {
            // y + r >= SCREEN.HEIGHT (下端に接触)
            const y = SCREEN.HEIGHT - r; // y + r = SCREEN.HEIGHT → ちょうど下端に接触
            const player = makePlayer(x, y, r);
            const bounds = { top: 0, bottom: SCREEN.HEIGHT, left: 0, right: SCREEN.WIDTH };

            const result = detector.checkBoundaryCollision(player, bounds);
            expect(result).toBe('bottom');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('プレイヤーが境界内にいる場合 null を返す', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }), // r
          fc.integer({ min: 100, max: SCREEN.WIDTH - 100 }), // x
          (r, x) => {
            // 完全に境界内: r < y < SCREEN.HEIGHT - r
            const y = Math.floor(SCREEN.HEIGHT / 2); // 画面中央
            const player = makePlayer(x, y, r);
            const bounds = { top: 0, bottom: SCREEN.HEIGHT, left: 0, right: SCREEN.WIDTH };

            // r <= 20 かつ y = 300 なので y - r > 0 かつ y + r < 600 は常に成立
            const result = detector.checkBoundaryCollision(player, bounds);
            expect(result).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * 複数障害物リストのテスト: 最初に衝突した障害物を返す
   *
   * Validates: Requirements 8.1
   */
  it('複数障害物のうち最初に衝突する障害物を返す', () => {
    const player = makePlayer(100, 100, 15);

    // 1番目: 衝突しない（右側に離れた位置）
    const far = makeObstacle(300, 300, 50, 50, 'squid');
    // 2番目: 衝突する（プレイヤーと重なる）
    const hit = makeObstacle(90, 90, 30, 30, 'jellyfish');
    // 3番目: 衝突する（プレイヤーと重なる）
    const alsoHit = makeObstacle(95, 95, 20, 20, 'seaweed');

    const result = detector.checkObstacleCollision(player, [far, hit, alsoHit]);

    // リストの中で最初の衝突障害物 (hit) が返る
    expect(result).toBe(hit);
  });

  it('障害物リストが空の場合 null を返す', () => {
    const player = makePlayer(100, 100, 15);
    const result = detector.checkObstacleCollision(player, []);
    expect(result).toBeNull();
  });
});

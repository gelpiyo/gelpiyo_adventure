/**
 * ゲルぴよ深海大冒険 - 衝突検出システム
 *
 * 円形ヒットボックス（プレイヤー）と AABB 矩形（障害物）のハイブリッド衝突判定を提供する。
 * MathUtils の circlePenetrates() を活用し、cave_wall の複合矩形にも対応する。
 *
 * Requirements: 8.1, 8.2, 8.3
 */

import { circlePenetrates } from '../utils/MathUtils';
import type { Player } from '../models/Player';
import type { Obstacle } from '../models/Obstacle';
import type { Item } from '../models/Item';
import type { GameBounds } from '../models/GameBounds';
import { SCREEN } from '../config';

/**
 * 境界衝突の種類。
 * - 'top'    : プレイヤーが上端に触れた
 * - 'bottom' : プレイヤーが下端に触れた
 */
export type BoundaryHit = 'top' | 'bottom';

/**
 * CollisionDetector
 *
 * ゲームフィールド上の衝突判定を一元管理するクラス。
 * - checkObstacleCollision : プレイヤーと障害物群の衝突
 * - checkItemCollision     : プレイヤーとアイテム群の衝突
 * - checkBoundaryCollision : プレイヤーとフィールド境界の衝突
 *
 * Requirements: 8.1, 8.2, 8.3
 */
export class CollisionDetector {
  /**
   * プレイヤーと障害物リストの衝突判定。
   *
   * cave_wall は上壁・下壁の 2 つの AABB を生成して個別に判定する。
   * それ以外の障害物は単一の AABB として判定する。
   *
   * アルゴリズム（円-AABB ハイブリッド）:
   *   dx = clamp(cx, rect.left, rect.right) - cx
   *   dy = clamp(cy, rect.top, rect.bottom) - cy
   *   collides = (dx*dx + dy*dy) <= r*r
   *
   * @param player    - プレイヤー状態（円ヒットボックス: x, y, radius）
   * @param obstacles - アクティブな障害物リスト
   * @returns 最初に衝突した障害物、なければ null
   *
   * Requirements: 8.1, 8.2
   */
  checkObstacleCollision(player: Player, obstacles: Obstacle[]): Obstacle | null {
    for (const obstacle of obstacles) {
      if (this.collidesWithObstacle(player, obstacle)) {
        return obstacle;
      }
    }
    return null;
  }

  /**
   * プレイヤーとアイテムリストの衝突判定。
   *
   * アイテムは円形ヒットボックスを持つため、2 円の距離比較で判定する。
   * collected フラグが true のアイテムはスキップする。
   *
   * @param player - プレイヤー状態（円ヒットボックス: x, y, radius）
   * @param items  - アクティブなアイテムリスト
   * @returns 最初に衝突した未取得アイテム、なければ null
   *
   * Requirements: 8.1
   */
  checkItemCollision(player: Player, items: Item[]): Item | null {
    for (const item of items) {
      if (item.collected) continue;
      if (this.collidesWithItem(player, item)) {
        return item;
      }
    }
    return null;
  }

  /**
   * プレイヤーとフィールド境界の衝突判定。
   *
   * プレイヤーの円ヒットボックス（y ± radius）が上端または下端に触れているかを確認する。
   *
   * @param player - プレイヤー状態（円ヒットボックス: y, radius）
   * @param bounds - フィールド境界（top, bottom）
   * @returns 'top' | 'bottom' のいずれか、衝突していなければ null
   *
   * Requirements: 8.3
   */
  checkBoundaryCollision(player: Player, bounds: GameBounds): BoundaryHit | null {
    if (player.y - player.radius <= bounds.top) {
      return 'top';
    }
    if (player.y + player.radius >= bounds.bottom) {
      return 'bottom';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * 単一の障害物との衝突を判定する内部メソッド。
   *
   * cave_wall の場合は上壁・下壁の 2 つの AABB を生成して判定する。
   * それ以外は単一の AABB として判定する。
   */
  private collidesWithObstacle(player: Player, obstacle: Obstacle): boolean {
    if (obstacle.type === 'cave_wall') {
      return this.collidesWithCaveWall(player, obstacle);
    }

    // 単純な AABB 矩形（jellyfish, squid, seaweed, current_zone）
    const rect = {
      left: obstacle.x,
      right: obstacle.x + obstacle.width,
      top: obstacle.y,
      bottom: obstacle.y + obstacle.height,
    };
    return circlePenetrates(player.x, player.y, player.radius, rect);
  }

  /**
   * cave_wall との衝突判定。
   *
   * cave_wall は gapY と gapSize を持つ複合障害物。
   * 実際の衝突矩形:
   *   - 上壁: { left: obs.x, right: obs.x + obs.width, top: 0, bottom: gapY - gapSize/2 }
   *   - 下壁: { left: obs.x, right: obs.x + obs.width, top: gapY + gapSize/2, bottom: canvasHeight }
   *
   * gapY / gapSize が未定義の場合は obs.height を用いたフォールバック矩形で判定する。
   */
  private collidesWithCaveWall(player: Player, obstacle: Obstacle): boolean {
    const left = obstacle.x;
    const right = obstacle.x + obstacle.width;

    if (obstacle.gapY !== undefined && obstacle.gapSize !== undefined) {
      const halfGap = obstacle.gapSize / 2;

      // 上壁（天井 → ギャップ上端）
      const topWall = {
        left,
        right,
        top: 0,
        bottom: obstacle.gapY - halfGap,
      };

      // 下壁（ギャップ下端 → キャンバス下端）
      const bottomWall = {
        left,
        right,
        top: obstacle.gapY + halfGap,
        bottom: SCREEN.HEIGHT,
      };

      return (
        circlePenetrates(player.x, player.y, player.radius, topWall) ||
        circlePenetrates(player.x, player.y, player.radius, bottomWall)
      );
    }

    // フォールバック: gapY / gapSize が未定義の場合は単一 AABB で判定
    const rect = {
      left,
      right,
      top: obstacle.y,
      bottom: obstacle.y + obstacle.height,
    };
    return circlePenetrates(player.x, player.y, player.radius, rect);
  }

  /**
   * アイテムとの衝突判定（円-円）。
   *
   * プレイヤー円とアイテム円の中心間距離の二乗と、半径の和の二乗を比較する。
   * sqrt を避けることでパフォーマンスを最適化している。
   */
  private collidesWithItem(player: Player, item: Item): boolean {
    const dx = player.x - item.x;
    const dy = player.y - item.y;
    const combinedRadius = player.radius + item.radius;
    return dx * dx + dy * dy <= combinedRadius * combinedRadius;
  }
}

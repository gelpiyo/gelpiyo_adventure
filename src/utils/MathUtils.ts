/**
 * ゲルぴよ深海大冒険 - 数学ユーティリティ
 *
 * 衝突判定・補間・疑似乱数など、ゲーム全体で共用される数学関数を提供する。
 * Requirements: 3.4, 8.1, 18.1
 */

/**
 * 値を [min, max] の範囲に制限する。
 *
 * @param value - クランプ対象の値
 * @param min   - 最小値（inclusive）
 * @param max   - 最大値（inclusive）
 * @returns min <= value <= max となるようにクランプされた値
 *
 * Requirements: 3.4
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 円と AABB 矩形の衝突判定（AABB + 円形ヒットボックスのハイブリッド）。
 *
 * アルゴリズム:
 *   dx = clamp(cx, rect.left, rect.right) - cx
 *   dy = clamp(cy, rect.top, rect.bottom) - cy
 *   collides = (dx*dx + dy*dy) <= r*r
 *
 * @param cx   - 円の中心 X 座標 (px)
 * @param cy   - 円の中心 Y 座標 (px)
 * @param r    - 円の半径 (px)
 * @param rect - 矩形の境界 { left, right, top, bottom }
 * @returns 円と矩形が重なっている（または接している）場合 true
 *
 * Requirements: 8.1
 */
export function circlePenetrates(
  cx: number,
  cy: number,
  r: number,
  rect: { left: number; right: number; top: number; bottom: number },
): boolean {
  const dx = clamp(cx, rect.left, rect.right) - cx;
  const dy = clamp(cy, rect.top, rect.bottom) - cy;
  return dx * dx + dy * dy <= r * r;
}

/**
 * 線形補間（lerp）。
 *
 * @param a - 開始値（t=0 のとき返される値）
 * @param b - 終了値（t=1 のとき返される値）
 * @param t - 補間係数（通常 0.0〜1.0）
 * @returns a と b の間を t の割合で補間した値
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 日付文字列シード疑似乱数生成器（デイリーチャレンジ用）。
 *
 * 同一の seed に対しては常に同じ乱数列を生成する（決定論的）。
 * 異なる seed からは異なる乱数列が生成される。
 *
 * アルゴリズム（xorshift ベース）:
 *   let h = 0;
 *   for each char in seed: h = Math.imul(31, h) + charCode | 0
 *   return () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 0xFFFFFFFF; }
 *
 * @param seed - シード文字列（例: "2024-01-15"）
 * @returns 0.0〜1.0 の乱数を返すクロージャ
 *
 * Requirements: 18.1
 */
export function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return (): number => {
    h ^= h << 13;
    h ^= h >> 17;
    h ^= h << 5;
    return (h >>> 0) / 0xFFFFFFFF;
  };
}

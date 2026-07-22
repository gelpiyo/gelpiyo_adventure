/**
 * キャラクター関連の型定義
 *
 * CharacterType, CharacterConfig, CharacterPhysics は config.ts で定義されているため、
 * このファイルはそれらを再エクスポートします。
 *
 * Requirements: 21.1, 22.1, 22.2, 22.3, 22.4
 */

export type { CharacterType, CharacterConfig, CharacterPhysics } from '../config';
export { CHARACTER_CONFIGS } from '../config';

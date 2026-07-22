/**
 * src/models のバレルエクスポート
 *
 * すべてのデータモデルをここから一括でインポートできます。
 *
 * Requirements: 3.1, 7.1, 10.1, 11.1, 21.1, 22.1
 */

// Player モデル
export type { Player, PlayerAnimationState } from './Player';

// Obstacle モデル
export type { Obstacle, ObstacleType } from './Obstacle';

// Item モデル（ItemType を含む）
export type { Item, ItemType } from './Item';

// PowerUp モデル（PowerUpType を含む）
export type { PowerUp, PowerUpType, ActivePowerUp } from './PowerUp';

// Achievement モデル
export type { Achievement, AchievementCondition } from './Achievement';

// DailyChallenge モデル
export type { DailyChallenge } from './DailyChallenge';

// GameState モデル
export type { GameState, ScreenType } from './GameState';

// キャラクター関連モデル（CharacterType, CharacterConfig, CharacterPhysics）
export type { CharacterType, CharacterConfig, CharacterPhysics } from './Character';
export { CHARACTER_CONFIGS } from './Character';

// StorageSchema モデル
export type { StorageSchema } from './StorageSchema';

// GameEvent モデル
export type { GameEvent } from './GameEvent';

// GameBounds モデル
export type { GameBounds } from './GameBounds';

// config から AreaTheme を再エクスポート（全モデルと同じ場所から参照できるように）
export type { AreaTheme } from '../config';

import Phaser from 'phaser'
import { TitleScene } from './scenes/TitleScene'
import { GameScene } from './scenes/GameScene'
import { GameOverScene } from './scenes/GameOverScene'
import { CharacterSelectScene } from './scenes/CharacterSelectScene'
import { AchievementScene } from './scenes/AchievementScene'
import { SCREEN } from './config'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0a2e',
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    // 縦向き 9:16 スマートフォン対応 (Req 14.1)
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: SCREEN.WIDTH,
    height: SCREEN.HEIGHT,
    parent: 'game',
  },
  scene: [
    TitleScene,
    CharacterSelectScene,
    GameScene,
    GameOverScene,
    AchievementScene,
  ],
}

new Phaser.Game(config)

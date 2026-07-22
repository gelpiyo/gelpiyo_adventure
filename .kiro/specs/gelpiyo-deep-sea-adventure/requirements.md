# Requirements Document

## Introduction

「ゲルぴよ深海大冒険」は、神秘的な深海を舞台とした横スクロール型ワンタップアクションゲームである。プレイヤーは愛らしいキャラクター「ゲルぴよ」を操作し、障害物を回避しながら深海の美しい世界を冒険する。スマートフォンブラウザを主要ターゲットとした縦向き（ポートレート）9:16 比率の画面レイアウトで提供し、子供から大人まで楽しめる温かみのある 3D アニメーション風ビジュアルを採用する。PC ブラウザにも対応する。

本要件書は MVP（最初に実装すべき機能）および将来の拡張機能を含む全体要件を定義する。

---

## Glossary

- **Game**: ゲルぴよ深海大冒険の全体ゲームアプリケーション
- **Gelpiyo**: プレイヤーが操作する主人公キャラクター。丸みを帯びた柔らかいフォルムと大きな目を持つゲルの生き物
- **TitleScreen**: ゲーム開始前に表示されるタイトル画面
- **GameScreen**: ゲームプレイ中の画面
- **GameOverScreen**: ゲームオーバー時に表示される画面
- **PhysicsEngine**: Gelpiyo の浮力・重力相当の垂直移動を制御するエンジン
- **ScrollEngine**: 横スクロールの速度・加速を制御するエンジン
- **ObstacleGenerator**: 障害物を生成・管理するシステム
- **CollisionDetector**: Gelpiyo と障害物・画面境界の衝突を検出するシステム
- **ScoreSystem**: スコアの計算・表示・保存を管理するシステム
- **ItemSystem**: アイテムの生成・取得・効果を管理するシステム
- **PowerUpSystem**: パワーアップの発動・継続・終了を管理するシステム
- **AudioManager**: BGM および効果音の再生・制御を行うシステム
- **BackgroundRenderer**: パララックス多層背景を描画するシステム
- **DifficultyManager**: 時間経過に応じた難易度調整を行うシステム
- **AchievementSystem**: 実績・バッジの管理システム（追加要素）
- **AreaTheme**: ゲーム内エリア（浅海サンゴ礁・海底洞窟・沈没船・深海遺跡・超深海）
- **Obstacle**: プレイヤーが回避すべき障害物の総称
- **Item**: スコア加点または救済効果を持つ取得可能オブジェクト
- **PowerUp**: 一時的な特殊能力を付与するオブジェクト
- **HighScore**: ローカルストレージに保存された最高スコア
- **ParallaxLayer**: 遠景・中景・前景の独立スクロールレイヤー
- **CharacterSelectScreen**: ゲーム開始前にプレイアブルキャラクターを選択する画面
- **CharacterType**: プレイアブルキャラクターの種別。Gelpiyo（標準）・Momopliyo（ピンク系）・Palpiyo（青系）・Midoripiyo（緑系）の4種類が存在し、それぞれ固有の物理パラメータを持つ
- **DeathAnimation**: ゲームオーバートリガー後、GameOverScreen 表示前に実行されるキャラクター退場アニメーション。バルーンファイト風に衝突の瞬間びっくり表情で一瞬上昇し、その後重力に従って画面下へ落下・退場する演出フェーズ

---

## Requirements

---

### Requirement 1: タイトル画面の表示

**User Story:** ゲームプレイヤーとして、魅力的なタイトル画面を見たい。ゲームの世界観を理解してプレイ意欲を高めるため。

#### Acceptance Criteria

1. THE Game SHALL display the TitleScreen as the first screen on application launch.
2. WHEN the TitleScreen is displayed, THE TitleScreen SHALL show the game title "ゲルぴよ深海大冒険" prominently.
3. WHEN the TitleScreen is displayed, THE TitleScreen SHALL show an animated Gelpiyo character.
4. WHEN the TitleScreen is displayed, THE TitleScreen SHALL show the current HighScore value retrieved from local storage.
5. WHEN the TitleScreen is displayed, THE TitleScreen SHALL show a "START" prompt indicating how to begin the game.
6. WHEN the TitleScreen is displayed, THE BackgroundRenderer SHALL render an animated deep-sea background with floating particles and ambient light effects.
7. WHEN the HighScore value is zero, THE TitleScreen SHALL display "0" as the HighScore.

---

### Requirement 2: ゲーム開始操作

**User Story:** ゲームプレイヤーとして、PC とスマートフォンの両方から直感的にゲームを開始したい。どのデバイスでもスムーズにプレイを開始できるようにするため。

#### Acceptance Criteria

1. WHEN the TitleScreen is displayed AND the player presses the Space key, THE Game SHALL transition to the GameScreen and begin gameplay.
2. WHEN the TitleScreen is displayed AND the player taps the screen, THE Game SHALL transition to the GameScreen and begin gameplay.
3. WHEN the GameScreen starts, THE ScrollEngine SHALL begin horizontal scrolling at the initial scroll speed.
4. WHEN the GameScreen starts, THE AudioManager SHALL begin playing the BGM.

---

### Requirement 3: Gelpiyo の物理挙動

**User Story:** ゲームプレイヤーとして、ワンボタンで Gelpiyo を直感的に操作したい。シンプルな操作でありながら、操作のコツがある遊び応えを感じるため。

#### Acceptance Criteria

1. WHILE the GameScreen is active, THE PhysicsEngine SHALL apply a constant downward velocity to Gelpiyo simulating buoyancy loss over time.
2. WHEN the player presses the Space key during gameplay, THE PhysicsEngine SHALL apply an upward velocity impulse to Gelpiyo.
3. WHEN the player taps the screen during gameplay, THE PhysicsEngine SHALL apply an upward velocity impulse to Gelpiyo.
4. WHILE Gelpiyo is moving, THE PhysicsEngine SHALL clamp Gelpiyo's vertical position within the visible game area boundaries.
5. WHEN Gelpiyo receives an upward impulse, THE PhysicsEngine SHALL play the swimming sound effect via the AudioManager.

---

### Requirement 4: 横スクロールと難易度自動調整

**User Story:** ゲームプレイヤーとして、ゲームが時間とともに徐々に難しくなってほしい。長く遊ぶほど緊張感が増してやりがいを感じるため。

#### Acceptance Criteria

1. WHILE the GameScreen is active, THE ScrollEngine SHALL scroll the game world horizontally at the current scroll speed.
2. WHILE the GameScreen is active, THE DifficultyManager SHALL increase the scroll speed by a fixed increment every 10 seconds of elapsed gameplay time.
3. WHILE the GameScreen is active, THE DifficultyManager SHALL increase the obstacle spawn frequency every 15 seconds of elapsed gameplay time.
4. WHILE the GameScreen is active, THE DifficultyManager SHALL decrease the gap size between obstacles every 20 seconds of elapsed gameplay time, to a minimum gap size of 150 pixels.
5. THE DifficultyManager SHALL cap the maximum scroll speed at 3 times the initial scroll speed.

---

### Requirement 5: エリアテーマの切り替え

**User Story:** ゲームプレイヤーとして、冒険を続けると異なる深海の景色に変わってほしい。視覚的な変化があることで飽きずに長くプレイできるため。

#### Acceptance Criteria

1. WHEN the score reaches the threshold for AreaTheme "海底洞窟", THE BackgroundRenderer SHALL transition to the cave visual theme with narrower passage aesthetics.
2. WHEN the score reaches the threshold for AreaTheme "沈没船エリア", THE BackgroundRenderer SHALL transition to the sunken ship visual theme.
3. WHEN the score reaches the threshold for AreaTheme "深海遺跡", THE BackgroundRenderer SHALL transition to the ancient ruins visual theme with increased glow effects.
4. WHEN the score reaches the threshold for AreaTheme "超深海", THE BackgroundRenderer SHALL transition to the ultra-deep dark theme with maximum darkness and difficulty.
5. WHEN an AreaTheme transition occurs, THE AudioManager SHALL smoothly crossfade to the BGM track corresponding to the new AreaTheme.

---

### Requirement 6: パララックス背景

**User Story:** ゲームプレイヤーとして、奥行きのある深海の世界を感じたい。立体的な背景演出によって没入感を高めるため。

#### Acceptance Criteria

1. WHILE the GameScreen is active, THE BackgroundRenderer SHALL render at least three independent ParallaxLayer instances: a far layer, a mid layer, and a near layer.
2. WHILE the GameScreen is active, THE BackgroundRenderer SHALL scroll the far ParallaxLayer at a speed slower than the mid ParallaxLayer.
3. WHILE the GameScreen is active, THE BackgroundRenderer SHALL scroll the mid ParallaxLayer at a speed slower than the near ParallaxLayer.
4. WHILE the GameScreen is active, THE BackgroundRenderer SHALL continuously render floating bubble and light particle effects across all layers.
5. THE BackgroundRenderer SHALL load PNG background tile images from `assets/sprites/` for each AreaTheme and each parallax layer (far, mid, near) when available, using the naming convention `bg_{theme}_{layer}.png` (e.g. `bg_shallow_reef_far.png`), and SHALL fall back to procedurally drawn solid-color tiles when sprite assets are absent.
6. WHEN background PNG sprite assets are present, THE BackgroundRenderer SHALL tile them horizontally to create seamlessly scrolling underwater scenery that matches the current AreaTheme.

---

### Requirement 7: 障害物の生成と描画

**User Story:** ゲームプレイヤーとして、深海らしいオリジナルの障害物を避けながら冒険したい。フラッピーバード的な単調さではなく、世界観に沿った多彩な障害物で面白さを感じるため。

#### Acceptance Criteria

1. WHILE the GameScreen is active, THE ObstacleGenerator SHALL spawn cave wall obstacles (上下から迫る洞窟壁) as the primary obstacle type with a gap for Gelpiyo to pass through.
2. WHILE the GameScreen is active, THE ObstacleGenerator SHALL spawn jellyfish obstacles that move vertically in a sinusoidal pattern.
3. WHILE the GameScreen is active, THE ObstacleGenerator SHALL spawn glowing squid obstacles that move horizontally across the screen.
4. WHILE the GameScreen is active, THE ObstacleGenerator SHALL spawn giant seaweed obstacles that sway left and right periodically.
5. WHILE the GameScreen is active, THE ObstacleGenerator SHALL spawn ocean current zones that apply a horizontal push force to Gelpiyo upon entry.
6. WHEN an obstacle moves beyond the left edge of the visible screen, THE ObstacleGenerator SHALL remove that obstacle from the game world.
7. THE ObstacleGenerator SHALL use only deep-sea themed visual designs for all obstacles and SHALL NOT use pipe-style designs.
8. THE ObstacleGenerator SHALL load PNG sprite images from `assets/sprites/` for each obstacle type using the naming convention `obstacle_{type}.png` (e.g. `obstacle_jellyfish.png`) when available, and SHALL fall back to procedurally drawn shapes when sprite assets are absent.

---

### Requirement 8: 当たり判定とゲームオーバー

**User Story:** ゲームプレイヤーとして、障害物や画面端に触れたときに明確にゲームオーバーになってほしい。公平でわかりやすいゲームオーバー判定でプレイ意欲を維持するため。

#### Acceptance Criteria

1. WHEN the CollisionDetector detects contact between Gelpiyo and any Obstacle, THE Game SHALL trigger the game over sequence.
2. WHEN Gelpiyo's vertical position reaches the top boundary of the GameScreen, THE Game SHALL trigger the game over sequence.
3. WHEN Gelpiyo's vertical position reaches the bottom boundary of the GameScreen, THE Game SHALL trigger the game over sequence.
4. WHEN the game over sequence is triggered, THE AudioManager SHALL stop the BGM and play the game over sound effect.
5. WHEN the game over sequence is triggered, THE Game SHALL enter the DeathAnimation phase before displaying the GameOverScreen.
6. WHEN the final score exceeds the stored HighScore, THE ScoreSystem SHALL update the HighScore in local storage before displaying the GameOverScreen.
7. WHEN the game over sequence is triggered, THE Game SHALL immediately switch Gelpiyo's sprite to the hit expression, freeze all scrolling and obstacle generation, and apply an upward velocity impulse of -350 px/s to Gelpiyo as the DeathAnimation begins.
8. DURING the DeathAnimation phase, THE ScrollEngine SHALL stop scrolling and no new obstacles SHALL be spawned, but Gelpiyo SHALL continue to be subject to gravity causing it to arc upward briefly then fall downward off the bottom of the screen.
9. WHEN Gelpiyo's position exceeds the bottom boundary of the visible screen during the DeathAnimation, THE Game SHALL wait approximately 1 second, then transition to the GameOverScreen.
10. DURING the DeathAnimation phase, THE Game SHALL NOT accept any player input (Space key or tap) to prevent accidental retries.

---

### Requirement 9: スコアシステム

**User Story:** ゲームプレイヤーとして、障害物を通過するたびにスコアが増えることを確認しながらプレイしたい。達成感とモチベーションを維持するため。

#### Acceptance Criteria

1. WHEN Gelpiyo passes through a set of cave wall obstacles, THE ScoreSystem SHALL increment the score by 1 point.
2. WHILE the GameScreen is active, THE ScoreSystem SHALL display the current score in the top-right corner of the screen at all times.
3. WHEN the GameScreen starts, THE ScoreSystem SHALL initialize the current score to zero.
4. THE ScoreSystem SHALL persist the HighScore value in browser local storage across game sessions.
5. WHEN the application loads, THE ScoreSystem SHALL retrieve the HighScore from local storage and display it on the TitleScreen.

---

### Requirement 10: アイテムの取得とスコア加点

**User Story:** ゲームプレイヤーとして、深海のアイテムを取ってボーナスポイントを獲得したい。スコア最大化という付加的な目標でゲームに深みを加えるため。

#### Acceptance Criteria

1. WHILE the GameScreen is active, THE ItemSystem SHALL randomly spawn pearl items that award 5 points upon collection.
2. WHILE the GameScreen is active, THE ItemSystem SHALL randomly spawn glowing crystal items that award 10 points upon collection.
3. WHILE the GameScreen is active, THE ItemSystem SHALL randomly spawn deep-sea treasure items that award 20 points upon collection.
4. WHEN Gelpiyo collides with an Item, THE ItemSystem SHALL remove the item from the screen, add the item's point value to the score, and play the item collection sound effect.
5. WHEN Gelpiyo collides with a bubble item, THE ItemSystem SHALL activate the bubble rescue effect granting Gelpiyo one opportunity to survive the next obstacle collision.
6. WHEN the bubble rescue effect is active AND Gelpiyo collides with an Obstacle, THE ItemSystem SHALL consume the bubble rescue effect instead of triggering the game over sequence.

---

### Requirement 11: パワーアップの発動と効果

**User Story:** ゲームプレイヤーとして、特別なパワーアップを取得して一時的な強さを楽しみたい。戦略的なアイテム取得判断によるゲームの深みを楽しむため。

#### Acceptance Criteria

1. WHEN Gelpiyo collides with a bubble shield power-up, THE PowerUpSystem SHALL activate an invincibility effect for 5 seconds during which obstacle collisions do not trigger game over.
2. WHEN Gelpiyo collides with a slow-motion power-up, THE PowerUpSystem SHALL reduce the ScrollEngine speed to 50% of the current speed for 5 seconds.
3. WHEN Gelpiyo collides with a magnet power-up, THE PowerUpSystem SHALL automatically attract all Items within 200 pixels to Gelpiyo for 8 seconds.
4. WHILE a power-up effect is active, THE GameScreen SHALL display a visual indicator showing the power-up type and remaining duration in seconds.
5. WHEN a power-up effect duration expires, THE PowerUpSystem SHALL restore all affected parameters to their pre-power-up values.
6. WHEN multiple power-ups are active simultaneously, THE PowerUpSystem SHALL apply each effect independently without canceling other active effects.

---

### Requirement 12: ゲームオーバー画面とリスタート

**User Story:** ゲームプレイヤーとして、ゲームオーバー後に素早くリトライできるようにしたい。テンポよく何度も挑戦してスコアを伸ばす体験を楽しむため。

#### Acceptance Criteria

1. WHEN the GameOverScreen is displayed, THE GameOverScreen SHALL show the player's final score.
2. WHEN the GameOverScreen is displayed, THE GameOverScreen SHALL show the current HighScore.
3. WHEN the final score equals the HighScore, THE GameOverScreen SHALL display a "NEW RECORD!" visual celebration effect.
4. WHEN the GameOverScreen is displayed, THE GameOverScreen SHALL show a retry prompt indicating how to restart the game.
5. WHEN the player presses the Space key on the GameOverScreen, THE Game SHALL reset all game state and transition to the GameScreen to begin a new game.
6. WHEN the player taps the screen on the GameOverScreen, THE Game SHALL reset all game state and transition to the GameScreen to begin a new game.
7. WHEN the Game resets, THE ScoreSystem SHALL reset the current score to zero and THE DifficultyManager SHALL reset all difficulty parameters to initial values.

---

### Requirement 13: サウンド

**User Story:** ゲームプレイヤーとして、深海の雰囲気に合った音楽と効果音でゲームを楽しみたい。没入感を高め、ゲームの臨場感を演出するため。

#### Acceptance Criteria

1. WHILE the GameScreen is active, THE AudioManager SHALL play ambient deep-sea BGM continuously in a loop.
2. WHEN Gelpiyo performs an upward swimming action, THE AudioManager SHALL play the swimming sound effect.
3. WHEN Gelpiyo passes through an obstacle set, THE AudioManager SHALL play the score increment sound effect.
4. WHEN Gelpiyo collects an Item, THE AudioManager SHALL play the item collection sound effect.
5. WHEN the game over sequence is triggered, THE AudioManager SHALL play the game over sound effect.
6. WHEN an AreaTheme changes, THE AudioManager SHALL crossfade from the current BGM track to the new AreaTheme BGM track over a 2-second transition period.
7. THE AudioManager SHALL provide a mute toggle control accessible from both the GameScreen and TitleScreen.

---

### Requirement 14: 画面サイズとレスポンシブ対応

**User Story:** ゲームプレイヤーとして、スマートフォンで快適にプレイしたい。スマートフォン画面に最適化された縦向きレイアウトでゲームを楽しむため。

#### Acceptance Criteria

1. THE Game's internal canvas resolution SHALL be **450×800 pixels** in portrait orientation (9:16 aspect ratio), matching the standard smartphone screen layout.
2. THE Game SHALL scale the canvas to fit the device viewport while maintaining the 9:16 aspect ratio, centering the canvas horizontally and vertically with letterboxing as needed.
3. THE Game SHALL render correctly on smartphone browsers in portrait orientation as the primary target platform.
4. WHEN viewed on a PC browser, THE Game SHALL display the canvas centered on screen at the appropriate scaled size.
5. THE Game SHALL accept touch input on touchscreen devices and keyboard input on desktop devices simultaneously.
6. WHEN the device orientation changes to landscape, THE Game SHALL display a "縦向きにしてください" prompt and pause gameplay until the device returns to portrait orientation.
7. WHEN the viewport dimensions change, THE Game SHALL resize and reposition the game canvas within 500 milliseconds.

---

### Requirement 15: ビジュアルデザインとキャラクター

**User Story:** ゲームプレイヤーとして、映画のような高品質なアニメーション風ビジュアルでゲームを楽しみたい。視覚的な魅力が高いことで感動や楽しさを感じるため。

#### Acceptance Criteria

1. THE Game SHALL render Gelpiyo with rounded soft forms, large expressive eyes, and a translucent gel texture consistent with the Gelpiyo character identity.
2. WHEN Gelpiyo is swimming upward, THE Game SHALL display an upward-swimming animation for Gelpiyo.
3. WHEN Gelpiyo is falling downward, THE Game SHALL display a downward-falling animation for Gelpiyo.
4. WHEN the game over sequence is triggered, THE Game SHALL display a collision or startled facial expression animation on Gelpiyo.
5. THE Game SHALL use a color palette and lighting style inspired by animated feature films, with warm tones and soft gradients avoiding excessively dark visuals.
6. WHILE the GameScreen is active, THE BackgroundRenderer SHALL render continuously moving bubble and light particle effects to enhance underwater atmosphere.
7. THE Game SHALL load PNG sprite assets for each CharacterType's animation states (`swim_up`, `fall_down`, `idle1` / `idle2` / `idle3`, `hit`) from the `assets/sprites/` directory using the naming convention `{character}_{state}.png` (e.g. `gelpiyo_swim_up.png`) and render them in-game instead of placeholder graphics.
8. WHEN a PNG sprite asset file is not found or fails to load, THE Game SHALL fall back to a procedurally drawn placeholder graphic so that the game remains fully playable without all sprite assets present.
9. THE TitleScreen SHALL display a full-screen background image loaded from `assets/sprites/title_background.png` when the file is present, rendered to fill the entire 450×800 canvas behind all UI elements.

---

### Requirement 16: 実績・バッジシステム（エンゲージメント向上）

**User Story:** ゲームプレイヤーとして、様々な実績を達成してバッジを集めたい。コレクション要素と目標設定によって長期的なリプレイ動機を得るため。

#### Acceptance Criteria

1. THE AchievementSystem SHALL define at least 10 achievements with distinct unlock conditions, such as reaching a target score, collecting a specified number of items, or surviving for a specified duration.
2. WHEN an achievement unlock condition is met during gameplay, THE AchievementSystem SHALL display an achievement notification overlay on the GameScreen within 1 second of the condition being met.
3. THE AchievementSystem SHALL persist all unlocked achievement states in browser local storage across game sessions.
4. WHEN the player views the TitleScreen, THE TitleScreen SHALL provide access to an achievement list screen showing unlocked and locked achievements.
5. WHEN a new achievement is unlocked, THE AudioManager SHALL play a distinct achievement unlock sound effect.

---

### Requirement 17: コンボシステム（リプレイ性向上）

**User Story:** ゲームプレイヤーとして、アイテムを連続して取得するとボーナスが積み重なってほしい。上手なプレイが報われる感覚で大人のプレイヤーも深く楽しめるため。

#### Acceptance Criteria

1. WHEN Gelpiyo collects consecutive Items without missing any item in a defined collection window, THE ScoreSystem SHALL apply a combo multiplier to the next item's point value.
2. WHEN the combo count reaches 3, THE ScoreSystem SHALL apply a 2x multiplier to the collected item's base point value.
3. WHEN the combo count reaches 5, THE ScoreSystem SHALL apply a 3x multiplier to the collected item's base point value.
4. WHEN the combo is active, THE GameScreen SHALL display the current combo count and multiplier visually near Gelpiyo.
5. WHEN Gelpiyo passes through an obstacle set without collecting an item, THE ScoreSystem SHALL reset the combo count to zero.

---

### Requirement 18: デイリーチャレンジ（長期エンゲージメント）

**User Story:** ゲームプレイヤーとして、毎日異なる特別なチャレンジに挑戦したい。毎日プレイする動機を持ち続けるため。

#### Acceptance Criteria

1. THE Game SHALL generate a daily challenge with a unique objective each calendar day, such as reaching a target score, collecting a specified item type a certain number of times, or surviving for a specified duration.
2. WHEN the player completes a daily challenge, THE ScoreSystem SHALL award a bonus score defined by the challenge difficulty.
3. THE Game SHALL persist the completion status of daily challenges in browser local storage.
4. WHEN the TitleScreen is displayed, THE TitleScreen SHALL show the current day's challenge objective and its completion status.
5. WHEN a new calendar day begins, THE Game SHALL generate a new daily challenge and reset the completion status for the previous day's challenge.

---

### Requirement 19: 子供向け演出（親しみやすさの向上）

**User Story:** 子供のゲームプレイヤーとして、可愛らしい演出でゲルぴよに愛着を持ちたい。愛着のあるキャラクターが視覚的に豊かな反応を見せることで楽しさを感じるため。

#### Acceptance Criteria

1. WHEN Gelpiyo collects an Item, THE Game SHALL display a colorful sparkle particle burst effect at the collection point.
2. WHEN Gelpiyo passes through an obstacle set successfully, THE Game SHALL display a brief celebratory expression animation on Gelpiyo.
3. WHEN Gelpiyo is idle on the TitleScreen, THE Game SHALL cycle through at least 3 different idle animations for Gelpiyo with playful expressions.
4. WHEN the score reaches a milestone of every 10 points, THE Game SHALL display a "すごい！" or equivalent positive feedback message on the GameScreen for 1.5 seconds.
5. WHEN the bubble shield power-up is active, THE Game SHALL render a visible bubble barrier around Gelpiyo with a shimmering animation.

---

### Requirement 20: ステージマイルストーン通知

**User Story:** ゲームプレイヤーとして、新しいエリアに突入したことを画面上で知りたい。エリア変化を明確に伝えることで達成感と期待感を高めるため。

#### Acceptance Criteria

1. WHEN an AreaTheme transition occurs, THE Game SHALL display an area entry notification showing the new area name on the GameScreen for 2 seconds.
2. WHEN the area entry notification is displayed, THE Game SHALL animate the notification text using a fade-in and fade-out transition.
3. WHEN an AreaTheme transition occurs, THE BackgroundRenderer SHALL apply a smooth visual transition effect of at most 1 second when switching between themes.

---

### Requirement 21: キャラクター選択画面

**User Story:** ゲームプレイヤーとして、ゲーム開始前に好みのキャラクターを選択したい。自分に合ったキャラクターで冒険することで愛着とプレイスタイルの幅を楽しむため。

#### Acceptance Criteria

1. WHEN the TitleScreen is displayed AND the player initiates character selection, THE Game SHALL transition to the CharacterSelectScreen.
2. WHEN the CharacterSelectScreen is displayed, THE CharacterSelectScreen SHALL present all four CharacterType options (Gelpiyo、Momopliyo、Palpiyo、Midoripiyo) in card or list format.
3. WHEN the CharacterSelectScreen is displayed, THE CharacterSelectScreen SHALL show each CharacterType card with the character's name, description, and a difficulty indicator (例：バランス型・俊敏・遅い など).
4. WHEN a player selects a CharacterType card on the CharacterSelectScreen, THE CharacterSelectScreen SHALL display a preview animation of the selected character.
5. WHEN a player confirms a CharacterType selection on the CharacterSelectScreen, THE Game SHALL persist the selected CharacterType to browser local storage.
6. WHEN the Game loads, THE CharacterSelectScreen SHALL retrieve the previously selected CharacterType from browser local storage and highlight it as the default selection.
7. IF no CharacterType is stored in browser local storage, THEN THE CharacterSelectScreen SHALL set Gelpiyo as the default selected CharacterType.
8. WHEN the CharacterSelectScreen is displayed, THE CharacterSelectScreen SHALL render each character card using a Disney/Pixar-inspired animation style with warm colors and soft gradients.
9. WHEN a player confirms the CharacterType selection, THE Game SHALL transition from the CharacterSelectScreen to the GameScreen using the confirmed CharacterType.

---

### Requirement 22: キャラクター別物理パラメータ

**User Story:** ゲームプレイヤーとして、選択したキャラクターによって異なる操作感を楽しみたい。キャラクターごとの個性が操作に反映されることで戦略的なキャラクター選択を楽しめるため。

#### Acceptance Criteria

1. WHEN a game session starts with CharacterType Gelpiyo selected, THE PhysicsEngine SHALL apply an upward velocity impulse of -400 px/s and a downward gravitational acceleration of 800 px/s².
2. WHEN a game session starts with CharacterType Momopliyo selected, THE PhysicsEngine SHALL apply an upward velocity impulse of -450 px/s and a downward gravitational acceleration of 850 px/s².
3. WHEN a game session starts with CharacterType Palpiyo selected, THE PhysicsEngine SHALL apply an upward velocity impulse of -500 px/s and a downward gravitational acceleration of 900 px/s².
4. WHEN a game session starts with CharacterType Midoripiyo selected, THE PhysicsEngine SHALL apply an upward velocity impulse of -320 px/s and a downward gravitational acceleration of 650 px/s².
5. WHILE a game session is active, THE PhysicsEngine SHALL apply only the physics parameters corresponding to the currently selected CharacterType and SHALL NOT mix parameters from different CharacterType values.
6. WHEN the CharacterType changes between game sessions, THE PhysicsEngine SHALL load the new CharacterType's physics parameters before the next game session begins.
7. THE PhysicsEngine SHALL apply the CharacterType-specific upward velocity impulse each time the player performs a swim action, regardless of the number of consecutive inputs.

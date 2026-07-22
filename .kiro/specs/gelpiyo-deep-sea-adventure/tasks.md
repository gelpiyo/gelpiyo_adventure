# Implementation Plan: ゲルぴよ深海大冒険

## Overview

Phaser 3 + TypeScript + Vite を使用したブラウザ実行型横スクロールワンタップアクションゲームの実装計画。プロジェクトのセットアップから始め、コアシステムを段階的に組み上げ、UI・エフェクト・高度な機能を順に統合する。

## Tasks

- [x] 1. プロジェクトのセットアップと基盤構築
  - [x] 1.1 Vite + TypeScript + Phaser 3 プロジェクトを初期化する
    - `npm create vite` で TypeScript テンプレートを作成し、`phaser`・`vitest`・`fast-check` を依存関係に追加する
    - `vite.config.ts` を設定し、`tsconfig.json` の厳格な型チェックを有効にする
    - `src/` 以下のディレクトリ構造（scenes / systems / models / utils / assets / tests）を作成する
    - _Requirements: 14.1, 14.2_

  - [x] 1.2 `src/config.ts` にゲーム全体の定数を定義する
    - 画面サイズ（800×600 基準）・物理パラメータ（重力・ジャンプインパルス・速度上限）・スクロール速度初期値・難易度調整量・エリアスコア閾値・アイテムポイント値などすべての定数を型付きで定義する
    - `CHARACTER_CONFIGS` テーブルを Req 22.1〜22.4 の値で記述する
    - `ITEM_CONFIGS` テーブルを Req 10.1〜10.3 の値で記述する
    - _Requirements: 3.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 22.1, 22.2, 22.3, 22.4_

  - [x] 1.3 `src/models/` に全データモデルの TypeScript インターフェースと型を定義する
    - `Player`, `Obstacle`, `Item`, `PowerUp`, `Achievement`, `DailyChallenge`, `GameState`, `CharacterType`, `CharacterConfig`, `CharacterPhysics`, `StorageSchema` を設計書の定義に従い実装する
    - _Requirements: 3.1, 7.1, 10.1, 11.1, 21.1, 22.1_

- [x] 2. ユーティリティと永続化レイヤーの実装
  - [x] 2.1 `src/utils/StorageManager.ts` を実装する
    - `loadHighScore() / saveHighScore()`, `loadSelectedCharacter() / saveSelectedCharacter()`, `loadAchievements() / saveAchievements()`, `loadDailyChallenge() / saveDailyChallenge()` を実装する
    - すべての読み込みで `try/catch` を使用し、失敗時はデフォルト値を返す
    - _Requirements: 9.4, 9.5, 21.5, 21.6, 16.3, 18.3_

  - [x]* 2.2 `StorageManager` のプロパティテストを書く（`tests/storage_utils.test.ts`）
    - **Property 6: ハイスコアの永続化ラウンドトリップ**
    - **Property 17: キャラクター選択の永続化ラウンドトリップ**
    - **Validates: Requirements 9.4, 9.5, 21.5, 21.6**

  - [x] 2.3 `src/utils/MathUtils.ts` を実装する
    - `clamp(value, min, max)`, `circlePenetrates(cx, cy, r, rect)`, `lerp(a, b, t)`, `seededRandom(seed)` を実装する
    - _Requirements: 3.4, 8.1, 18.1_

- [x] 3. コアシステムの実装（物理・スクロール・スコア・難易度）
  - [x] 3.1 `src/systems/PhysicsEngine.ts` を実装する
    - Euler 積分による `update(player, delta)`, `applyJump(player)`, `clampToBounds(player)`, `loadCharacterPhysics(character)` を実装する
    - `isAtTopBound()` / `isAtBottomBound()` による境界ヒット検出を実装する
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

  - [x]* 3.2 `PhysicsEngine` のプロパティテストを書く（`tests/physics.test.ts`）
    - **Property 1: 重力による下向き加速の単調性**
    - **Property 2: 物理境界クランプの不変条件**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [x]* 3.3 `PhysicsEngine` のキャラクター別物理パラメータのプロパティテストを書く（`tests/character.test.ts`）
    - **Property 16: キャラクター別物理パラメータの一致性**
    - **Validates: Requirements 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7**

  - [x] 3.4 `src/systems/ScrollEngine.ts` を実装する
    - `currentSpeed`, `setSpeed()`, `applySpeedMultiplier()`, `restoreSpeed()`, `update(delta)`, `maxSpeed` を実装する
    - _Requirements: 2.3, 4.1_

  - [x] 3.5 `src/systems/DifficultyManager.ts` を実装する
    - 10 秒ごとのスクロール速度増加、15 秒ごとのスポーン間隔短縮、20 秒ごとのギャップ縮小を実装する
    - エリアスコア閾値マッピングと `getCurrentArea()` を実装する
    - `reset()` で全パラメータを初期値に戻す
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [x]* 3.6 `DifficultyManager` のプロパティテストを書く（`tests/difficulty.test.ts`）
    - **Property 3: スクロール速度のステップ関数と上限不変条件**
    - **Validates: Requirements 4.2, 4.4, 4.5**

  - [x] 3.7 `src/systems/ScoreSystem.ts` を実装する
    - `incrementScore(points)`, `applyComboMultiplier()`, `checkAndUpdateHighScore()`, `persistHighScore()`, `initialize()`, `reset()` を実装する
    - `initialize()` で `StorageManager` からハイスコアをロードする
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x]* 3.8 `ScoreSystem` のプロパティテストを書く（`tests/scoring.test.ts`）
    - **Property 5: スコア加算の一貫性**
    - **Property 6: ハイスコアの永続化ラウンドトリップ**
    - **Property 7: ハイスコア更新条件の正確性**
    - **Property 8: アイテムポイント値の正確性**
    - **Validates: Requirements 9.1, 9.4, 9.5, 8.6, 12.1, 12.2, 10.1, 10.2, 10.3**

- [x] 4. チェックポイント — コアシステムの確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 衝突検出・アイテム・パワーアップシステムの実装
  - [x] 5.1 `src/systems/CollisionDetector.ts` を実装する
    - 円-矩形 AABB ハイブリッド衝突判定（設計書の `dx*dx + dy*dy <= r*r` アルゴリズム）を実装する
    - `checkObstacleCollision()`, `checkItemCollision()`, `checkBoundaryCollision()` を実装する
    - _Requirements: 8.1, 8.2, 8.3_

  - [x]* 5.2 `CollisionDetector` のプロパティテストを書く（`tests/collision.test.ts`）
    - **Property 4: 衝突検出の健全性（重なりは必ず検出する）**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [x] 5.3 `src/systems/ItemSystem.ts` を実装する
    - `spawnItem()`, `collectItem()`, `hasBubbleShield()`, `consumeBubbleShield()` を実装する
    - バブルシールド rescue 効果（一回保護）を `Player.hasBubbleShield` フラグで管理する
    - スポーン重み付けランダム選択（`spawnWeight` ベース）を実装する
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x]* 5.4 `ItemSystem` のプロパティテストを書く（`tests/items.test.ts`）
    - **Property 9: バブルシールドの一回性保護**
    - **Validates: Requirements 10.5, 10.6**

  - [x] 5.5 `src/systems/PowerUpSystem.ts` を実装する
    - `activate()`, `update(delta)`, `isActive()`, `deactivate()`, `getRemainingDuration()` を実装する
    - スロー効果（ScrollEngine 50% 減速）、マグネット効果（200px 引き寄せ）、バブルシールド（無敵5秒）を実装する
    - 期限切れ時にすべてのパラメータを元の値に戻す
    - _Requirements: 11.1, 11.2, 11.3, 11.5, 11.6_

  - [x]* 5.6 `PowerUpSystem` のプロパティテストを書く（`tests/powerup.test.ts`）
    - **Property 10: パワーアップの期間後リストア**
    - **Property 11: 複数パワーアップの独立性**
    - **Validates: Requirements 11.2, 11.5, 11.6**

- [x] 6. コンボシステムの実装
  - [x] 6.1 `src/systems/ComboSystem.ts` を実装する
    - `onItemCollected()`, `onObstaclePassed()`, `getMultiplier()`, `reset()` を実装する
    - `getMultiplier()`: count < 3 → 1、3 ≤ count < 5 → 2、count ≥ 5 → 3
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x]* 6.2 `ComboSystem` のプロパティテストを書く（`tests/combo.test.ts`）
    - **Property 12: コンボ乗数の単調性と正確性**
    - **Validates: Requirements 17.1, 17.2, 17.3, 17.5**

- [x] 7. 障害物生成システムの実装
  - [x] 7.1 `src/systems/ObstacleGenerator.ts` を実装する
    - 5 種類の障害物（`cave_wall`, `jellyfish`, `squid`, `seaweed`, `current_zone`）のスポーンロジックを実装する
    - `nextGapY()` アルゴリズム（最大 30% 変動制限）によるギャップ位置ランダム化を実装する
    - `removeOffscreen()` でキャンバス左端外へ出た障害物を削除する
    - オーシャンカレントゾーンの `pushForce` を Gelpiyo の X 速度に加算する処理を実装する
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 8. 背景レンダリングシステムの実装
  - [x] 8.1 `src/systems/BackgroundRenderer.ts` を実装する
    - 3 レイヤーのパララックススクロール（far: 0.2、mid: 0.5、near: 0.8）を `TileSprite` で実装する
    - バブルとライトパーティクルエフェクトを `ParticleEmitter` で実装する
    - `transitionToTheme(theme, duration)` で 1 秒以内のスムーズな背景切り替えを実装する
    - _Requirements: 1.6, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 15.5, 15.6_

  - [x]* 8.2 `BackgroundRenderer` のプロパティテストを書く（`tests/background.test.ts`）
    - **Property 13: パララックス速度の相対的順序不変条件**
    - **Validates: Requirements 6.2, 6.3**

- [x] 9. チェックポイント — ゲームシステム全体の確認
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. AudioManager と ゲームリセットロジックの実装
  - [x] 10.1 `src/systems/AudioManager.ts` を実装する
    - `playBGM()`, `crossfadeBGM(toKey, duration)`, `playSFX()`, `toggleMute()`, `stopAll()` を実装する
    - Web Audio API 未対応時はサイレントフォールバック（ミュート状態で動作継続）を実装する
    - BGM クロスフェードは 2 秒で実行する（Req 13.6）
    - _Requirements: 2.4, 3.5, 5.5, 8.4, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [x] 10.2 ゲームリセット関数を `GameScene` に実装する
    - `ScoreSystem.reset()`, `DifficultyManager.reset()`, `ComboSystem.reset()`, `PowerUpSystem` の全パワーアップ解除、障害物・アイテムの全削除を一括で行う `resetGame()` を実装する
    - _Requirements: 12.5, 12.6, 12.7_

  - [x]* 10.3 ゲームリセットのプロパティテストを書く（`tests/game_reset.test.ts`）
    - **Property 14: ゲームリセットの完全初期化**
    - **Validates: Requirements 12.7**

- [x] 11. 実績システムの実装
  - [x] 11.1 `src/systems/AchievementSystem.ts` を実装する
    - 10 種類以上の実績定義（スコア到達・アイテム収集数・生存時間・コンボ数・エリア到達）を実装する
    - `check(event)`, `unlock(id)`, `persist()`, `load()`, `getAll()` を実装する
    - 実績アンロック時は 1 秒以内に通知オーバーレイを表示する
    - `StorageManager` 経由で実績状態を localStorage に永続化する
    - _Requirements: 16.1, 16.2, 16.3, 16.5_

- [x] 12. デイリーチャレンジシステムの実装
  - [x] 12.1 `src/systems/DailyChallengeSystem.ts` を実装する
    - `generateForToday()` を日付文字列シード疑似乱数（設計書の `seededRandom` アルゴリズム）で実装する
    - `updateProgress()`, `complete()`, `load()`, `persist()`, `isNewDay()` を実装する
    - 新しい日付になった時に前日のチャレンジ完了状態をリセットする
    - _Requirements: 18.1, 18.2, 18.3, 18.5_

  - [x]* 12.2 `DailyChallengeSystem` のプロパティテストを書く（`tests/daily_challenge.test.ts`）
    - **Property 15: デイリーチャレンジ生成の決定論的確定性**
    - **Validates: Requirements 18.1**

- [x] 13. Phaser シーンの実装
  - [x] 13.1 `src/scenes/TitleScene.ts` を実装する
    - ゲームタイトル・Gelpiyo アイドルアニメーション・ハイスコア表示・START プロンプト・深海パーティクル背景を実装する
    - Space キー / タップで `GameScene` へ遷移する処理を実装する
    - キャラクター選択ボタンで `CharacterSelectScene` へ遷移する処理を実装する
    - 実績ボタンで `AchievementScene` へ遷移する処理を実装する
    - ミュートトグルボタンを実装する
    - デイリーチャレンジの表示（目標と完了状態）を実装する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 13.7, 16.4, 18.4, 19.3, 21.1_

  - [x] 13.2 `src/scenes/CharacterSelectScene.ts` を実装する
    - 4 種のキャラクターカード（名前・説明・難易度ラベル・Disney/Pixar 風スタイル）を横並びに表示する
    - カード選択時のプレビューアニメーション更新を実装する
    - `StorageManager` からの選択状態の読み込み・保存を実装する
    - 確定ボタンで `GameScene` へ遷移、戻るボタンで `TitleScene` へ遷移する
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9_

  - [x] 13.3 `src/scenes/GameScene.ts` を実装する
    - すべてのゲームシステム（PhysicsEngine, ScrollEngine, ObstacleGenerator, ItemSystem, PowerUpSystem, CollisionDetector, ScoreSystem, DifficultyManager, BackgroundRenderer, AudioManager, AchievementSystem, ComboSystem, DailyChallengeSystem）を初期化・接続する
    - Space キー / タップ入力で `PhysicsEngine.applyJump()` を呼び出す
    - スコアをゲーム画面右上に常時表示する（Req 9.2）
    - パワーアップアクティブ中の残り秒数インジケーターを表示する（Req 11.4）
    - コンボカウントと乗数を Gelpiyo 付近に表示する（Req 17.4）
    - 10 点ごとの「すごい！」マイルストーン通知を 1.5 秒表示する（Req 19.4）
    - エリア遷移時の通知テキスト（2 秒、フェードイン/アウト）を実装する（Req 20.1, 20.2）
    - バブルシールド表示エフェクトを Gelpiyo の周囲に描画する（Req 19.5）
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.2, 9.3, 11.4, 13.1, 13.2, 13.3, 13.4, 13.7, 15.1, 15.2, 15.3, 15.4, 15.6, 17.4, 19.1, 19.2, 19.4, 19.5, 20.1, 20.2, 20.3_

  - [x] 13.4 `src/scenes/GameOverScene.ts` を実装する
    - 最終スコア・ハイスコア・NEW RECORD! 表示・リトライプロンプトを実装する
    - Space キー / タップでゲームをリセットして `GameScene` へ遷移する
    - タイトルボタンで `TitleScene` へ遷移する
    - _Requirements: 8.5, 8.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 13.5 `src/scenes/AchievementScene.ts` を実装する
    - 全実績（アンロック済み・未アンロック）の一覧表示を実装する
    - 戻るボタンで `TitleScene` へ遷移する
    - _Requirements: 16.4_

- [x] 14. レスポンシブ対応とビジュアル仕上げ
  - [x] 14.1 レスポンシブキャンバスリサイズを実装する
    - `src/main.ts` の Phaser 設定で `Scale.FIT` モードを設定し、アスペクト比を維持したままビューポートにフィットするよう設定する
    - `orientationchange` / `resize` イベントハンドラーを 500ms 以内のリサイズで実装する
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 14.2 Gelpiyo スプライトのアニメーション状態を実装する
    - `swim_up`（上泳ぎ）・`fall_down`（落下）・`idle`（待機、3 種ループ）・`hit`（衝突）の各アニメーション状態を定義し、`Player.animationState` に応じて切り替える
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 19.2, 19.3_

  - [x] 14.3 `src/utils/ParticleFactory.ts` を実装する
    - アイテム収集時のカラースパークルバーストパーティクルを生成するヘルパーを実装する
    - _Requirements: 19.1_

- [x] 15. チェックポイント — 最終統合テスト
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- タスクに `*` が付いているサブタスクは任意（プロパティベーステスト）であり、スキップして MVP を先行実装することも可能
- 各タスクは前のタスクに依存して積み上がる構造になっており、途中からでも動作確認できる
- プロパティテストは `vitest --run` で一括実行できる
- Phaser 3 の Scene ライフサイクル（`preload` → `create` → `update`）に従い、各シーンを実装する
- アセット（スプライト・オーディオ）はプレースホルダー（Phaser の `graphics.fillRect` / `this.sound.add`）から始め、本番アセットへ差し替え可能な構造にする
- localStorage の読み書きは必ず `StorageManager` を経由し、直接 `localStorage.*` を呼ばない

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.3"] },
    { "id": 2, "tasks": ["2.2", "3.1", "3.4", "3.5", "3.7"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.6", "3.8", "6.1", "7.1"] },
    { "id": 4, "tasks": ["5.1", "6.2", "8.1", "10.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "8.2", "10.2", "11.1"] },
    { "id": 6, "tasks": ["5.4", "5.5", "10.3", "12.1"] },
    { "id": 7, "tasks": ["5.6", "12.2"] },
    { "id": 8, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5"] },
    { "id": 9, "tasks": ["14.1", "14.2", "14.3"] }
  ]
}
```

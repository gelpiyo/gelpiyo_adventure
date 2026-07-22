/**
 * StorageManager のユニットテスト + プロパティベーステスト
 *
 * Requirements: 9.4, 9.5, 21.5, 21.6, 16.3, 18.3
 *
 * Property 6: ハイスコアの永続化ラウンドトリップ
 *   Validates: Requirements 9.4, 9.5, 1.4, 1.7
 *
 * Property 17: キャラクター選択の永続化ラウンドトリップ
 *   Validates: Requirements 21.5, 21.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { StorageManager } from '../utils/StorageManager';
import type { CharacterType } from '../config';

// ---------------------------------------------------------------------------
// localStorage モック（Node 環境では globalThis に存在しないため）
// ---------------------------------------------------------------------------

function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string): void {
      store[key] = value;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    clear(): void {
      store = {};
    },
  };
}

// グローバル localStorage を差し替え
const mockStorage = createLocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

// 各テスト前にストレージをリセット
beforeEach(() => {
  mockStorage.clear();
});

// ---------------------------------------------------------------------------
// ハイスコア
// ---------------------------------------------------------------------------

describe('StorageManager.loadHighScore', () => {
  it('ストレージが空の場合は 0 を返す', () => {
    expect(StorageManager.loadHighScore()).toBe(0);
  });

  it('保存した値を正しく読み込む', () => {
    StorageManager.saveHighScore(42);
    expect(StorageManager.loadHighScore()).toBe(42);
  });

  it('不正な文字列が保存されている場合は 0 を返す', () => {
    mockStorage.setItem('gelpiyo_highScore', 'notanumber');
    expect(StorageManager.loadHighScore()).toBe(0);
  });

  it('負の値が保存されている場合は 0 を返す', () => {
    mockStorage.setItem('gelpiyo_highScore', '-10');
    expect(StorageManager.loadHighScore()).toBe(0);
  });
});

describe('StorageManager.saveHighScore', () => {
  it('書き込みが失敗してもエラーをスローしない', () => {
    const originalSetItem = mockStorage.setItem.bind(mockStorage);
    vi.spyOn(mockStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => StorageManager.saveHighScore(99)).not.toThrow();
    // スパイをリストア
    vi.spyOn(mockStorage, 'setItem').mockImplementation(originalSetItem);
  });
});

// ---------------------------------------------------------------------------
// 選択キャラクター
// ---------------------------------------------------------------------------

describe('StorageManager.loadSelectedCharacter', () => {
  it('ストレージが空の場合は gelpiyo を返す', () => {
    expect(StorageManager.loadSelectedCharacter()).toBe('gelpiyo');
  });

  it('保存した gelpiyo を正しく読み込む', () => {
    StorageManager.saveSelectedCharacter('gelpiyo');
    expect(StorageManager.loadSelectedCharacter()).toBe('gelpiyo');
  });

  it('保存した momopliyo を正しく読み込む', () => {
    StorageManager.saveSelectedCharacter('momopliyo');
    expect(StorageManager.loadSelectedCharacter()).toBe('momopliyo');
  });

  it('保存した palpiyo を正しく読み込む', () => {
    StorageManager.saveSelectedCharacter('palpiyo');
    expect(StorageManager.loadSelectedCharacter()).toBe('palpiyo');
  });

  it('保存した midoripiyo を正しく読み込む', () => {
    StorageManager.saveSelectedCharacter('midoripiyo');
    expect(StorageManager.loadSelectedCharacter()).toBe('midoripiyo');
  });

  it('不正な文字列が保存されている場合は gelpiyo を返す', () => {
    mockStorage.setItem('gelpiyo_selectedCharacter', 'unknownchar');
    expect(StorageManager.loadSelectedCharacter()).toBe('gelpiyo');
  });
});

// ---------------------------------------------------------------------------
// 実績
// ---------------------------------------------------------------------------

describe('StorageManager.loadAchievements', () => {
  it('ストレージが空の場合は空オブジェクトを返す', () => {
    expect(StorageManager.loadAchievements()).toEqual({});
  });

  it('保存したデータを正しく読み込む', () => {
    const data = {
      first_score: { unlocked: true, unlockedAt: 1700000000000 },
      first_item: { unlocked: false },
    };
    StorageManager.saveAchievements(data);
    expect(StorageManager.loadAchievements()).toEqual(data);
  });

  it('不正な JSON が保存されている場合は空オブジェクトを返す', () => {
    mockStorage.setItem('gelpiyo_achievements', 'invalid{json');
    expect(StorageManager.loadAchievements()).toEqual({});
  });

  it('配列が保存されている場合は空オブジェクトを返す', () => {
    mockStorage.setItem('gelpiyo_achievements', '[]');
    expect(StorageManager.loadAchievements()).toEqual({});
  });
});

describe('StorageManager.saveAchievements', () => {
  it('書き込みが失敗してもエラーをスローしない', () => {
    vi.spyOn(mockStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() =>
      StorageManager.saveAchievements({ first_score: { unlocked: true } })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// デイリーチャレンジ
// ---------------------------------------------------------------------------

describe('StorageManager.loadDailyChallenge', () => {
  it('ストレージが空の場合は今日の日付で未完了のダミーを返す', () => {
    const challenge = StorageManager.loadDailyChallenge();
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(challenge.date).toBe(expected);
    expect(challenge.completed).toBe(false);
    expect(challenge.progress).toBe(0);
  });

  it('保存したデータを正しく読み込む', () => {
    const data = {
      date: '2024-06-15',
      type: 'score' as const,
      objective: 30,
      bonusScore: 100,
      completed: true,
      progress: 30,
    };
    StorageManager.saveDailyChallenge(data);
    expect(StorageManager.loadDailyChallenge()).toEqual(data);
  });

  it('不正な JSON が保存されている場合はデフォルト値を返す', () => {
    mockStorage.setItem('gelpiyo_dailyChallenge', 'bad-json{{');
    const challenge = StorageManager.loadDailyChallenge();
    expect(challenge.completed).toBe(false);
  });

  it('必須フィールドが欠けている場合はデフォルト値を返す', () => {
    mockStorage.setItem('gelpiyo_dailyChallenge', JSON.stringify({ date: '2024-01-01' }));
    const challenge = StorageManager.loadDailyChallenge();
    expect(challenge.completed).toBe(false);
  });

  it('type が不正な値の場合はデフォルト値を返す', () => {
    mockStorage.setItem(
      'gelpiyo_dailyChallenge',
      JSON.stringify({
        date: '2024-01-01',
        type: 'invalid',
        objective: 10,
        bonusScore: 50,
        completed: false,
        progress: 0,
      })
    );
    const challenge = StorageManager.loadDailyChallenge();
    expect(challenge.completed).toBe(false);
  });
});

describe('StorageManager.saveDailyChallenge', () => {
  it('書き込みが失敗してもエラーをスローしない', () => {
    vi.spyOn(mockStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() =>
      StorageManager.saveDailyChallenge({
        date: '2024-01-01',
        type: 'score',
        objective: 10,
        bonusScore: 50,
        completed: false,
        progress: 0,
      })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Property 6: ハイスコアの永続化ラウンドトリップ
// Validates: Requirements 9.4, 9.5, 1.4, 1.7
// ---------------------------------------------------------------------------

// Feature: gelpiyo-deep-sea-adventure, Property 6: ハイスコアの永続化ラウンドトリップ
describe('Property 6: ハイスコアの永続化ラウンドトリップ', () => {
  it('任意の非負整数のハイスコアを保存後に読み込むと同じ値が返る', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1_000_000 }), (score) => {
        mockStorage.clear();
        StorageManager.saveHighScore(score);
        const loaded = StorageManager.loadHighScore();
        return loaded === score;
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: キャラクター選択の永続化ラウンドトリップ
// Validates: Requirements 21.5, 21.6
// ---------------------------------------------------------------------------

// Feature: gelpiyo-deep-sea-adventure, Property 17: キャラクター選択の永続化ラウンドトリップ
describe('Property 17: キャラクター選択の永続化ラウンドトリップ', () => {
  it('任意の有効な CharacterType を保存後に読み込むと同じ値が返る', () => {
    const characterArb = fc.constantFrom<CharacterType>(
      'gelpiyo',
      'momopliyo',
      'palpiyo',
      'midoripiyo'
    );

    fc.assert(
      fc.property(characterArb, (character) => {
        mockStorage.clear();
        StorageManager.saveSelectedCharacter(character);
        const loaded = StorageManager.loadSelectedCharacter();
        return loaded === character;
      })
    );
  });
});

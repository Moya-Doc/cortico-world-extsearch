import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/search.ts';

describe('tokenize', () => {
  it('中文取相邻两字,英文按词,大小写与全角统一', () => {
    expect(tokenize('语音合成 TTS')).toEqual(['语音', '音合', '合成', 'tts']);
    expect(tokenize('ＱＱ机器人')).toEqual(['qq', '机器', '器人']);
  });

  it('标点当分隔,单个英文字母丢掉,单个汉字保留', () => {
    expect(tokenize('游戏，a/b 棋')).toEqual(['游戏', '棋']);
    expect(tokenize('')).toEqual([]);
  });
});

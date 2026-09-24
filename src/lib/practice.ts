import type { Phrase, PhraseStatus } from '../data/phrases';

/** 一次晨读打卡记录：同一句子同一天只保留一条 */
export interface PracticeRecord {
  phraseId: number;
  date: string;        // 当天日期，YYYY-MM-DD
  duration: number;    // 当天累计录音时长（秒）
  status: PhraseStatus; // 本次练习后的句子状态
  updatedAt: string;   // 最近一次更新时间（ISO）
}

export const STORAGE_KEYS = {
  phrases: 'sound-lab-phrases',
  records: 'sound-lab-records',
  filter: 'sound-lab-filter',
  query: 'sound-lab-query',
} as const;

/** 本地日期键，用于判断“同一天” */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 记录一次练习：同一天同一句只更新时长（累加）与更新时间，
 * 否则新增一条当天记录。
 */
export function upsertRecord(
  records: PracticeRecord[],
  phraseId: number,
  duration: number,
  status: PhraseStatus,
  now: Date = new Date(),
): PracticeRecord[] {
  const date = dateKey(now);
  const updatedAt = now.toISOString();
  const idx = records.findIndex(r => r.phraseId === phraseId && r.date === date);
  if (idx >= 0) {
    const next = records.slice();
    next[idx] = { ...records[idx], duration: records[idx].duration + duration, status, updatedAt };
    return next;
  }
  return [...records, { phraseId, date, duration, status, updatedAt }];
}

/** 录音完成后的句子：次数 +1；已掌握的句子重新练习后回到“练习中” */
export function applyPractice(phrase: Phrase): Phrase {
  return { ...phrase, attempts: phrase.attempts + 1, status: 'practice', last: '刚刚' };
}

export function statusLabel(s: PhraseStatus): string {
  return s === 'mastered' ? '已掌握' : s === 'practice' ? '练习中' : '未开始';
}

export function formatDuration(totalSeconds: number): string {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 存储不可用时静默失败，不影响页面使用 */
  }
}

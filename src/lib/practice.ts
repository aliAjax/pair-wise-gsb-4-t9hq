// 记录判断：练习记录的生成、合并、状态流转与本地持久化
import type { Phrase, PhraseStatus } from '../data/phrases';

export interface PracticeRecord {
  phraseId: number;
  date: string;      // 本地日期 YYYY-MM-DD
  seconds: number;   // 当天累计练习时长（秒）
  status: PhraseStatus;
  updatedAt: number; // 最近一次更新的时间戳
}

export const STORAGE_KEYS = {
  phrases: 'sound-lab-phrases',
  records: 'sound-lab-records',
  filter: 'sound-lab-filter',
  query: 'sound-lab-query',
} as const;

export const dateKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const formatClock = (t: number) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const formatDuration = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// 状态流转：只要开口练过就回到「练习中」，已掌握的句子重新练习也不例外
export const statusAfterPractice = (): PhraseStatus => 'practice';

// 记录判断：同一天同一句只更新累计时长与更新时间，否则新增一条当天记录
export function upsertRecord(records: PracticeRecord[], phraseId: number, seconds: number, now: Date = new Date()): PracticeRecord[] {
  const today = dateKey(now);
  const status = statusAfterPractice();
  const index = records.findIndex(r => r.phraseId === phraseId && r.date === today);
  if (index === -1) {
    return [...records, { phraseId, date: today, seconds, status, updatedAt: now.getTime() }];
  }
  return records.map((r, i) => i === index
    ? { ...r, seconds: r.seconds + seconds, status, updatedAt: now.getTime() }
    : r);
}

// 同步句子档案：练习次数 +1、状态回到练习中、记下最后练习时间
export function applyPractice(phrases: Phrase[], phraseId: number, now: Date = new Date()): Phrase[] {
  return phrases.map(p => p.id === phraseId
    ? { ...p, attempts: p.attempts + 1, status: statusAfterPractice(), last: `今天 ${formatClock(now.getTime())}` }
    : p);
}

// 连续练习天数：今天没练则从昨天往前数
export function computeStreak(records: PracticeRecord[], now: Date = new Date()): number {
  const days = new Set(records.map(r => r.date));
  const cursor = new Date(now);
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
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
    // 存储不可用时静默失败，不影响页面使用
  }
}

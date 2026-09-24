// 练习资料：句子库的类型与初始数据
export type PhraseStatus = 'new' | 'practice' | 'mastered';
export type PhraseLevel = '入门' | '进阶' | '挑战';

export interface Phrase {
  id: number;
  text: string;
  translation: string;
  tag: string;
  level: PhraseLevel;
  status: PhraseStatus;
  attempts: number;
  last?: string;
}

export const statusLabel: Record<PhraseStatus, string> = {
  new: '未开始',
  practice: '练习中',
  mastered: '已掌握',
};

export const seedPhrases: Phrase[] = [
  { id: 1, text: 'The morning light feels different today.', translation: '今天的晨光感觉不一样。', tag: '日常', level: '入门', status: 'practice', attempts: 3, last: '今天 09:24' },
  { id: 2, text: 'Could you walk me through the next step?', translation: '你能带我了解下一步吗？', tag: '工作', level: '进阶', status: 'new', attempts: 0 },
  { id: 3, text: 'I appreciate your patience and thoughtful feedback.', translation: '感谢你的耐心和细致反馈。', tag: '表达', level: '挑战', status: 'mastered', attempts: 8, last: '昨天 18:10' },
  { id: 4, text: 'Let’s make room for a little curiosity.', translation: '给好奇心留一点空间。', tag: '灵感', level: '入门', status: 'new', attempts: 0 },
];

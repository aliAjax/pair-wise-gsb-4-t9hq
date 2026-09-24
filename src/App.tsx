// 页面展示：数据来自 data/phrases，记录判断来自 lib/practice
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Clock3, Mic, Pause, Play, Plus, RotateCcw, Search, Trash2, Volume2 } from 'lucide-react';
import { seedPhrases, statusLabel, type Phrase } from './data/phrases';
import {
  STORAGE_KEYS, applyPractice, computeStreak, dateKey, formatClock, formatDuration,
  loadJSON, saveJSON, upsertRecord, type PracticeRecord,
} from './lib/practice';

const bars = Array.from({ length: 68 }, (_, i) => 18 + ((i * 29) % 44));

export default function App() {
  const [phrases, setPhrases] = useState<Phrase[]>(() => loadJSON(STORAGE_KEYS.phrases, seedPhrases));
  const [records, setRecords] = useState<PracticeRecord[]>(() => loadJSON(STORAGE_KEYS.records, []));
  const [filter, setFilter] = useState(() => loadJSON(STORAGE_KEYS.filter, '全部'));
  const [query, setQuery] = useState(() => loadJSON(STORAGE_KEYS.query, ''));
  const [view, setView] = useState<'practice' | 'records'>('practice');
  const [selected, setSelected] = useState(phrases[0]?.id ?? 0);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const current = phrases.find(p => p.id === selected) ?? phrases[0];
  const filtered = useMemo(() => phrases.filter(p =>
    (filter === '全部' || p.tag === filter || p.level === filter
      || (filter === '待练' && p.status !== 'mastered')
      || (filter === '已掌握' && p.status === 'mastered'))
    && p.text.toLowerCase().includes(query.toLowerCase())), [phrases, filter, query]);
  const tags = ['全部', ...Array.from(new Set(phrases.map(p => p.tag)))];

  const todayKey = dateKey();
  const todayRecords = useMemo(() => records.filter(r => r.date === todayKey), [records, todayKey]);
  const totalMinutes = Math.floor(records.reduce((sum, r) => sum + r.seconds, 0) / 60);
  const masteredCount = phrases.filter(p => p.status === 'mastered').length;
  const streak = computeStreak(records);
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  const groupedRecords = useMemo(() => {
    const byDate = new Map<string, PracticeRecord[]>();
    for (const r of records) byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
    return [...byDate.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, list]) => ({ date, list: [...list].sort((a, b) => b.updatedAt - a.updatedAt) }));
  }, [records]);

  useEffect(() => { saveJSON(STORAGE_KEYS.phrases, phrases); }, [phrases]);
  useEffect(() => { saveJSON(STORAGE_KEYS.records, records); }, [records]);
  useEffect(() => { saveJSON(STORAGE_KEYS.filter, filter); }, [filter]);
  useEffect(() => { saveJSON(STORAGE_KEYS.query, query); }, [query]);
  useEffect(() => () => window.clearInterval(timer.current), []);
  // 换句时停掉录音状态，避免计时串到下一句
  useEffect(() => { window.clearInterval(timer.current); setRecording(false); setRecorded(false); setSeconds(0); }, [selected]);

  const startRecord = () => {
    if (recording) {
      window.clearInterval(timer.current);
      setRecording(false);
      setRecorded(true);
      const now = new Date();
      setPhrases(ps => applyPractice(ps, selected, now));
      setRecords(rs => upsertRecord(rs, selected, seconds, now));
      return;
    }
    setSeconds(0);
    setRecording(true);
    timer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };
  const markMastered = () => setPhrases(ps => ps.map(p => p.id === selected ? { ...p, status: 'mastered' } : p));
  const addPhrase = () => {
    if (!newText.trim()) return;
    const id = Date.now();
    setPhrases(ps => [...ps, { id, text: newText.trim(), translation: '待补充译文', tag: '自定义', level: '入门', status: 'new', attempts: 0 }]);
    setSelected(id);
    setNewText('');
    setShowAdd(false);
  };
  const removePhrase = () => {
    if (!current) return;
    setPhrases(ps => ps.filter(p => p.id !== current.id));
    setSelected(filtered.find(p => p.id !== current.id)?.id ?? phrases.find(p => p.id !== current.id)?.id ?? 0);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Volume2 size={19}/></div><div><strong>声线练习室</strong><span>Pronounce / practice</span></div></div>
      <div className="side-label">我的练习</div>
      <nav>
        <button className={view === 'practice' ? 'side-link active' : 'side-link'} onClick={() => setView('practice')}><Mic size={17}/>练习库 <b>{phrases.length}</b></button>
        <button className={view === 'records' ? 'side-link active' : 'side-link'} onClick={() => setView('records')}><Clock3 size={17}/>练习记录 <b>{todayRecords.length}</b></button>
        <button className="side-link" onClick={() => { setView('practice'); setFilter('已掌握'); }}><Check size={17}/>已掌握 <b>{masteredCount}</b></button>
      </nav>
      <div className="sidebar-foot">
        <div className="streak"><span>连续练习</span><strong>{streak} <small>天</small></strong><i>{streak > 0 ? '继续保持，明天见' : '今天练一句就开始'}</i></div>
        <div className="profile"><div className="avatar">YL</div><div><strong>Yuki Lin</strong><span>普通计划</span></div><ChevronRight size={16}/></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar">
        <div><p className="eyebrow">{todayLabel}</p><h1>今天练什么？</h1></div>
        <div className="top-actions">
          <div className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索句子"/></div>
          <button className="primary" onClick={() => setShowAdd(true)}><Plus size={17}/>添加句子</button>
        </div>
      </header>
      <section className="stats">
        <div><span>今日练习</span><strong>{todayRecords.length} <em>句</em></strong><div className="progress"><i style={{ width: `${Math.min(todayRecords.length / 5, 1) * 100}%` }}/></div></div>
        <div><span>累计练习时长</span><strong>{totalMinutes} <em>分钟</em></strong><small>来自全部练习记录</small></div>
        <div><span>已掌握句子</span><strong>{masteredCount} <em>句</em></strong><small className="green">重新练习会回到练习中</small></div>
      </section>
      {view === 'records' ? (
        <section className="records">
          <div className="section-head"><div><h2>练习记录</h2><p>每次录音按天归档，同一天同一句自动合并</p></div></div>
          {groupedRecords.length === 0 && <div className="empty">还没有练习记录，选一句开始录音吧</div>}
          {groupedRecords.map(({ date, list }) => (
            <div className="record-day" key={date}>
              <h3>{date === todayKey ? `今天 · ${date}` : date}</h3>
              {list.map(r => {
                const p = phrases.find(x => x.id === r.phraseId);
                return <div className="record-row" key={`${r.phraseId}-${r.date}`}>
                  <div className="record-phrase"><strong>{p?.text ?? '（句子已删除）'}</strong>{p && <span>{p.translation}</span>}</div>
                  <span className="record-meta">时长 {formatDuration(r.seconds)}</span>
                  <span className="record-meta">更新于 {formatClock(r.updatedAt)}</span>
                  <span className={`status-badge ${r.status}`}>{statusLabel[r.status]}</span>
                </div>;
              })}
            </div>
          ))}
        </section>
      ) : (
        <div className="content-grid">
          <section className="library">
            <div className="section-head"><div><h2>句子库</h2><p>选择一句开始你的声音训练</p></div><button className="ghost" onClick={() => setFilter('待练')}>只看待练</button></div>
            <div className="filters">{tags.map(t => <button key={t} className={filter === t ? 'chip active' : 'chip'} onClick={() => setFilter(t)}>{t}</button>)}</div>
            <div className="phrase-list">
              {filtered.map(p => <button key={p.id} onClick={() => setSelected(p.id)} className={p.id === selected ? 'phrase selected' : 'phrase'}>
                <div className="phrase-icon">{p.status === 'mastered' ? <Check size={15}/> : <Mic size={15}/>}</div>
                <div className="phrase-copy">
                  <strong>{p.text}</strong><span>{p.translation}</span>
                  <div className="phrase-meta"><i>{p.tag}</i><i>{p.level}</i><i>{statusLabel[p.status]}</i>{p.attempts > 0 && <small>{p.attempts} 次练习</small>}</div>
                </div>
                <ChevronRight size={17}/>
              </button>)}
              {filtered.length === 0 && <div className="empty">没有找到匹配句子</div>}
            </div>
          </section>
          {current && <section className="practice">
            <div className="practice-head"><div><span className="label">CURRENT PHRASE</span><h2>跟着感觉读</h2></div><button className="icon-btn" onClick={removePhrase} title="删除句子"><Trash2 size={17}/></button></div>
            <div className="focus-card">
              <div className="focus-tag">{current.tag} · {current.level} · {statusLabel[current.status]}</div>
              <p className="focus-text">{current.text}</p>
              <p className="focus-translation">{current.translation}</p>
              <div className="audio-sample"><button className="round-btn" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button><div className="sample-wave">{bars.map((h, i) => <i key={i} style={{ height: `${h * (playing ? 1.15 : 0.72)}%` }}/>)}</div><span>0:08</span></div>
            </div>
            <div className="record-card">
              <div className="record-top"><div><span className="label">YOUR RECORDING</span><h3>{recorded ? '录音已保存，听听自己的声音' : '准备好后开始录音'}</h3></div><span className="record-time">{formatDuration(seconds)}</span></div>
              <div className="record-wave">{bars.slice(5, 58).map((h, i) => <i key={i} className={recording ? 'live' : ''} style={{ height: `${h * (recording ? (0.4 + ((i % 5) / 7)) : 0.4)}%` }}/>)}</div>
              <div className="record-actions">
                <button className={recording ? 'record-button recording' : 'record-button'} onClick={startRecord}><span>{recording ? <Pause size={16}/> : <Mic size={16}/>}</span>{recording ? '结束录音' : recorded ? '重新录音' : '开始录音'}</button>
                {recorded && <button className="secondary" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15}/> : <Play size={15}/>} 回放</button>}
                {current.status !== 'mastered' && <button className="secondary" onClick={markMastered}><Check size={15}/> 标记已掌握</button>}
              </div>
            </div>
            <div className="tip"><span>练习小贴士</span><p>放慢速度，先把每个音节读清楚，再自然地连起来。</p><RotateCcw size={15}/></div>
          </section>}
        </div>
      )}
    </main>
    {showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>添加练习句子</h2><button className="icon-btn" onClick={() => setShowAdd(false)}>×</button></div><label>英文句子<textarea autoFocus value={newText} onChange={e => setNewText(e.target.value)} placeholder="例如：I can make this happen."/></label><div className="modal-actions"><button className="secondary" onClick={() => setShowAdd(false)}>取消</button><button className="primary" onClick={addPhrase}>加入句子库</button></div></div></div>}
  </div>;
}

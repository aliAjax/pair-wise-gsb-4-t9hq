import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Clock3, Mic, Pause, Play, Plus, RotateCcw, Search, Trash2, Volume2 } from 'lucide-react';
import { seedPhrases, type Phrase } from './data/phrases';
import {
  STORAGE_KEYS, applyPractice, dateKey, formatDuration, formatTime,
  loadJSON, saveJSON, statusLabel, upsertRecord, type PracticeRecord,
} from './lib/practice';

const bars = Array.from({ length: 68 }, (_, i) => 18 + ((i * 29) % 44));
const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

export default function App() {
  const [phrases, setPhrases] = useState<Phrase[]>(() => { const v = loadJSON<Phrase[]>(STORAGE_KEYS.phrases, seedPhrases); return Array.isArray(v) ? v : seedPhrases; });
  const [records, setRecords] = useState<PracticeRecord[]>(() => { const v = loadJSON<PracticeRecord[]>(STORAGE_KEYS.records, []); return Array.isArray(v) ? v : []; });
  const [view, setView] = useState<'library' | 'records'>('library');
  const [selected, setSelected] = useState(() => phrases[0]?.id ?? 0);
  const [filter, setFilter] = useState(() => loadJSON<string>(STORAGE_KEYS.filter, '全部'));
  const [query, setQuery] = useState(() => loadJSON<string>(STORAGE_KEYS.query, ''));
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const timer = useRef<number | undefined>(undefined);

  const current = phrases.find(p => p.id === selected) ?? phrases[0];
  const filtered = useMemo(() => phrases.filter(p =>
    (filter === '全部' || (filter === '待练' && p.status !== 'mastered') || (filter === '已掌握' && p.status === 'mastered') || p.tag === filter || p.level === filter) &&
    p.text.toLowerCase().includes(query.toLowerCase())), [phrases, filter, query]);
  const tags = ['全部', '待练', '已掌握', ...Array.from(new Set(phrases.map(p => p.tag)))];
  const today = dateKey();
  const todayRecords = useMemo(() => records.filter(r => r.date === today), [records, today]);
  const todaySeconds = todayRecords.reduce((sum, r) => sum + r.duration, 0);
  const masteredCount = phrases.filter(p => p.status === 'mastered').length;
  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [records]);

  useEffect(() => { saveJSON(STORAGE_KEYS.phrases, phrases); }, [phrases]);
  useEffect(() => { saveJSON(STORAGE_KEYS.records, records); }, [records]);
  useEffect(() => { saveJSON(STORAGE_KEYS.filter, filter); }, [filter]);
  useEffect(() => { saveJSON(STORAGE_KEYS.query, query); }, [query]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const stopTimer = () => { window.clearInterval(timer.current); setRecording(false); };

  const startRecord = () => {
    if (recording) {
      stopTimer();
      setRecorded(true);
      const now = new Date();
      setPhrases(ps => ps.map(p => p.id === selected ? applyPractice(p) : p));
      setRecords(rs => upsertRecord(rs, selected, seconds, 'practice', now));
      return;
    }
    setSeconds(0);
    setRecording(true);
    timer.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const selectPhrase = (id: number) => { if (recording) stopTimer(); setSelected(id); setRecorded(false); };
  const toggleMastered = () => { if (!current) return; setPhrases(ps => ps.map(p => p.id === current.id ? { ...p, status: p.status === 'mastered' ? 'practice' : 'mastered' } : p)); };
  const addPhrase = () => { if (!newText.trim()) return; const id = Date.now(); setPhrases(ps => [...ps, { id, text: newText.trim(), translation: '待补充译文', tag: '自定义', level: '入门', status: 'new', attempts: 0 }]); setSelected(id); setNewText(''); setShowAdd(false); };
  const removePhrase = () => { if (!current) return; setPhrases(ps => ps.filter(p => p.id !== current.id)); setRecords(rs => rs.filter(r => r.phraseId !== current.id)); setSelected(filtered.find(p => p.id !== current.id)?.id ?? phrases.find(p => p.id !== current.id)?.id ?? 0); };
  const showMastered = () => { setView('library'); setFilter('已掌握'); };

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Volume2 size={19}/></div><div><strong>声线练习室</strong><span>Pronounce / practice</span></div></div><div className="side-label">我的练习</div><nav><button className={view === 'library' && filter !== '已掌握' ? 'side-link active' : 'side-link'} onClick={() => { setView('library'); setFilter('全部'); }}><Mic size={17}/>练习库 <b>{phrases.length}</b></button><button className={view === 'records' ? 'side-link active' : 'side-link'} onClick={() => setView('records')}><Clock3 size={17}/>练习记录 <b>{records.length}</b></button><button className={view === 'library' && filter === '已掌握' ? 'side-link active' : 'side-link'} onClick={showMastered}><Check size={17}/>已掌握 <b>{masteredCount}</b></button></nav><div className="sidebar-foot"><div className="streak"><span>今日打卡</span><strong>{todayRecords.length} <small>句</small></strong><i>↗ 累计 {formatDuration(todaySeconds)}</i></div><div className="profile"><div className="avatar">YL</div><div><strong>Yuki Lin</strong><span>普通计划</span></div><ChevronRight size={16}/></div></div></aside>
    <main className="main">
      {view === 'library' ? <>
        <header className="topbar"><div><p className="eyebrow">{todayLabel}</p><h1>今天练什么？</h1></div><div className="top-actions"><div className="search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索句子"/></div><button className="primary" onClick={() => setShowAdd(true)}><Plus size={17}/>添加句子</button></div></header>
        <section className="stats"><div><span>今日打卡</span><strong>{todayRecords.length} <em>/ {phrases.length} 句</em></strong><div className="progress"><i style={{ width: `${phrases.length ? Math.min(100, (todayRecords.length / phrases.length) * 100) : 0}%` }}/></div></div><div><span>今日练习时长</span><strong>{Math.floor(todaySeconds / 60)} <em>分钟</em></strong><small>{todaySeconds % 60 > 0 ? `零 ${todaySeconds % 60} 秒` : '录音累计'}</small></div><div><span>已掌握</span><strong>{masteredCount} <em>句</em></strong><small className="green">重新练习会回到练习中</small></div></section>
        <div className="content-grid"><section className="library"><div className="section-head"><div><h2>句子库</h2><p>选择一句开始你的声音训练</p></div><button className="ghost" onClick={() => setFilter('待练')}>只看待练</button></div><div className="filters">{tags.map(t => <button key={t} className={filter === t ? 'chip active' : 'chip'} onClick={() => setFilter(t)}>{t}</button>)}</div><div className="phrase-list">{filtered.map(p => <button key={p.id} onClick={() => selectPhrase(p.id)} className={p.id === selected ? 'phrase selected' : 'phrase'}><div className="phrase-icon">{p.status === 'mastered' ? <Check size={15}/> : <Mic size={15}/>}</div><div className="phrase-copy"><strong>{p.text}</strong><span>{p.translation}</span><div className="phrase-meta"><i>{p.tag}</i><i>{p.level}</i><i>{statusLabel(p.status)}</i>{p.attempts > 0 && <small>{p.attempts} 次练习{p.last ? ` · ${p.last}` : ''}</small>}</div></div><ChevronRight size={17}/></button>)}{filtered.length === 0 && <div className="empty">没有找到匹配句子</div>}</div></section>
          {current && <section className="practice"><div className="practice-head"><div><span className="label">CURRENT PHRASE</span><h2>跟着感觉读</h2></div><button className="icon-btn" onClick={removePhrase} title="删除句子"><Trash2 size={17}/></button></div><div className="focus-card"><div className="focus-tag">{current.tag} · {current.level} · {statusLabel(current.status)}</div><p className="focus-text">{current.text}</p><p className="focus-translation">{current.translation}</p><div className="audio-sample"><button className="round-btn" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button><div className="sample-wave">{bars.map((h, i) => <i key={i} style={{ height: `${h * (playing ? 1.15 : 0.72)}%` }}/>)}</div><span>0:08</span></div></div><div className="record-card"><div className="record-top"><div><span className="label">YOUR RECORDING</span><h3>{recorded ? '录音已保存，听听自己的声音' : '准备好后开始录音'}</h3></div><span className="record-time">{formatDuration(seconds)}</span></div><div className="record-wave">{bars.slice(5, 58).map((h, i) => <i key={i} className={recording ? 'live' : ''} style={{ height: `${h * (recording ? (0.4 + ((i % 5) / 7)) : 0.4)}%` }}/>)}</div><div className="record-actions"><button className={recording ? 'record-button recording' : 'record-button'} onClick={startRecord}><span>{recording ? <Pause size={16}/> : <Mic size={16}/>}</span>{recording ? '结束录音' : recorded ? '重新录音' : '开始录音'}</button>{recorded && <button className="secondary" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={15}/> : <Play size={15}/>} 回放</button>}<button className="secondary" onClick={toggleMastered}><Check size={15}/>{current.status === 'mastered' ? '回到练习中' : '标记已掌握'}</button></div></div><div className="tip"><span>练习小贴士</span><p>放慢速度，先把每个音节读清楚，再自然地连起来。</p><RotateCcw size={15}/></div></section>}
        </div>
      </> : <>
        <header className="topbar"><div><p className="eyebrow">PRACTICE LOG</p><h1>练习记录</h1></div><button className="primary" onClick={() => setView('library')}><Mic size={17}/>去练习</button></header>
        <section className="records-panel">
          {sortedRecords.map(r => { const phrase = phrases.find(p => p.id === r.phraseId); return <div className="log-row" key={`${r.phraseId}-${r.date}`}><div className="log-date"><strong>{r.date}</strong>{r.date === today && <em>今天</em>}</div><div className="log-copy"><strong>{phrase?.text ?? '（句子已删除）'}</strong><span>{phrase?.translation ?? ''}</span></div><span className="log-duration">{formatDuration(r.duration)}</span><span className={`log-status ${r.status}`}>{statusLabel(r.status)}</span><span className="log-updated">更新于 {formatTime(r.updatedAt)}</span></div>; })}
          {records.length === 0 && <div className="empty">还没有练习记录，选一句开始录音吧</div>}
        </section>
      </>}
    </main>{showAdd && <div className="modal-backdrop" onClick={() => setShowAdd(false)}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><h2>添加练习句子</h2><button className="icon-btn" onClick={() => setShowAdd(false)}>×</button></div><label>英文句子<textarea autoFocus value={newText} onChange={e => setNewText(e.target.value)} placeholder="例如：I can make this happen."/></label><div className="modal-actions"><button className="secondary" onClick={() => setShowAdd(false)}>取消</button><button className="primary" onClick={addPhrase}>加入句子库</button></div></div></div>}
  </div>;
}

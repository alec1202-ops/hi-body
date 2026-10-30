'use client';

import { useState, useEffect, useRef } from 'react';
import { format, subDays, addDays, startOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Play, Pause, SkipForward, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { WorkoutEntry, WorkoutType, GymSet } from '@/types';

// ─── Stretching routines ──────────────────────────────────────────────────────

interface StretchMove {
  name: string;
  description: string;
  duration: number; // seconds each side
  bilateral: boolean; // true = do both sides
}

const STRETCH_UPPER: StretchMove[] = [
  { name: '頸部側伸', description: '頭輕輕側向右肩，左手可輕壓增加伸展。感受頸部側面的拉伸。', duration: 30, bilateral: true },
  { name: '胸口擴展', description: '雙手在背後交扣，肩膀往後夾，胸口向上打開。自然呼吸。', duration: 30, bilateral: false },
  { name: '肩膀前拉', description: '右手橫過胸前，左手輕壓右肘。感受右肩後側伸展。', duration: 30, bilateral: true },
  { name: '三頭肌伸展', description: '右手舉起彎肘放到背後，左手輕壓右肘向下。感受右手臂後側。', duration: 30, bilateral: true },
  { name: '軀幹側彎', description: '站直，右手舉起過頭，身體緩慢向左側彎。感受右側肋骨到腰的拉伸。', duration: 30, bilateral: true },
];

const STRETCH_LOWER: StretchMove[] = [
  { name: '股四頭肌伸展', description: '單腳站立，右手抓住右腳踝往後拉，膝蓋朝下。感受大腿前側伸展。', duration: 30, bilateral: true },
  { name: '大腿後側伸展', description: '坐在地上，右腿伸直，上身向前傾，手伸向右腳方向。感受大腿後側。', duration: 30, bilateral: true },
  { name: '臀部梨狀肌', description: '仰躺，右腳踝放在左膝上，雙手抱起左大腿向胸部拉。感受右臀深層。', duration: 30, bilateral: true },
  { name: '小腿伸展', description: '面牆站立，右腳向後踩一步，腳跟踩地，膝蓋打直。感受小腿後側。', duration: 30, bilateral: true },
  { name: '髖屈肌弓步', description: '右腳向前踩成弓步，左膝跪地，骨盆向前推。感受左側鼠蹊部伸展。', duration: 30, bilateral: true },
];

// ─── Workout type config ──────────────────────────────────────────────────────

const WORKOUT_META: Record<WorkoutType, { label: string; emoji: string; color: string }> = {
  swim:    { label: '游泳',       emoji: '🏊', color: 'text-blue-400' },
  run:     { label: '跑步',       emoji: '🏃', color: 'text-orange-400' },
  cycling: { label: '室內自行車', emoji: '🚴', color: 'text-yellow-400' },
  gym:     { label: '健身',       emoji: '🏋️', color: 'text-purple-400' },
  stretch: { label: '拉筋',       emoji: '🧘', color: 'text-green-400' },
  rest:    { label: '休息',       emoji: '😴', color: 'text-gray-400' },
  free:    { label: '自由選',     emoji: '⭐', color: 'text-emerald-400' },
};

// ─── Stretch Guide ────────────────────────────────────────────────────────────

function StretchGuide({ onComplete }: { onComplete: (duration: number) => void }) {
  const [section, setSection] = useState<'upper' | 'lower'>('upper');
  const [idx, setIdx] = useState(0);
  const [side, setSide] = useState<'right' | 'left' | 'done'>('right');
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalDone, setTotalDone] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const moves = section === 'upper' ? STRETCH_UPPER : STRETCH_LOWER;
  const current = moves[idx];

  useEffect(() => {
    setTimeLeft(current.duration);
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [idx, side, section, current.duration]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setTotalDone((d) => d + current.duration);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function next() {
    if (current.bilateral && side === 'right') {
      setSide('left');
      return;
    }
    if (idx < moves.length - 1) {
      setIdx(idx + 1);
      setSide('right');
    } else if (section === 'upper') {
      setSection('lower');
      setIdx(0);
      setSide('right');
    } else {
      // All done
      const total = totalDone + (timeLeft < current.duration ? current.duration - timeLeft : 0);
      onComplete(Math.round(total / 60) || 20);
    }
  }

  const sideLabel = current.bilateral
    ? (side === 'right' ? '（右側）' : '（左側）')
    : '';

  const stepNum = section === 'upper'
    ? `上半身 ${idx + 1}/${STRETCH_UPPER.length}`
    : `下半身 ${idx + 1}/${STRETCH_LOWER.length}`;

  const progress = current.duration > 0 ? ((current.duration - timeLeft) / current.duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-700 rounded-xl p-1">
        {(['upper', 'lower'] as const).map((s) => (
          <button key={s} onClick={() => { setSection(s); setIdx(0); setSide('right'); }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${section === s ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
            {s === 'upper' ? '上半身' : '下半身'}
          </button>
        ))}
      </div>

      {/* Current move */}
      <div className="bg-gray-700 rounded-2xl p-5">
        <p className="text-[10px] text-gray-500 mb-1">{stepNum}</p>
        <h3 className="text-lg font-bold text-white mb-0.5">{current.name}{sideLabel}</h3>
        <p className="text-xs text-gray-300 leading-relaxed mb-4">{current.description}</p>

        {/* Timer ring */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="#374151" strokeWidth="8" />
              <circle cx="48" cy="48" r="40" fill="none" stroke="#10b981" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{timeLeft}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setRunning(!running)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white">
              {running ? <Pause size={16} /> : <Play size={16} />}
              {running ? '暫停' : (timeLeft === current.duration ? '開始' : '繼續')}
            </button>
            <button onClick={next}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-xl text-sm font-semibold text-white">
              <SkipForward size={16} />
              下一個
            </button>
          </div>
        </div>
      </div>

      {/* Move list */}
      <div className="space-y-1">
        {moves.map((m, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs
            ${i === idx ? 'bg-emerald-500/20 text-emerald-300' : i < idx ? 'text-gray-600' : 'text-gray-400'}`}>
            {i < idx ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" /> :
             i === idx ? <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex-shrink-0" /> :
             <div className="w-3.5 h-3.5 rounded-full border border-gray-600 flex-shrink-0" />}
            {m.name} {m.bilateral ? '× 兩側' : ''} {m.duration}s
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Log form ─────────────────────────────────────────────────────────────────

function LogForm({ date, onSave, onClose }: { date: string; onSave: (e: Omit<WorkoutEntry, 'id' | 'timestamp'>) => void; onClose: () => void }) {
  const [type, setType] = useState<WorkoutType>('run');
  const [freeType, setFreeType] = useState<WorkoutType>('swim');
  const [tab, setTab] = useState<'ai' | 'manual' | 'stretch'>('manual');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [swimDist, setSwimDist] = useState('');
  const [swimPool, setSwimPool] = useState<'pool' | 'open'>('pool');
  const [runDist, setRunDist] = useState('');
  const [cycleDist, setCycleDist] = useState('');
  const [gymExercises, setGymExercises] = useState<GymSet[]>([{ exercise: '', sets: 3, reps: 10, weight: undefined }]);
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveType = type === 'free' ? freeType : type;

  useEffect(() => {
    if (type === 'stretch') setTab('stretch');
    else if (tab === 'stretch') setTab('manual');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function analyzePhoto() {
    if (!photo) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/analyze-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo.base64, mimeType: photo.mimeType }),
      });
      const data = await res.json();
      if (data.result) {
        const r = data.result;
        if (r.duration) setDuration(String(r.duration));
        if (r.notes) setNotes(r.notes);
      }
    } catch { setError('AI 分析失敗，請手動輸入'); }
    finally { setLoading(false); }
  }

  function handleStretchComplete(mins: number) {
    setDuration(String(mins));
  }

  function handleSave() {
    if (type === 'rest') {
      onSave({ date, type: 'rest', duration: 0, notes, estimatedByAI: false });
      return;
    }
    const mins = parseInt(duration) || 0;
    const entry: Omit<WorkoutEntry, 'id' | 'timestamp'> = {
      date, type,
      actualType: type === 'free' ? freeType : undefined,
      duration: mins, notes,
      imageUrl: photo?.preview,
      estimatedByAI: tab === 'ai',
      swimDistance: effectiveType === 'swim' ? (parseFloat(swimDist) || undefined) : undefined,
      swimPoolType: effectiveType === 'swim' ? swimPool : undefined,
      runDistance: effectiveType === 'run' ? (parseFloat(runDist) || undefined) : undefined,
      cyclingDistance: effectiveType === 'cycling' ? (parseFloat(cycleDist) || undefined) : undefined,
      gymExercises: effectiveType === 'gym' ? gymExercises.filter((g) => g.exercise.trim()) : undefined,
    };
    onSave(entry);
  }

  const freeOptions: WorkoutType[] = ['swim', 'run', 'cycling', 'gym'];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-gray-800">
        {/* Header */}
        <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400">取消</button>
            <h2 className="text-base font-bold text-white">記錄運動</h2>
            <button onClick={handleSave}
              className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl">
              ✅ 儲存
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-4 pt-4">

          {/* Type picker */}
          <div>
            <p className="text-xs text-gray-400 mb-2">運動類型</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(WORKOUT_META) as [WorkoutType, typeof WORKOUT_META[WorkoutType]][]).map(([t, meta]) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-colors
                    ${type === t ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50 text-emerald-300' : 'bg-gray-700 text-gray-400'}`}>
                  <span className="text-xl">{meta.emoji}</span>
                  <span>{meta.label.length > 3 ? meta.label.slice(0, 3) : meta.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Free type picker */}
          {type === 'free' && (
            <div>
              <p className="text-xs text-gray-400 mb-2">今天選擇</p>
              <div className="grid grid-cols-4 gap-2">
                {freeOptions.map((t) => (
                  <button key={t} onClick={() => setFreeType(t)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs transition-colors
                      ${freeType === t ? 'bg-blue-500/20 ring-1 ring-blue-400/50 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                    <span className="text-xl">{WORKOUT_META[t].emoji}</span>
                    <span>{WORKOUT_META[t].label.slice(0, 3)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rest — simple */}
          {type === 'rest' && (
            <div className="text-center py-6">
              <span className="text-5xl">😴</span>
              <p className="text-sm text-gray-300 mt-3">今天好好休息！</p>
              <p className="text-xs text-gray-500 mt-1">按儲存記錄休息日</p>
            </div>
          )}

          {/* Stretch — guided */}
          {type === 'stretch' && (
            <StretchGuide onComplete={handleStretchComplete} />
          )}

          {/* Other types */}
          {type !== 'rest' && type !== 'stretch' && (
            <>
              {/* Input mode tabs */}
              <div className="flex gap-1 bg-gray-700 rounded-xl p-1">
                <button onClick={() => setTab('manual')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === 'manual' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
                  手動輸入
                </button>
                <button onClick={() => setTab('ai')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === 'ai' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
                  <span className="flex items-center justify-center gap-1"><Sparkles size={12} /> AI 分析</span>
                </button>
              </div>

              {/* AI photo */}
              {tab === 'ai' && (
                <div className="space-y-2">
                  <PhotoUpload
                    onPhoto={(base64, mimeType, preview) => setPhoto({ base64, mimeType, preview })}
                    preview={photo?.preview}
                    onClear={() => setPhoto(null)}
                    label="上傳運動截圖"
                  />
                  {photo && (
                    <button onClick={analyzePhoto} disabled={loading}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl text-sm font-semibold text-white">
                      {loading ? '分析中...' : '🤖 AI 分析'}
                    </button>
                  )}
                  {error && <p className="text-xs text-red-400">{error}</p>}
                </div>
              )}

              {/* Duration */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">時間（分鐘）</p>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={duration} onChange={(e) => setDuration(e.target.value)}
                  placeholder="例：45"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
              </div>

              {/* Swim fields */}
              {effectiveType === 'swim' && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">距離（公尺）</p>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={swimDist} onChange={(e) => setSwimDist(e.target.value)}
                      placeholder="例：1500"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">場地</p>
                    <div className="flex gap-2">
                      {(['pool', 'open'] as const).map((p) => (
                        <button key={p} onClick={() => setSwimPool(p)}
                          className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors
                            ${swimPool === p ? 'bg-blue-500/30 ring-1 ring-blue-400/50 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                          {p === 'pool' ? '🏊 泳池' : '🌊 開放水域'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Run fields */}
              {effectiveType === 'run' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">距離（公里）</p>
                  <input type="text" inputMode="decimal" pattern="[0-9.]*" value={runDist} onChange={(e) => setRunDist(e.target.value)}
                    placeholder="例：5.0"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
                  {runDist && duration && parseFloat(runDist) > 0 && parseInt(duration) > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      配速 {Math.floor(parseInt(duration) / parseFloat(runDist))}:{String(Math.round((parseInt(duration) / parseFloat(runDist) % 1) * 60)).padStart(2, '0')} /km
                    </p>
                  )}
                </div>
              )}

              {/* Cycling fields */}
              {effectiveType === 'cycling' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">距離（公里，選填）</p>
                  <input type="text" inputMode="decimal" pattern="[0-9.]*" value={cycleDist} onChange={(e) => setCycleDist(e.target.value)}
                    placeholder="例：30"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
                </div>
              )}

              {/* Gym fields */}
              {effectiveType === 'gym' && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">訓練動作</p>
                  <div className="space-y-2">
                    {gymExercises.map((g, i) => (
                      <div key={i} className="bg-gray-700 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input value={g.exercise} onChange={(e) => {
                            const next = [...gymExercises]; next[i] = { ...g, exercise: e.target.value };
                            setGymExercises(next);
                          }} placeholder="動作名稱（例：深蹲）"
                            className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-xs text-white focus:outline-none" />
                          <button onClick={() => setGymExercises(gymExercises.filter((_, j) => j !== i))}
                            className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '組數', key: 'sets', val: g.sets },
                            { label: '次數', key: 'reps', val: g.reps },
                            { label: '重量 kg', key: 'weight', val: g.weight },
                          ].map(({ label, key, val }) => (
                            <div key={key}>
                              <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                              <input type="number" value={val ?? ''} onChange={(e) => {
                                const next = [...gymExercises];
                                next[i] = { ...g, [key]: e.target.value ? parseFloat(e.target.value) : undefined };
                                setGymExercises(next);
                              }}
                                className="w-full px-2 py-1.5 bg-gray-600 border border-gray-500 rounded-lg text-xs text-white focus:outline-none text-center" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setGymExercises([...gymExercises, { exercise: '', sets: 3, reps: 10 }])}
                      className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
                      <Plus size={14} /> 新增動作
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">備註（選填）</p>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="感受、心得..."
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 resize-none" />
              </div>
            </>
          )}

          {/* Duration display after stretch */}
          {type === 'stretch' && duration && (
            <p className="text-xs text-emerald-400 text-center">拉筋完成 · 約 {duration} 分鐘</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Week strip ───────────────────────────────────────────────────────────────

function WeekStrip({ selectedDate, onSelect, workoutEntries }: {
  selectedDate: string;
  onSelect: (d: string) => void;
  workoutEntries: WorkoutEntry[];
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');
  const baseMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const monday = addDays(baseMonday, weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i);
    const str = format(d, 'yyyy-MM-dd');
    const entries = workoutEntries.filter((e) => e.date === str);
    return { str, d, entries };
  });

  const dayNames = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-1 text-gray-400 hover:text-white"><ChevronLeft size={16} /></button>
        <span className="text-xs text-gray-400">
          {format(monday, 'M/d')} – {format(addDays(monday, 6), 'M/d')}
        </span>
        <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ str, d, entries }, i) => {
          const isToday = str === today;
          const isSelected = str === selectedDate;
          const emojis = entries.map((e) => WORKOUT_META[e.actualType ?? e.type]?.emoji).filter(Boolean);
          return (
            <button key={str} onClick={() => onSelect(str)}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors
                ${isSelected ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50' : 'hover:bg-gray-700'}`}>
              <span className={`text-[10px] ${isToday ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                {dayNames[i]}
              </span>
              <span className={`text-[10px] ${isToday ? 'text-emerald-400' : 'text-gray-600'}`}>
                {format(d, 'd')}
              </span>
              {emojis.length === 0 ? (
                <span className="text-base leading-none">·</span>
              ) : emojis.length === 1 ? (
                <span className="text-base leading-none">{emojis[0]}</span>
              ) : (
                <span className="text-[9px] leading-tight text-center">
                  {emojis.join('')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const { workoutEntries, addWorkoutEntry, deleteWorkoutEntry } = useAppStore();

  const dayEntries = workoutEntries.filter((e) => e.date === date);
  const dateLabel = (() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (date === today) return '今天';
    if (date === yesterday) return '昨天';
    return format(new Date(date + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW });
  })();

  function handleSave(entry: Omit<WorkoutEntry, 'id' | 'timestamp'>) {
    addWorkoutEntry({ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
    setShowForm(false);
  }

  return (
    <div className="page-container px-4 pt-5 pb-24">

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">運動記錄</h1>
          <p className="text-sm text-gray-400">{dateLabel}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white">
          <Plus size={16} /> 記錄
        </button>
      </div>

      {/* Week strip */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <WeekStrip selectedDate={date} onSelect={setDate} workoutEntries={workoutEntries} />
      </div>

      {/* Day entries */}
      {dayEntries.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-2">🤸</p>
          <p className="text-gray-400 text-sm">這天沒有運動記錄</p>
          <button onClick={() => setShowForm(true)}
            className="mt-3 px-4 py-2 bg-emerald-500 rounded-xl text-sm font-semibold text-white">
            新增記錄
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEntries.map((entry) => {
            const wType = entry.actualType ?? entry.type;
            const meta = WORKOUT_META[wType];
            const details: string[] = [];
            if (entry.duration > 0) details.push(`${entry.duration} 分鐘`);
            if (entry.swimDistance) details.push(`${entry.swimDistance}m ${entry.swimPoolType === 'open' ? '開放水域' : '泳池'}`);
            if (entry.runDistance) details.push(`${entry.runDistance}km`);
            if (entry.cyclingDistance) details.push(`${entry.cyclingDistance}km`);
            if (entry.gymExercises?.length) details.push(`${entry.gymExercises.length} 個動作`);

            return (
              <div key={entry.id} className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{meta?.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {meta?.label}
                        {entry.type === 'free' && <span className="text-xs text-gray-400 ml-1">（自由日）</span>}
                      </p>
                      {details.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{details.join(' · ')}</p>
                      )}
                      {entry.notes && <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>}
                    </div>
                  </div>
                  <button onClick={() => deleteWorkoutEntry(entry.id)} className="text-gray-600 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Gym exercises */}
                {entry.gymExercises && entry.gymExercises.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
                    {entry.gymExercises.map((g, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-400">
                        <span>{g.exercise}</span>
                        <span>
                          {g.sets}組{g.reps ? ` × ${g.reps}次` : ''}
                          {g.weight ? ` · ${g.weight}kg` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <LogForm date={date} onSave={handleSave} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

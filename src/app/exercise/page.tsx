'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Sparkles, Timer, Flame, Dumbbell } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { ExerciseEntry } from '@/types';

const EXERCISE_TYPES = [
  { value: 'cardio', label: '有氧', emoji: '🏃', color: 'orange' as const },
  { value: 'strength', label: '重訓', emoji: '🏋️', color: 'purple' as const },
  { value: 'flexibility', label: '柔韌', emoji: '🧘', color: 'green' as const },
  { value: 'sports', label: '運動', emoji: '⚽', color: 'blue' as const },
  { value: 'other', label: '其他', emoji: '🏅', color: 'gray' as const },
] as const;

type ExerciseType = typeof EXERCISE_TYPES[number]['value'];

interface AddExerciseFormProps {
  onAdd: (entry: Omit<ExerciseEntry, 'id' | 'timestamp'>) => void;
  onClose: () => void;
  date: string;
  userWeight?: number;
}

function AddExerciseForm({ onAdd, onClose, date, userWeight }: AddExerciseFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ExerciseType>('cardio');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');

  async function analyze() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photo?.base64,
          mimeType: photo?.mimeType,
          exerciseName: name || undefined,
          userWeight,
        }),
      });
      const data = await res.json();
      if (data.result) {
        const r = data.result;
        setName(r.name || name);
        setType(r.type || 'other');
        setDuration(String(r.duration || ''));
        setCaloriesBurned(String(r.caloriesBurned || ''));
        setNotes(r.notes || '');
      }
    } catch {
      setError('AI 分析失敗，請手動輸入');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!name.trim()) { setError('請輸入運動名稱'); return; }
    onAdd({
      date,
      name,
      type,
      duration: parseInt(duration) || 0,
      caloriesBurned: parseInt(caloriesBurned) || 0,
      notes,
      imageUrl: photo?.preview,
      estimatedByAI: tab === 'ai',
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-4">新增運動記錄</h2>

        {/* Tab */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          <button onClick={() => setTab('ai')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === 'ai' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            <span className="flex items-center justify-center gap-1"><Sparkles size={13} /> AI 分析</span>
          </button>
          <button onClick={() => setTab('manual')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            手動輸入
          </button>
        </div>

        {tab === 'ai' && (
          <div className="space-y-3 mb-4">
            <PhotoUpload
              onPhoto={(b64, mime, preview) => setPhoto({ base64: b64, mimeType: mime, preview })}
              preview={photo?.preview}
              onClear={() => setPhoto(null)}
              label="上傳運動數據截圖（健身 APP / 器材畫面）"
            />
            <input
              type="text"
              placeholder="運動名稱（選填，或由照片識別）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
            <Button onClick={analyze} disabled={loading || (!photo && !name.trim())} className="w-full">
              {loading ? '分析中...' : photo ? '📸 AI 分析截圖' : '🔍 AI 估算消耗'}
            </Button>
          </div>
        )}

        {/* Exercise type */}
        <div className="flex gap-1 flex-wrap mb-3">
          {EXERCISE_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => setType(et.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${type === et.value ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {et.emoji} {et.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="運動名稱 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
              <Timer size={15} className="text-gray-400" />
              <input
                type="number"
                min={0}
                placeholder="時間（分鐘）"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl">
              <Flame size={15} className="text-orange-400" />
              <input
                type="number"
                min={0}
                placeholder="消耗 (kcal)"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(e.target.value)}
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
          </div>
          <textarea
            placeholder="備註（組數、距離、心率等）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} className="flex-1">新增</Button>
        </div>
      </div>
    </div>
  );
}

export default function ExercisePage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const { exerciseEntries, addExerciseEntry, deleteExerciseEntry, profile } = useAppStore();

  const dayExercise = exerciseEntries.filter((e) => e.date === date);
  const totalCalories = dayExercise.reduce((s, e) => s + e.caloriesBurned, 0);
  const totalDuration = dayExercise.reduce((s, e) => s + e.duration, 0);

  function handleAdd(entry: Omit<ExerciseEntry, 'id' | 'timestamp'>) {
    addExerciseEntry({ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  }

  const grouped = EXERCISE_TYPES.map((et) => ({
    ...et,
    entries: dayExercise.filter((e) => e.type === et.value),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="page-container px-4 pt-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">運動記錄</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:border-emerald-400"
        />
      </div>

      {/* Summary */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-500">{totalCalories}</p>
              <p className="text-xs text-gray-400">消耗熱量</p>
              <p className="text-[10px] text-gray-300">kcal</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{totalDuration}</p>
              <p className="text-xs text-gray-400">運動時間</p>
              <p className="text-[10px] text-gray-300">分鐘</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-500">{dayExercise.length}</p>
              <p className="text-xs text-gray-400">運動項目</p>
              <p className="text-[10px] text-gray-300">個</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise list */}
      {dayExercise.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Dumbbell size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-3">今天尚未記錄運動</p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> 新增運動
            </Button>
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ value, label, emoji, color, entries }) => (
          <Card key={value} className="mb-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{emoji} {label}</span>
                <span className="text-xs text-gray-400">
                  {entries.reduce((s, e) => s + e.caloriesBurned, 0)} kcal
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  {entry.imageUrl && (
                    <img src={entry.imageUrl} alt={entry.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">{entry.name}</span>
                      {entry.estimatedByAI && <Badge color="purple" className="text-[10px]">AI</Badge>}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                      {entry.duration > 0 && <span className="flex items-center gap-0.5"><Timer size={11} /> {entry.duration}分</span>}
                      {entry.caloriesBurned > 0 && <span className="text-orange-500 font-medium flex items-center gap-0.5"><Flame size={11} /> {entry.caloriesBurned} kcal</span>}
                    </div>
                    {entry.notes && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.notes}</p>}
                  </div>
                  <button onClick={() => deleteExerciseEntry(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white transition-colors"
      >
        <Plus size={24} />
      </button>

      {showForm && (
        <AddExerciseForm
          onAdd={handleAdd}
          onClose={() => setShowForm(false)}
          date={date}
          userWeight={profile?.weight}
        />
      )}
    </div>
  );
}

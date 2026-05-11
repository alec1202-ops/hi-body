'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { format, subDays, addDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, Trash2, Sparkles, Timer, Flame, Dumbbell, RefreshCw, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { ExerciseEntry, StravaTokens } from '@/types';

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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 min-h-0 p-5 pb-0" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">新增運動記錄</h2>
          <button
            onClick={handleSubmit}
            className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl"
          >
            ✅ 新增
          </button>
        </div>

        {/* Tab */}
        <div className="flex gap-1 bg-gray-700 rounded-xl p-1 mb-4">
          <button onClick={() => setTab('ai')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === 'ai' ? 'bg-gray-600 shadow-sm text-white' : 'text-gray-400'}`}>
            <span className="flex items-center justify-center gap-1"><Sparkles size={13} /> AI 分析</span>
          </button>
          <button onClick={() => setTab('manual')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === 'manual' ? 'bg-gray-600 shadow-sm text-white' : 'text-gray-400'}`}>
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
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${type === et.value ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}
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
            className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-600 rounded-xl bg-gray-700">
              <Timer size={15} className="text-gray-400" />
              <input
                type="number"
                min={0}
                placeholder="時間（分鐘）"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="flex-1 text-sm focus:outline-none border-0 p-0 bg-transparent"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-600 rounded-xl bg-gray-700">
              <Flame size={15} className="text-orange-400" />
              <input
                type="number"
                min={0}
                placeholder="消耗 (kcal)"
                value={caloriesBurned}
                onChange={(e) => setCaloriesBurned(e.target.value)}
                className="flex-1 text-sm focus:outline-none border-0 p-0 bg-transparent"
              />
            </div>
          </div>
          <textarea
            placeholder="備註（組數、距離、心率等）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none"
          />
        </div>

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        </div>

        {/* Sticky bottom buttons */}
        <div className="p-4 pt-3 border-t border-gray-700 bg-gray-800 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} className="flex-1 py-3 text-base">✅ 新增運動</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Strava Connect Banner ────────────────────────────────────────────────
function StravaBanner() {
  const { stravaTokens, setStravaTokens, addExerciseEntry, updateExerciseEntry, exerciseEntries } = useAppStore();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  async function handleSync() {
    if (!stravaTokens) return;
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: stravaTokens.accessToken,
          refreshToken: stravaTokens.refreshToken,
          expiresAt: stravaTokens.expiresAt,
          after: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setStravaTokens(null);
        setSyncMsg('授權已過期，請重新連接 Strava');
        return;
      }
      if (!res.ok) throw new Error(data.error);

      if (data.newTokens) {
        setStravaTokens({ ...stravaTokens, ...data.newTokens });
      }

      const stravaIdToEntry = new Map(
        exerciseEntries
          .map((e) => {
            const sid = e.notes?.match(/Strava ID: (\d+)/)?.[1];
            return sid ? [sid, e] : null;
          })
          .filter((x): x is [string, ExerciseEntry] => x !== null)
      );

      let added = 0;
      let updated = 0;
      for (const entry of (data.entries as Omit<ExerciseEntry, 'id'>[])) {
        const stravaId = entry.notes?.match(/Strava ID: (\d+)/)?.[1];
        const existing = stravaId ? stravaIdToEntry.get(stravaId) : undefined;

        if (existing) {
          const calsChanged = entry.caloriesBurned > 0 && entry.caloriesBurned !== existing.caloriesBurned;
          const durChanged = entry.duration !== existing.duration;
          if (calsChanged || durChanged) {
            updateExerciseEntry(existing.id, {
              caloriesBurned: entry.caloriesBurned,
              duration: entry.duration,
              notes: entry.notes,
            });
            updated++;
          }
        } else {
          addExerciseEntry({ ...entry, id: crypto.randomUUID() });
          added++;
        }
      }

      const parts = [];
      if (added > 0) parts.push(`新增 ${added} 筆`);
      if (updated > 0) parts.push(`更新 ${updated} 筆`);
      setSyncMsg(parts.length > 0 ? `✅ ${parts.join('、')}` : '已是最新，無變動');
    } catch {
      setSyncMsg('同步失敗，請稍後再試');
    } finally {
      setSyncing(false);
    }
  }

  if (!stravaTokens) {
    return (
      <Card className="mb-4 border-orange-800 bg-orange-950/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏃</span>
              <div>
                <p className="text-sm font-semibold text-gray-100">連接 Strava</p>
                <p className="text-xs text-gray-400">自動匯入跑步、騎車等運動紀錄</p>
              </div>
            </div>
            <a
              href="/api/strava/auth"
              className="px-4 py-2 bg-[#FC4C02] text-white text-xs font-bold rounded-xl whitespace-nowrap"
            >
              連接
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-[#FC4C02]/30 bg-orange-950/30">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">🟠</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-100 truncate">
                Strava · {stravaTokens.athleteName || '已連接'}
              </p>
              {syncMsg && <p className="text-[11px] text-emerald-400">{syncMsg}</p>}
            </div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#FC4C02] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
              {syncing ? '同步中' : '同步'}
            </button>
            <button
              onClick={() => { setStravaTokens(null); setSyncMsg(''); }}
              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-xl"
              title="中斷連接"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function dateLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return format(new Date(dateStr + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW });
}

function ExercisePageInner() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const { exerciseEntries, addExerciseEntry, deleteExerciseEntry, profile, setStravaTokens } = useAppStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken = searchParams.get('strava_access_token');
    const refreshToken = searchParams.get('strava_refresh_token');
    const expiresAt = searchParams.get('strava_expires_at');
    const athleteName = searchParams.get('strava_athlete_name');
    const athleteId = searchParams.get('strava_athlete_id');

    if (accessToken && refreshToken && expiresAt) {
      const tokens: StravaTokens = {
        accessToken,
        refreshToken,
        expiresAt: parseInt(expiresAt),
        athleteName: athleteName ?? '',
        athleteId: parseInt(athleteId ?? '0'),
      };
      setStravaTokens(tokens);
      router.replace('/exercise');
    }

    const stravaError = searchParams.get('strava_error');
    if (stravaError) {
      router.replace('/exercise');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div>
          <h1 className="text-xl font-bold text-white">運動記錄</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel(date)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDate(format(subDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-gray-700 rounded-xl"
          >
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <button
            onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${date === format(new Date(), 'yyyy-MM-dd') ? 'bg-orange-900/50 text-orange-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            {dateLabel(date)}
          </button>
          <button
            onClick={() => setDate(format(addDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))}
            className="p-2 hover:bg-gray-700 rounded-xl"
          >
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Strava */}
      <StravaBanner />

      {/* Summary */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-400">{totalCalories}</p>
              <p className="text-xs text-gray-400">消耗熱量</p>
              <p className="text-[10px] text-gray-500">kcal</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{totalDuration}</p>
              <p className="text-xs text-gray-400">運動時間</p>
              <p className="text-[10px] text-gray-500">分鐘</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{dayExercise.length}</p>
              <p className="text-xs text-gray-400">運動項目</p>
              <p className="text-[10px] text-gray-500">個</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise list */}
      {dayExercise.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Dumbbell size={32} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-3">今天尚未記錄運動</p>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> 新增運動
            </Button>
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ value, label, emoji, entries }) => (
          <Card key={value} className="mb-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">{emoji} {label}</span>
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
                      <span className="text-sm font-medium text-gray-100">{entry.name}</span>
                      {entry.estimatedByAI && <Badge color="purple" className="text-[10px]">AI</Badge>}
                      {entry.notes?.includes('Strava ID:') && <Badge color="orange" className="text-[10px]">Strava</Badge>}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                      {entry.duration > 0 && <span className="flex items-center gap-0.5"><Timer size={11} /> {entry.duration}分</span>}
                      {entry.caloriesBurned > 0 && <span className="text-orange-400 font-medium flex items-center gap-0.5"><Flame size={11} /> {entry.caloriesBurned} kcal</span>}
                    </div>
                    {entry.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{entry.notes}</p>}
                  </div>
                  <button onClick={() => deleteExerciseEntry(entry.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-600 hover:text-red-400 flex-shrink-0">
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

export default function ExercisePage() {
  return (
    <Suspense fallback={null}>
      <ExercisePageInner />
    </Suspense>
  );
}

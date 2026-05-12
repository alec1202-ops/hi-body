'use client';

import React, { useState } from 'react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend,
} from 'recharts';
import { Scale, Plus, Trash2, Target, ChevronDown, ChevronUp, Upload, X, Check, Loader2 } from 'lucide-react';
import { useAppStore, estimateWeightChange, linearRegressionMonthlyChange, getProteinCalorieFactor } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { WeightEntry } from '@/types';

// ─── Period config ────────────────────────────────────────────────────────────
type Period = '7' | '30' | '90' | '180' | '365';
const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '週' },
  { value: '30', label: '月' },
  { value: '90', label: '季' },
  { value: '180', label: '半年' },
  { value: '365', label: '年' },
];

// ─── Input form ───────────────────────────────────────────────────────────────
function WeightForm({ onAdd, onClose, heightCm }: {
  onAdd: (e: Omit<WeightEntry, 'id'>) => void;
  onClose: () => void;
  heightCm?: number;
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [bodyWater, setBodyWater] = useState('');
  const [notes, setNotes] = useState('');

  const bmi = weight && heightCm
    ? (parseFloat(weight) / Math.pow(heightCm / 100, 2)).toFixed(1)
    : null;

  function handleSubmit() {
    if (!weight) return;
    onAdd({
      date,
      weight: parseFloat(weight),
      bmi: bmi ? parseFloat(bmi) : undefined,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleMass: muscleMass ? parseFloat(muscleMass) : undefined,
      boneMass: boneMass ? parseFloat(boneMass) : undefined,
      bodyWater: bodyWater ? parseFloat(bodyWater) : undefined,
      notes: notes || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 min-h-0 p-5 pb-0" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">取消</button>
            <h2 className="text-base font-bold text-white">記錄體組成</h2>
            <button
              onClick={handleSubmit}
              disabled={!weight}
              className="px-4 py-1.5 bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-semibold rounded-xl"
            >
              ✅ 儲存
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">體重 (kg) *</label>
                <input type="number" min={30} max={300} step={0.05} value={weight}
                  onChange={(e) => setWeight(e.target.value)} placeholder="例如 72.5"
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  BMI {bmi ? <span className="text-emerald-400">（自動：{bmi}）</span> : '（自動計算）'}
                </label>
                <input type="number" min={10} max={50} step={0.1}
                  value={bmi ?? ''}
                  placeholder={bmi ? bmi : '需設定身高'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm bg-gray-700 text-gray-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">體脂率 (%)</label>
                <input type="number" min={3} max={60} step={0.1} value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)} placeholder="例如 18.5"
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">骨骼肌肉量 (kg)</label>
                <input type="number" min={10} max={100} step={0.1} value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)} placeholder="例如 32.0"
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">骨質量 (kg)</label>
                <input type="number" min={0.5} max={10} step={0.05} value={boneMass}
                  onChange={(e) => setBoneMass(e.target.value)} placeholder="例如 2.8"
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">身體水份 (%)</label>
                <input type="number" min={20} max={80} step={0.1} value={bodyWater}
                  onChange={(e) => setBodyWater(e.target.value)} placeholder="例如 55.0"
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <input type="text" placeholder="備註（選填）" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────
function TrendChart({
  data, dataKey, label, unit, color, targetValue, targetLabel,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  label: string;
  unit: string;
  color: string;
  targetValue?: number;
  targetLabel?: string;
}) {
  const hasData = data.some((d) => d[dataKey] != null);
  if (!hasData) return (
    <div className="h-36 flex items-center justify-center">
      <p className="text-xs text-gray-500">尚無{label}資料</p>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #4b5563', background: '#1f2937', color: '#f9fafb' }}
          formatter={(v) => [`${v} ${unit}`, label]}
        />
        {targetValue && (
          <ReferenceLine y={targetValue} stroke="#6366f1" strokeDasharray="4 4"
            label={{ value: targetLabel ?? '目標', fontSize: 9, fill: '#818cf8' }} />
        )}
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#grad-${dataKey})`} dot={{ r: 2.5, fill: color }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Garmin Import Modal ──────────────────────────────────────────────────────
interface GarminEntry {
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  bodyWater?: number;
  boneMass?: number;
}

function GarminImportModal({
  onImport,
  onClose,
}: {
  onImport: (entries: Omit<WeightEntry, 'id'>[]) => void;
  onClose: () => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Map from date → full body composition entry
  const [entryMap, setEntryMap] = useState<Record<string, GarminEntry>>({});
  const [error, setError] = useState('');
  const [lastAddedCount, setLastAddedCount] = useState(0);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function processFiles(files: File[]) {
    if (!files.length) return;
    setLoading(true);
    setError('');
    setLastAddedCount(0);
    let newCount = 0;

    for (const file of files) {
      const dataUrl: string = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = (e) => res(e.target!.result as string);
        reader.readAsDataURL(file);
      });
      setPreviews((prev) => [...prev, dataUrl]);

      try {
        const resp = await fetch('/api/extract-weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl.split(',')[1], mimeType: file.type }),
        });
        const data = await resp.json();
        if (data.entries?.length) {
          setEntryMap((prev) => {
            const next = { ...prev };
            for (const e of data.entries as ({ date: string } & GarminEntry)[]) {
              next[e.date] = {
                weight: e.weight,
                ...(e.bodyFat != null ? { bodyFat: e.bodyFat } : {}),
                ...(e.muscleMass != null ? { muscleMass: e.muscleMass } : {}),
                ...(e.bodyWater != null ? { bodyWater: e.bodyWater } : {}),
                ...(e.boneMass != null ? { boneMass: e.boneMass } : {}),
              };
            }
            return next;
          });
          newCount += data.entries.length;
        }
      } catch {
        // continue to next file
      }
    }

    if (newCount === 0) setError('未能辨識體重資料，請確認截圖包含日期和體重數值。');
    setLastAddedCount(newCount);
    setLoading(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) processFiles(files);
    e.target.value = '';
  }

  function removeEntry(date: string) {
    setEntryMap((prev) => { const next = { ...prev }; delete next[date]; return next; });
  }

  const sortedEntries = Object.entries(entryMap).sort((a, b) => a[0].localeCompare(b[0]));

  function handleConfirm() {
    onImport(sortedEntries.map(([date, e]) => ({ date, ...e })));
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* ── Fixed header (never scrolls) ── */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">取消</button>
            <h2 className="text-base font-bold text-white">匯入 Garmin 體組成</h2>
            <Button
              onClick={handleConfirm}
              disabled={sortedEntries.length === 0}
              className="text-sm px-3 py-1.5"
            >
              確認 {sortedEntries.length > 0 ? `(${sortedEntries.length})` : ''}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            支援體重、體脂、肌肉量、水份等，一次可多選
          </p>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

          {/* Upload button */}
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-gray-600 hover:border-indigo-500 hover:bg-indigo-950/20 rounded-xl flex items-center justify-center gap-2.5 text-gray-400 hover:text-indigo-300 transition-colors mb-3"
          >
            <Upload size={20} />
            <span className="text-sm font-medium">
              {previews.length === 0 ? '選擇截圖（可多選）' : '再加入截圖'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChange} />

          {/* Thumbnails */}
          {previews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
              {previews.map((src, i) => (
                <img key={i} src={src} alt={`截圖 ${i + 1}`}
                  className="h-16 w-auto rounded-lg flex-shrink-0 border border-gray-600 object-cover" />
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-indigo-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">AI 分析中…</span>
            </div>
          )}

          {!loading && lastAddedCount > 0 && (
            <p className="text-xs text-emerald-400 text-center mb-2">✓ 辨識到 {lastAddedCount} 筆資料</p>
          )}
          {error && <p className="text-sm text-red-400 text-center mb-2">{error}</p>}

          {/* Entry list */}
          {sortedEntries.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">共 {sortedEntries.length} 筆（可個別刪除）：</p>
              <div className="space-y-2">
                {sortedEntries.map(([date, e]) => (
                  <div key={date} className="bg-gray-700/60 rounded-xl px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={13} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-gray-400">{date}</span>
                        <span className="text-sm font-bold text-emerald-400">{e.weight} kg</span>
                      </div>
                      <button onClick={() => removeEntry(date)} className="text-gray-500 hover:text-red-400 p-1">
                        <X size={13} />
                      </button>
                    </div>
                    {(e.bodyFat != null || e.muscleMass != null || e.bodyWater != null || e.boneMass != null) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 ml-5 text-[11px] text-gray-400">
                        {e.bodyFat != null && <span>體脂 {e.bodyFat}%</span>}
                        {e.muscleMass != null && <span>肌肉 {e.muscleMass}kg</span>}
                        {e.bodyWater != null && <span>水份 {e.bodyWater}%</span>}
                        {e.boneMass != null && <span>骨質 {e.boneMass}kg</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { weightEntries, addWeightEntry, deleteWeightEntry, getDailySummary, profile, foodEntries, exerciseEntries } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [showGarminImport, setShowGarminImport] = useState(false);
  const [period, setPeriod] = useState<Period>('30');
  const [expandLog, setExpandLog] = useState(false);

  const days = parseInt(period);
  const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
  const sortedAll = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const sortedPeriod = sortedAll.filter((e) => e.date >= cutoff);

  const latest = sortedAll[sortedAll.length - 1];
  const earliest = sortedAll[0];
  const totalChange = latest && earliest && latest.id !== earliest.id
    ? latest.weight - earliest.weight : null;

  const chartData = sortedPeriod.map((e) => ({
    date: format(parseISO(e.date), days <= 30 ? 'M/d' : 'M月'),
    weight: e.weight,
    // Auto-calculate BMI from weight + profile height when not stored
    bmi: e.bmi ?? (profile?.height
      ? parseFloat((e.weight / Math.pow(profile.height / 100, 2)).toFixed(1))
      : undefined),
    bodyFat: e.bodyFat,
    muscleMass: e.muscleMass,
    boneMass: e.boneMass,
    bodyWater: e.bodyWater,
  }));

  const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const calorieData = last7Days.map((d) => {
    const s = getDailySummary(format(d, 'yyyy-MM-dd'));
    return {
      date: format(d, 'EEE', { locale: zhTW }),
      攝入: s.totalCaloriesIn,
      消耗: s.totalCaloriesOut,
    };
  });

  const avgNet = last7Days.reduce((s, d) => s + getDailySummary(format(d, 'yyyy-MM-dd')).netCalories, 0) / 7;

  // Prediction model: prefer linear regression, fall back to calorie model
  const regressionResult = linearRegressionMonthlyChange(sortedAll);
  const { factor: calorieFactor, highProtein, strengthDays, avgProteinG } = getProteinCalorieFactor(foodEntries, exerciseEntries, profile);
  const monthlyPrediction = regressionResult
    ? regressionResult.monthlyChange
    : estimateWeightChange(avgNet, 30) * (7700 / calorieFactor); // re-derive with factor
  // Calorie model with factor:
  const calorieMonthlyPrediction = (avgNet * 30) / calorieFactor;

  function handleAdd(entry: Omit<WeightEntry, 'id'>) {
    addWeightEntry({ ...entry, id: crypto.randomUUID() });
  }

  function handleGarminImport(entries: Omit<WeightEntry, 'id'>[]) {
    entries.forEach((e) => {
      const bmi = profile?.height
        ? parseFloat((e.weight / Math.pow(profile.height / 100, 2)).toFixed(1))
        : e.bmi;
      addWeightEntry({ ...e, id: crypto.randomUUID(), bmi });
    });
  }

  const stats = [
    { label: '體重', value: latest?.weight, unit: 'kg', color: 'text-emerald-400' },
    { label: 'BMI', value: latest?.bmi, unit: '', color: 'text-blue-400' },
    { label: '體脂率', value: latest?.bodyFat, unit: '%', color: 'text-orange-400' },
    { label: '骨骼肌肉', value: latest?.muscleMass, unit: 'kg', color: 'text-purple-400' },
    { label: '骨質量', value: latest?.boneMass, unit: 'kg', color: 'text-amber-400' },
    { label: '身體水份', value: latest?.bodyWater, unit: '%', color: 'text-sky-400' },
  ];

  return (
    <div className="page-container px-4 pt-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-white">進度追蹤</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGarminImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-700/50 text-indigo-300 text-xs font-medium rounded-xl transition-colors"
          >
            <Upload size={13} /> 匯入 Garmin
          </button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={16} /> 記錄體組成
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.value ? 'bg-gray-600 shadow-sm text-white' : 'text-gray-400'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Latest body composition stats */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">最新數據</h2>
            {latest && <p className="text-xs text-gray-500">{format(parseISO(latest.date), 'M月d日')}</p>}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="text-center py-2 bg-gray-700/50 rounded-xl">
                <p className={`text-base font-bold ${s.value != null ? s.color : 'text-gray-600'}`}>
                  {s.value != null ? `${s.value}${s.unit}` : '—'}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {totalChange !== null && (
            <div className="mt-3 flex items-center justify-between px-2">
              <span className="text-xs text-gray-400">全期體重變化</span>
              <span className={`text-sm font-bold ${totalChange < 0 ? 'text-emerald-400' : totalChange > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} kg
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly prediction */}
      <Card className="mb-4 border-purple-800 bg-gradient-to-br from-purple-950/40 to-indigo-950/40">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">下個月預測</span>
                {regressionResult ? (
                  <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-1.5 py-0.5 rounded-full">實測趨勢</span>
                ) : (
                  <span className="text-[10px] bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded-full">熱量模型</span>
                )}
              </div>
              {regressionResult ? (
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p>{regressionResult.dataPoints} 筆體重紀錄 · {regressionResult.spanDays} 天跨度</p>
                  <p>R² = {(regressionResult.r2 * 100).toFixed(0)}%
                    {regressionResult.r2 >= 0.8 ? ' 📈 高準確度' : regressionResult.r2 >= 0.5 ? ' 中等準確度' : ' 數據較分散'}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-gray-400 space-y-0.5">
                  <p>近 7 天平均淨卡 {Math.round(avgNet)} kcal/天</p>
                  {calorieFactor !== 7700 ? (
                    <p className="text-purple-400">✦ 高蛋白+重訓模式 ({calorieFactor} kcal/kg)</p>
                  ) : (
                    highProtein && strengthDays < 2 ? (
                      <p>蛋白 {Math.round(avgProteinG)}g/天 ·重訓 {strengthDays} 天</p>
                    ) : null
                  )}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className={`text-2xl font-bold ${monthlyPrediction < 0 ? 'text-emerald-400' : monthlyPrediction > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                {monthlyPrediction > 0 ? '+' : ''}{monthlyPrediction.toFixed(2)} kg
              </p>
              {latest && (
                <p className="text-xs text-gray-500">→ {(latest.weight + monthlyPrediction).toFixed(1)} kg</p>
              )}
              {regressionResult && avgNet !== 0 && (
                <p className="text-[10px] text-gray-600 mt-0.5">熱量模型: {calorieMonthlyPrediction > 0 ? '+' : ''}{calorieMonthlyPrediction.toFixed(2)} kg</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body Weight Chart */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">⚖️ 體重趨勢</h2>
            <span className="text-xs text-gray-500">{PERIODS.find(p => p.value === period)?.label}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="weight" label="體重" unit="kg"
            color="#10b981" targetValue={profile?.targetWeight} targetLabel="目標" />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">🔥 體脂率趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="bodyFat" label="體脂率" unit="%" color="#f97316" />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">💪 骨骼肌肉量趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="muscleMass" label="骨骼肌肉量" unit="kg" color="#8b5cf6" />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">💧 身體水份趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="bodyWater" label="身體水份" unit="%" color="#0ea5e9" />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">🦴 骨質量趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="boneMass" label="骨質量" unit="kg" color="#d97706" />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">📊 BMI 趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="bmi" label="BMI" unit="" color="#6366f1"
            targetValue={22} targetLabel="理想" />
        </CardContent>
      </Card>

      {/* 7-day calorie chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">🍽️ 近 7 天熱量</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calorieData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #4b5563', background: '#1f2937', color: '#f9fafb' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Bar dataKey="攝入" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="消耗" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Measurement Log */}
      <Card className="mb-4">
        <CardHeader>
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setExpandLog(!expandLog)}
          >
            <h2 className="text-sm font-semibold text-gray-200">📋 體組成紀錄</h2>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {sortedAll.length} 筆
              {expandLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>
        </CardHeader>
        {expandLog && (
          <CardContent className="pt-0">
            {sortedAll.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">尚無記錄</p>
            ) : (
              <div className="space-y-2">
                {[...sortedAll].reverse().map((entry, i, arr) => {
                  const prev = arr[i + 1];
                  const diff = prev ? entry.weight - prev.weight : null;
                  return (
                    <div key={entry.id} className="py-2.5 border-b border-gray-700 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-100">{entry.weight} kg</span>
                            {entry.bmi && <span className="text-xs text-blue-400">BMI {entry.bmi}</span>}
                            {diff !== null && (
                              <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                                {diff > 0 ? '▲' : diff < 0 ? '▼' : ''}{Math.abs(diff).toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 flex-wrap mt-0.5 text-xs text-gray-400">
                            {entry.bodyFat != null && <span>體脂 {entry.bodyFat}%</span>}
                            {entry.muscleMass != null && <span>肌肉 {entry.muscleMass}kg</span>}
                            {entry.boneMass != null && <span>骨質 {entry.boneMass}kg</span>}
                            {entry.bodyWater != null && <span>水份 {entry.bodyWater}%</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {format(parseISO(entry.date), 'yyyy年M月d日 (EEE)', { locale: zhTW })}
                            {entry.notes && ` · ${entry.notes}`}
                          </p>
                        </div>
                        <button onClick={() => deleteWeightEntry(entry.id)}
                          className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-600 hover:text-red-400 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white transition-colors"
      >
        <Plus size={24} />
      </button>

      {showForm && (
        <WeightForm
          onAdd={handleAdd}
          onClose={() => setShowForm(false)}
          heightCm={profile?.height}
        />
      )}

      {showGarminImport && (
        <GarminImportModal
          onImport={handleGarminImport}
          onClose={() => setShowGarminImport(false)}
        />
      )}
    </div>
  );
}

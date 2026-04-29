'use client';

import React, { useState } from 'react';
import { format, subDays, eachDayOfInterval, parseISO, subMonths, subQuarters, subYears, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend,
} from 'recharts';
import { Scale, Plus, Trash2, Target, Droplets, Bone, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore, estimateWeightChange } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 min-h-0 p-5 pb-0" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">記錄體組成</h2>
            <button
              onClick={handleSubmit}
              disabled={!weight}
              className="px-4 py-1.5 bg-emerald-500 disabled:bg-gray-200 text-white text-sm font-semibold rounded-xl"
            >
              ✅ 儲存
            </button>
          </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            </div>

            {/* Row 1: Weight + BMI */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">體重 (kg) *</label>
                <input type="number" min={30} max={300} step={0.05} value={weight}
                  onChange={(e) => setWeight(e.target.value)} placeholder="例如 72.5"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  BMI {bmi ? <span className="text-emerald-600">（自動：{bmi}）</span> : '（自動計算）'}
                </label>
                <input type="number" min={10} max={50} step={0.1}
                  value={bmi ?? ''}
                  placeholder={bmi ? bmi : '需設定身高'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400" />
              </div>
            </div>

            {/* Row 2: Body Fat + Muscle Mass */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">體脂率 (%)</label>
                <input type="number" min={3} max={60} step={0.1} value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)} placeholder="例如 18.5"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">骨骼肌肉量 (kg)</label>
                <input type="number" min={10} max={100} step={0.1} value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)} placeholder="例如 32.0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            {/* Row 3: Bone Mass + Body Water */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">骨質量 (kg)</label>
                <input type="number" min={0.5} max={10} step={0.05} value={boneMass}
                  onChange={(e) => setBoneMass(e.target.value)} placeholder="例如 2.8"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">身體水份 (%)</label>
                <input type="number" min={20} max={80} step={0.1} value={bodyWater}
                  onChange={(e) => setBodyWater(e.target.value)} placeholder="例如 55.0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>

            <input type="text" placeholder="備註（選填）" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
        <div className="p-4 pt-3 border-t border-gray-100 bg-white flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} disabled={!weight} className="flex-1">儲存體組成</Button>
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
      <p className="text-xs text-gray-400">尚無{label}資料</p>
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
          formatter={(v) => [`${v} ${unit}`, label]}
        />
        {targetValue && (
          <ReferenceLine y={targetValue} stroke="#6366f1" strokeDasharray="4 4"
            label={{ value: targetLabel ?? '目標', fontSize: 9, fill: '#6366f1' }} />
        )}
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
          fill={`url(#grad-${dataKey})`} dot={{ r: 2.5, fill: color }} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { weightEntries, addWeightEntry, deleteWeightEntry, getDailySummary, profile } = useAppStore();
  const [showForm, setShowForm] = useState(false);
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

  // Chart data
  const chartData = sortedPeriod.map((e) => ({
    date: format(parseISO(e.date), days <= 30 ? 'M/d' : 'M月'),
    weight: e.weight,
    bmi: e.bmi,
    bodyFat: e.bodyFat,
    muscleMass: e.muscleMass,
    boneMass: e.boneMass,
    bodyWater: e.bodyWater,
  }));

  // Calorie chart — last 7 days
  const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const calorieData = last7Days.map((d) => {
    const s = getDailySummary(format(d, 'yyyy-MM-dd'));
    return {
      date: format(d, 'EEE', { locale: zhTW }),
      攝入: s.totalCaloriesIn,
      消耗: s.totalCaloriesOut,
    };
  });

  // Monthly prediction
  const avgNet = last7Days.reduce((s, d) => s + getDailySummary(format(d, 'yyyy-MM-dd')).netCalories, 0) / 7;
  const monthlyPrediction = estimateWeightChange(avgNet, 30);

  function handleAdd(entry: Omit<WeightEntry, 'id'>) {
    addWeightEntry({ ...entry, id: crypto.randomUUID() });
  }

  // Latest stats
  const stats = [
    { label: '體重', value: latest?.weight, unit: 'kg', color: 'text-emerald-600' },
    { label: 'BMI', value: latest?.bmi, unit: '', color: 'text-blue-600' },
    { label: '體脂率', value: latest?.bodyFat, unit: '%', color: 'text-orange-500' },
    { label: '骨骼肌肉', value: latest?.muscleMass, unit: 'kg', color: 'text-purple-600' },
    { label: '骨質量', value: latest?.boneMass, unit: 'kg', color: 'text-amber-600' },
    { label: '身體水份', value: latest?.bodyWater, unit: '%', color: 'text-sky-500' },
  ];

  return (
    <div className="page-container px-4 pt-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">進度追蹤</h1>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={16} /> 記錄體組成
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Latest body composition stats */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">最新數據</h2>
            {latest && <p className="text-xs text-gray-400">{format(parseISO(latest.date), 'M月d日')}</p>}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((s) => (
              <div key={s.label} className="text-center py-2 bg-gray-50 rounded-xl">
                <p className={`text-base font-bold ${s.value != null ? s.color : 'text-gray-300'}`}>
                  {s.value != null ? `${s.value}${s.unit}` : '—'}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          {totalChange !== null && (
            <div className="mt-3 flex items-center justify-between px-2">
              <span className="text-xs text-gray-500">全期體重變化</span>
              <span className={`text-sm font-bold ${totalChange < 0 ? 'text-emerald-500' : totalChange > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} kg
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly prediction */}
      <Card className="mb-4 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">下個月預測</span>
              </div>
              <p className="text-xs text-gray-500">近 7 天平均淨卡 {Math.round(avgNet)} kcal/天</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${monthlyPrediction < 0 ? 'text-emerald-600' : monthlyPrediction > 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                {monthlyPrediction > 0 ? '+' : ''}{monthlyPrediction.toFixed(2)} kg
              </p>
              {latest && (
                <p className="text-xs text-gray-400">→ {(latest.weight + monthlyPrediction).toFixed(1)} kg</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body Weight Chart */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">⚖️ 體重趨勢</h2>
            <span className="text-xs text-gray-400">{PERIODS.find(p => p.value === period)?.label}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="weight" label="體重" unit="kg"
            color="#10b981" targetValue={profile?.targetWeight} targetLabel="目標" />
        </CardContent>
      </Card>

      {/* Body Fat Chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">🔥 體脂率趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="bodyFat" label="體脂率" unit="%" color="#f97316" />
        </CardContent>
      </Card>

      {/* Muscle Mass Chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">💪 骨骼肌肉量趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="muscleMass" label="骨骼肌肉量" unit="kg" color="#8b5cf6" />
        </CardContent>
      </Card>

      {/* Body Water Chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">💧 身體水份趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="bodyWater" label="身體水份" unit="%" color="#0ea5e9" />
        </CardContent>
      </Card>

      {/* Bone Mass Chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">🦴 骨質量趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="boneMass" label="骨質量" unit="kg" color="#d97706" />
        </CardContent>
      </Card>

      {/* BMI Chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">📊 BMI 趨勢</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <TrendChart data={chartData} dataKey="bmi" label="BMI" unit="" color="#6366f1"
            targetValue={22} targetLabel="理想" />
        </CardContent>
      </Card>

      {/* 7-day calorie chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">🍽️ 近 7 天熱量</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calorieData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
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
            <h2 className="text-sm font-semibold text-gray-700">📋 體組成紀錄</h2>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              {sortedAll.length} 筆
              {expandLog ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>
        </CardHeader>
        {expandLog && (
          <CardContent className="pt-0">
            {sortedAll.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">尚無記錄</p>
            ) : (
              <div className="space-y-2">
                {[...sortedAll].reverse().map((entry, i, arr) => {
                  const prev = arr[i + 1];
                  const diff = prev ? entry.weight - prev.weight : null;
                  return (
                    <div key={entry.id} className="py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">{entry.weight} kg</span>
                            {entry.bmi && <span className="text-xs text-blue-500">BMI {entry.bmi}</span>}
                            {diff !== null && (
                              <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-500' : diff > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                                {diff > 0 ? '▲' : diff < 0 ? '▼' : ''}{Math.abs(diff).toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-3 flex-wrap mt-0.5 text-xs text-gray-500">
                            {entry.bodyFat != null && <span>體脂 {entry.bodyFat}%</span>}
                            {entry.muscleMass != null && <span>肌肉 {entry.muscleMass}kg</span>}
                            {entry.boneMass != null && <span>骨質 {entry.boneMass}kg</span>}
                            {entry.bodyWater != null && <span>水份 {entry.bodyWater}%</span>}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(parseISO(entry.date), 'yyyy年M月d日 (EEE)', { locale: zhTW })}
                            {entry.notes && ` · ${entry.notes}`}
                          </p>
                        </div>
                        <button onClick={() => deleteWeightEntry(entry.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 flex-shrink-0">
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
    </div>
  );
}

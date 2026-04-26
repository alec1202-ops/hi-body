'use client';

import { useState } from 'react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import { Scale, Plus, Trash2, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { useAppStore, estimateWeightChange } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { WeightEntry } from '@/types';

function WeightForm({ onAdd, onClose }: { onAdd: (e: Omit<WeightEntry, 'id'>) => void; onClose: () => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    if (!weight) return;
    onAdd({ date, weight: parseFloat(weight), bodyFat: bodyFat ? parseFloat(bodyFat) : undefined, notes });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-4">記錄體重</h2>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">體重 (kg) *</label>
              <input type="number" min={30} max={300} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)}
                placeholder="例如 72.5"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">體脂率 (%) 選填</label>
              <input type="number" min={3} max={60} step={0.1} value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                placeholder="例如 18.5"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <input type="text" placeholder="備註（選填）" value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} disabled={!weight} className="flex-1">儲存</Button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { weightEntries, addWeightEntry, deleteWeightEntry, getDailySummary, profile } = useAppStore();
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<7 | 30 | 90>(30);

  const sortedWeights = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const firstWeight = sortedWeights[0];

  const totalChange = latestWeight && firstWeight && latestWeight.id !== firstWeight.id
    ? latestWeight.weight - firstWeight.weight
    : null;

  // Weight chart data
  const weightChartData = sortedWeights.slice(-chartPeriod).map((e) => ({
    date: format(parseISO(e.date), 'M/d'),
    weight: e.weight,
    bodyFat: e.bodyFat,
  }));

  // Calorie chart — last 7 days
  const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
  const calorieChartData = last7Days.map((d) => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const summary = getDailySummary(dateStr);
    return {
      date: format(d, 'EEE', { locale: zhTW }),
      in: summary.totalCaloriesIn,
      out: summary.totalCaloriesOut,
      net: summary.netCalories,
    };
  });

  // Monthly prediction
  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  const avgNet = last30.reduce((s, d) => {
    const sum = getDailySummary(format(d, 'yyyy-MM-dd'));
    return s + (sum.netCalories || 0);
  }, 0) / 30;

  const monthlyPrediction = estimateWeightChange(avgNet, 30);

  function handleAddWeight(entry: Omit<WeightEntry, 'id'>) {
    addWeightEntry({ ...entry, id: crypto.randomUUID() });
  }

  return (
    <div className="page-container px-4 pt-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">進度追蹤</h1>
        <Button size="sm" onClick={() => setShowWeightForm(true)}>
          <Plus size={16} /> 記錄體重
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-lg font-bold text-gray-800">{latestWeight?.weight ?? '—'}</p>
            <p className="text-xs text-gray-400">當前體重</p>
            <p className="text-[10px] text-gray-300">kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className={`text-lg font-bold ${(profile?.targetWeight ?? 0) > (latestWeight?.weight ?? 0) ? 'text-emerald-600' : 'text-orange-500'}`}>
              {profile?.targetWeight ?? '—'}
            </p>
            <p className="text-xs text-gray-400">目標體重</p>
            <p className="text-[10px] text-gray-300">kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            {totalChange !== null ? (
              <>
                <p className={`text-lg font-bold ${totalChange < 0 ? 'text-emerald-600' : totalChange > 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                  {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">總變化</p>
                <p className="text-[10px] text-gray-300">kg</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-gray-300">—</p>
                <p className="text-xs text-gray-400">總變化</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly prediction */}
      <Card className="mb-4 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">下個月預測體重</span>
              </div>
              <p className="text-xs text-gray-500">基於過去 30 天平均淨卡路里 ({Math.round(avgNet)} kcal/天)</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${monthlyPrediction < 0 ? 'text-emerald-600' : monthlyPrediction > 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                {monthlyPrediction > 0 ? '+' : ''}{monthlyPrediction.toFixed(2)} kg
              </p>
              <p className="text-xs text-gray-400">
                {latestWeight ? `→ ${(latestWeight.weight + monthlyPrediction).toFixed(1)} kg` : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight chart */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">體重趨勢</h2>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setChartPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${chartPeriod === p ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {p}天
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {weightChartData.length < 2 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-gray-400">需至少 2 筆體重記錄</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weightChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v) => [`${v} kg`, '體重']}
                />
                {profile?.targetWeight && (
                  <ReferenceLine y={profile.targetWeight} stroke="#6366f1" strokeDasharray="4 4" label={{ value: '目標', fontSize: 10, fill: '#6366f1' }} />
                )}
                <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} fill="url(#weightGrad)" dot={{ r: 3, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 7-day calorie chart */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">近 7 天熱量</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={calorieChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="in" name="攝入" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="out" name="消耗" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weight log */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">體重記錄</h2>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedWeights.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">尚無體重記錄</p>
          ) : (
            <div className="space-y-2">
              {[...sortedWeights].reverse().map((entry, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? entry.weight - prev.weight : null;
                return (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm text-gray-700 font-medium">{entry.weight} kg</span>
                      {entry.bodyFat && <span className="text-xs text-gray-400 ml-2">體脂 {entry.bodyFat}%</span>}
                      <p className="text-xs text-gray-400">{format(parseISO(entry.date), 'yyyy年M月d日 (EEE)', { locale: zhTW })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {diff !== null && (
                        <span className={`text-xs font-medium ${diff < 0 ? 'text-emerald-500' : diff > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                        </span>
                      )}
                      <button onClick={() => deleteWeightEntry(entry.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showWeightForm && (
        <WeightForm onAdd={handleAddWeight} onClose={() => setShowWeightForm(false)} />
      )}
    </div>
  );
}

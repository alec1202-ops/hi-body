'use client';

import React, { useState } from 'react';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend,
  LineChart, Line,
} from 'recharts';
import { Scale, Plus, Trash2, Target, ChevronDown, ChevronUp, Upload, X, Check, Loader2, Moon, UtensilsCrossed } from 'lucide-react';
import { useAppStore, estimateWeightChange, linearRegressionMonthlyChange, getProteinCalorieFactor, build12MonthProjection } from '@/lib/store';
import { ComposedChart, Scatter } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { WeightEntry, WaistEntry } from '@/types';

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
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-gray-800">
        {/* Header */}
        <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-gray-700/50 bg-gray-800">
          <div className="flex items-center justify-between">
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
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">

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

  // Convert any image (including HEIC) to JPEG base64 via canvas
  async function fileToJpegBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif'
      || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    if (isHeic) {
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not available')); return; }
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(objectUrl);
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error('Conversion failed')); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target!.result as string;
              resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', previewUrl: dataUrl });
            };
            reader.readAsDataURL(blob);
          }, 'image/jpeg', 0.92);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('HEIC decode failed')); };
        img.src = objectUrl;
      });
    }

    // Standard formats
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target!.result as string;
        resolve({ base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg', previewUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    });
  }

  async function processFiles(files: File[]) {
    if (!files.length) return;
    setLoading(true);
    setError('');
    setLastAddedCount(0);
    let newCount = 0;

    for (const file of files) {
      let base64: string, mimeType: string, previewUrl: string;
      try {
        ({ base64, mimeType, previewUrl } = await fileToJpegBase64(file));
      } catch {
        setError(`無法讀取 ${file.name}，請先在相簿匯出為 JPEG/PNG`);
        continue;
      }
      setPreviews((prev) => [...prev, previewUrl]);

      try {
        const resp = await fetch('/api/extract-weight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, mimeType }),
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
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-gray-800">

        {/* ── Fixed header (never scrolls) ── */}
        <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-gray-700/50 bg-gray-800">
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
        <div className="overflow-y-auto flex-1 px-5 pb-6">

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

              {/* Bottom confirm button — large, always reachable by thumb */}
              <button
                onClick={handleConfirm}
                className="mt-4 w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition-colors"
              >
                確認匯入 {sortedEntries.length} 筆資料
              </button>
            </div>
          )}

          {/* If AI returned nothing after analysis, offer retry hint */}
          {!loading && previews.length > 0 && sortedEntries.length === 0 && !error && (
            <div className="mt-2 px-3 py-3 bg-yellow-900/30 border border-yellow-700/50 rounded-xl">
              <p className="text-xs text-yellow-300 font-medium mb-1">⚠️ 未辨識到體重資料</p>
              <p className="text-xs text-gray-400">請確認截圖中有清晰的日期與體重數值，或嘗試換一張截圖。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 12-Month Weight Projection ───────────────────────────────────────────────
function WeightProjectionChart({ weightEntries, targetWeight }: {
  weightEntries: import('@/types').WeightEntry[];
  targetWeight?: number;
}) {
  const proj = build12MonthProjection(weightEntries, targetWeight);
  const sorted = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));

  if (!proj) {
    return (
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4 text-center">
          <Target size={32} className="text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">需要至少 2 筆體重紀錄才能生成預測</p>
        </CardContent>
      </Card>
    );
  }

  // Build combined dataset: last 30-day actuals + 12-month projections
  const cutoffStr = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();
  const recentActual = sorted.filter((e) => e.date >= cutoffStr);
  const displayActual = (recentActual.length >= 2 ? recentActual : sorted.slice(-10));

  const chartData: { label: string; actual?: number; projected?: number }[] = [
    ...displayActual.map((e) => ({
      label: format(parseISO(e.date), 'M/d'),
      actual: e.weight,
    })),
    // Bridge point — last actual becomes first projected
    { label: '現在', actual: proj.currentWeight, projected: proj.currentWeight },
    ...proj.projectedMonths.map((p) => ({
      label: format(parseISO(p.label + '-01'), 'yy/M月'),
      projected: p.weight,
    })),
  ];

  const allValues = chartData.flatMap((d) => [d.actual, d.projected].filter((v): v is number => v != null));
  const yMin = Math.floor(Math.min(...allValues, targetWeight ?? Infinity) - 1);
  const yMax = Math.ceil(Math.max(...allValues, targetWeight ?? -Infinity) + 1);

  const changeColor = proj.monthlyChange < -0.05 ? 'text-emerald-400' : proj.monthlyChange > 0.05 ? 'text-orange-400' : 'text-gray-400';
  const r2Label = proj.r2 >= 0.8 ? '高' : proj.r2 >= 0.5 ? '中' : '低';
  const r2Color = proj.r2 >= 0.8 ? 'text-emerald-400' : proj.r2 >= 0.5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <Card className="mb-4 border-purple-800/50 bg-gradient-to-br from-purple-950/30 to-gray-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-purple-300">12 個月體重預測</h2>
          </div>
          <span className="text-[10px] text-gray-500">
            依近 {proj.usedDays} 天趨勢 · {proj.dataPoints} 筆
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center py-2 bg-gray-700/40 rounded-xl">
            <p className={`text-base font-bold ${changeColor}`}>
              {proj.monthlyChange > 0 ? '+' : ''}{proj.monthlyChange.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400">kg / 月</p>
          </div>
          <div className="text-center py-2 bg-gray-700/40 rounded-xl">
            <p className={`text-base font-bold ${changeColor}`}>
              {(proj.monthlyChange * 12) > 0 ? '+' : ''}{(proj.monthlyChange * 12).toFixed(1)}
            </p>
            <p className="text-[10px] text-gray-400">kg / 年</p>
          </div>
          <div className="text-center py-2 bg-gray-700/40 rounded-xl">
            <p className={`text-base font-bold ${r2Color}`}>{r2Label}</p>
            <p className="text-[10px] text-gray-400">準確度 R²{(proj.r2 * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Target reach banner */}
        {targetWeight != null && proj.targetReachMonth !== null && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-emerald-900/30 border border-emerald-700/50 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                預計第 {proj.targetReachMonth} 個月達標
              </p>
              <p className="text-xs text-gray-400">
                目標 {targetWeight} kg · 預計 {proj.projectedMonths[proj.targetReachMonth - 1]?.label}
              </p>
            </div>
          </div>
        )}
        {targetWeight != null && proj.targetReachMonth === null && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-gray-700/40 border border-gray-600 flex items-center gap-2">
            <span className="text-lg">💡</span>
            <p className="text-xs text-gray-400">
              依目前趨勢，12 個月內不會到達目標 {targetWeight} kg
              {proj.projectedMonths[11] ? `（第12個月預測：${proj.projectedMonths[11].weight} kg）` : ''}
            </p>
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              interval="preserveStartEnd"
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              width={36}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #4b5563', background: '#1f2937', color: '#f9fafb' }}
              formatter={(value: unknown, name: unknown) => [`${value} kg`, name === 'actual' ? '實測' : '預測']}
            />
            {targetWeight && (
              <ReferenceLine y={targetWeight} stroke="#10b981" strokeDasharray="5 5" strokeOpacity={0.6}
                label={{ value: `目標 ${targetWeight}kg`, position: 'insideTopRight', fontSize: 10, fill: '#10b981' }}
              />
            )}
            {/* Vertical divider at "現在" */}
            <ReferenceLine x="現在" stroke="#6366f1" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: '#10b981' }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              name="projected"
              stroke="#a78bfa"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 2, fill: '#a78bfa' }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-2 justify-center text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-emerald-400 inline-block rounded" /> 實測</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 border-t-2 border-dashed border-purple-400" />
            預測（依近 {proj.usedDays} 天趨勢）
          </span>
          {targetWeight && <span className="flex items-center gap-1"><span className="w-4 border-t border-dashed border-emerald-500 inline-block" /> 目標</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sleep Habit Chart ────────────────────────────────────────────────────────
const DEFAULT_DINNER = '19:00';
const DEFAULT_BED = '23:00';

function timeToDecimal(t: string): number {
  const [h, m] = t.split(':').map(Number);
  const val = h + m / 60;
  // treat early-morning times (00:xx–05:xx) as past midnight (24+)
  return val < 6 ? val + 24 : val;
}

function decimalToTime(v: number): string {
  const h = Math.floor(v) % 24;
  const m = Math.round((v % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function SleepHabitChart({ days, period }: { days: number; period: Period }) {
  const { dailyLogs } = useAppStore();
  const logMap = new Map(dailyLogs.map((l) => [l.date, l]));

  const dateList: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dateList.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }

  const data = dateList.map((date) => {
    const log = logMap.get(date);
    const skipDinner = log?.skipDinner ?? false;
    const dinnerVal = skipDinner ? null : timeToDecimal(log?.dinnerFinishedAt ?? DEFAULT_DINNER);
    const bedVal = timeToDecimal(log?.bedTime ?? DEFAULT_BED);
    const gap = dinnerVal !== null ? bedVal - dinnerVal : null;
    const isDefault = !log?.dinnerFinishedAt && !log?.bedTime && !log?.skipDinner;
    return {
      date,
      label: days <= 14
        ? format(parseISO(date), 'M/d (EEE)', { locale: zhTW })
        : format(parseISO(date), 'M/d'),
      dinner: dinnerVal,
      bed: bedVal,
      gap,
      skipDinner,
      isDefault,
    };
  });

  // Summary stats
  const actualDays = data.filter((d) => !d.isDefault);
  const avgGap = actualDays.length
    ? actualDays.reduce((s, d) => s + (d.gap ?? (d.skipDinner ? 8 : 0)), 0) / actualDays.length
    : timeToDecimal(DEFAULT_BED) - timeToDecimal(DEFAULT_DINNER);
  const goodDays = actualDays.filter((d) => d.skipDinner || (d.gap !== null && d.gap >= 3)).length;

  // Y-axis domain: auto-fit from min dinner to max bed
  const allDinner = data.map((d) => d.dinner ?? timeToDecimal(DEFAULT_DINNER));
  const allBed = data.map((d) => d.bed);
  const yMin = Math.floor(Math.min(...allDinner)) - 0.5;
  const yMax = Math.ceil(Math.max(...allBed)) + 0.5;
  const yTicks: number[] = [];
  for (let t = Math.ceil(yMin); t <= Math.floor(yMax); t++) yTicks.push(t);

  // X-axis: thin out labels when many days
  const xInterval = days <= 14 ? 0 : days <= 31 ? 3 : days <= 90 ? 6 : 14;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const d = data.find((x) => x.label === label);
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-xs space-y-1">
        <p className="text-gray-300 font-medium">{label}{d?.isDefault ? ' (預設)' : ''}</p>
        {d?.skipDinner && <p className="text-emerald-400">🚫 沒吃晚餐</p>}
        {payload.map((p) => (
          p.name === '晚餐完成' && d?.skipDinner ? null :
          <p key={p.name} style={{ color: p.color }}>
            {p.name === '晚餐完成' ? '🍽 ' : '🌙 '}
            {p.name}: {decimalToTime(p.value)}
          </p>
        ))}
        {payload.length === 2 && (
          <p className="text-gray-400">間距: {(payload[1].value - payload[0].value).toFixed(1).replace('.0', '')} 小時</p>
        )}
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Moon size={14} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-gray-200">晚餐 &amp; 就寢時間趨勢</h2>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center py-2 bg-gray-700/50 rounded-xl">
            <p className="text-sm font-bold text-indigo-400">{decimalToTime(timeToDecimal(DEFAULT_BED))}</p>
            <p className="text-[10px] text-gray-400">預設就寢</p>
          </div>
          <div className="text-center py-2 bg-gray-700/50 rounded-xl">
            <p className={`text-sm font-bold ${avgGap >= 3 ? 'text-emerald-400' : avgGap >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
              {avgGap.toFixed(1)}h
            </p>
            <p className="text-[10px] text-gray-400">平均間距</p>
          </div>
          <div className="text-center py-2 bg-gray-700/50 rounded-xl">
            <p className="text-sm font-bold text-emerald-400">{goodDays}/{actualDays.length || days}</p>
            <p className="text-[10px] text-gray-400">達標天數</p>
          </div>
        </div>

        {/* Line chart */}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              interval={xInterval}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              ticks={yTicks}
              tickFormatter={decimalToTime}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            {/* 3-hour safe gap reference band */}
            <ReferenceLine
              y={timeToDecimal(DEFAULT_BED)}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="dinner"
              name="晚餐完成"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 2, fill: '#f97316' }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="bed"
              name="就寢時間"
              stroke="#818cf8"
              strokeWidth={2}
              dot={{ r: 2, fill: '#818cf8' }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>

        <p className="text-[10px] text-gray-600 mt-2 text-center">
          未記錄的日期以預設值（晚餐 {DEFAULT_DINNER} / 就寢 {DEFAULT_BED}）顯示
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Waist Form ───────────────────────────────────────────────────────────────
function WaistForm({ onAdd, onClose }: { onAdd: (e: Omit<WaistEntry, 'id'>) => void; onClose: () => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [waist, setWaist] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit() {
    const val = parseFloat(waist);
    if (!val || val < 40 || val > 200) return;
    onAdd({ date, waist: Math.round(val * 10) / 10, notes: notes || undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-gray-800">
        <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-gray-700/50 bg-gray-800">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">取消</button>
            <h2 className="text-base font-bold text-white">記錄腰圍</h2>
            <button
              onClick={handleSubmit}
              disabled={!waist || parseFloat(waist) < 40}
              className="px-4 py-1.5 bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-semibold rounded-xl"
            >
              ✅ 儲存
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">腰圍 (cm)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={40} max={200} step={0.1}
                value={waist} onChange={(e) => setWaist(e.target.value)}
                placeholder="例如 82.5"
                className="flex-1 px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
              <span className="text-sm text-gray-400">cm</span>
            </div>
            {waist && parseFloat(waist) > 0 && (
              <p className="text-xs mt-1.5 text-gray-500">
                {parseFloat(waist) < 80
                  ? '✅ 男性理想 <85cm，女性 <80cm'
                  : parseFloat(waist) < 85
                    ? '⚠️ 接近代謝風險值（男 85cm，女 80cm）'
                    : '⚠️ 超過代謝風險值，建議加強運動'}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">備註（選填）</label>
            <input type="text" placeholder="如：早上空腹量測" value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Waist Section (chart + log) ──────────────────────────────────────────────
function WaistSection({ period }: { period: Period }) {
  const { waistEntries, addWaistEntry, deleteWaistEntry } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [expandLog, setExpandLog] = useState(false);

  const days = parseInt(period);
  const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
  const sorted = [...waistEntries].sort((a, b) => a.date.localeCompare(b.date));
  const inPeriod = sorted.filter((e) => e.date >= cutoff);
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const totalChange = latest && earliest && latest.id !== earliest.id
    ? Math.round((latest.waist - earliest.waist) * 10) / 10 : null;

  const chartData = inPeriod.map((e) => ({
    date: format(parseISO(e.date), days <= 30 ? 'M/d' : 'M月'),
    腰圍: e.waist,
    fullDate: e.date,
  }));

  function handleAdd(entry: Omit<WaistEntry, 'id'>) {
    addWaistEntry({ ...entry, id: crypto.randomUUID() });
  }

  const hasData = sorted.length > 0;
  const riskThreshold = 85; // male, use 80 for female ideally

  return (
    <>
      <Card className="mb-4 border-rose-800/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">📏</span>
              <h2 className="text-sm font-semibold text-gray-200">腰圍趨勢</h2>
              {latest && (
                <span className="text-xs text-rose-300 font-semibold">{latest.waist} cm</span>
              )}
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-300 text-xs font-medium rounded-lg transition-colors"
            >
              <Plus size={12} /> 記錄
            </button>
          </div>
          {totalChange !== null && (
            <p className={`text-xs mt-1 ${totalChange < 0 ? 'text-emerald-400' : totalChange > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
              累計 {totalChange > 0 ? '+' : ''}{totalChange} cm
              <span className="text-gray-500 ml-1">（{sorted.length} 筆紀錄）</span>
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {!hasData ? (
            <div className="h-28 flex flex-col items-center justify-center gap-2">
              <p className="text-xs text-gray-500">尚無腰圍紀錄</p>
              <button onClick={() => setShowForm(true)}
                className="text-xs text-rose-400 hover:text-rose-300 underline">
                點此新增第一筆
              </button>
            </div>
          ) : inPeriod.length < 2 ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-xs text-gray-500">此期間資料不足，請選擇更長時間範圍</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-waist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #4b5563', background: '#1f2937', color: '#f9fafb' }}
                  formatter={(v: unknown) => [`${v} cm`, '腰圍']}
                />
                <ReferenceLine y={riskThreshold} stroke="#fb923c" strokeDasharray="4 4"
                  label={{ value: '風險值', fontSize: 9, fill: '#fb923c' }} />
                <Area type="monotone" dataKey="腰圍" stroke="#f43f5e" strokeWidth={2}
                  fill="url(#grad-waist)" dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Log */}
          {hasData && (
            <div className="mt-3 border-t border-gray-700/50 pt-3">
              <button
                className="flex items-center justify-between w-full mb-2"
                onClick={() => setExpandLog(!expandLog)}
              >
                <span className="text-xs text-gray-400">所有紀錄</span>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {sorted.length} 筆
                  {expandLog ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </div>
              </button>
              {expandLog && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {[...sorted].reverse().map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 px-2 bg-gray-700/30 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-300">{e.date}</span>
                        {e.notes && <span className="text-[10px] text-gray-500 ml-2">{e.notes}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-rose-300">{e.waist} cm</span>
                        <button onClick={() => deleteWaistEntry(e.id)} className="text-gray-600 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && <WaistForm onAdd={handleAdd} onClose={() => setShowForm(false)} />}
    </>
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

      {/* 12-month projection */}
      <WeightProjectionChart weightEntries={sortedAll} targetWeight={profile?.targetWeight} />

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

      {/* Waist circumference */}
      <WaistSection period={period} />

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

      {/* Sleep Habit Chart */}
      <SleepHabitChart days={days} period={period} />

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

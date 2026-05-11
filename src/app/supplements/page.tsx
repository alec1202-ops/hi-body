'use client';

import { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Pill, Star, X, Check,
  Pencil, Camera, Loader2, History, Settings,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { SupplementUnit, SupplementTemplate } from '@/types';

const UNITS: SupplementUnit[] = ['mg', 'IU', 'mcg', 'g', 'ml', '顆', '錠', '包', '滴'];

function dateLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return format(new Date(dateStr + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW });
}

const PRESET_SUPPLEMENTS = [
  { name: '維生素D3', dose: 1000, unit: 'IU' as SupplementUnit },
  { name: '維生素B群', dose: 1, unit: '顆' as SupplementUnit },
  { name: '鋅（螯合鋅）', dose: 15, unit: 'mg' as SupplementUnit },
  { name: '魚油 Omega-3', dose: 1000, unit: 'mg' as SupplementUnit },
  { name: '膠原蛋白', dose: 5, unit: 'g' as SupplementUnit },
  { name: '葉酸', dose: 400, unit: 'mcg' as SupplementUnit },
  { name: '鐵', dose: 14, unit: 'mg' as SupplementUnit },
  { name: '鎂', dose: 200, unit: 'mg' as SupplementUnit },
];

interface AIResult {
  name: string;
  dose: number;
  unit: SupplementUnit;
  notes?: string;
}

// ─── Add Form ─────────────────────────────────────────────────────────────────

function AddForm({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, dose: number, unit: SupplementUnit, notes?: string, saveAsTemplate?: boolean) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState<SupplementUnit>('mg');
  const [notes, setNotes] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState<AIResult[]>([]);

  async function handlePhoto(base64: string, mimeType: string, preview: string) {
    setPhotoPreview(preview);
    setAnalyzing(true);
    setAiResults([]);
    try {
      const res = await fetch('/api/analyze-supplement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (data.supplements?.length) {
        setAiResults(data.supplements);
        const first = data.supplements[0];
        setName(first.name);
        setDose(String(first.dose));
        setUnit(first.unit);
        if (first.notes) setNotes(first.notes);
      }
    } catch {
      // silently fail — user can fill in manually
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSubmit() {
    if (!name.trim() || !dose) return;
    onAdd(name.trim(), parseFloat(dose), unit, notes.trim() || undefined, saveTemplate);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">取消</button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">新增補充品</h2>
            <button
              onClick={() => setShowCamera(!showCamera)}
              className={`p-1.5 rounded-xl transition-colors ${showCamera ? 'bg-purple-900/60 text-purple-400' : 'text-gray-400 hover:text-gray-200'}`}
              title="AI 標籤辨識"
            >
              <Camera size={16} />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !dose}
            className="px-4 py-1.5 bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-semibold rounded-xl"
          >
            新增
          </button>
        </div>

        {/* AI camera section */}
        {showCamera && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">拍攝補充品標籤，AI 自動辨識名稱與劑量</p>
            {analyzing ? (
              <div className="h-36 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-purple-500/60 rounded-xl bg-purple-950/20">
                <Loader2 size={24} className="text-purple-400 animate-spin" />
                <span className="text-sm text-gray-400">AI 辨識中...</span>
              </div>
            ) : (
              <PhotoUpload
                onPhoto={handlePhoto}
                preview={photoPreview}
                onClear={() => { setPhotoPreview(undefined); setAiResults([]); }}
                label="拍攝或上傳補充品標籤"
              />
            )}
            {aiResults.length > 1 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">辨識到多種補充品，點選填入：</p>
                <div className="flex flex-wrap gap-2">
                  {aiResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setName(r.name);
                        setDose(String(r.dose));
                        setUnit(r.unit);
                        if (r.notes) setNotes(r.notes);
                      }}
                      className="px-2.5 py-1 text-xs bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 rounded-lg border border-purple-700 transition-colors"
                    >
                      {r.name} {r.dose}{r.unit}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick presets */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">快速選擇</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_SUPPLEMENTS.map((p) => (
              <button
                key={p.name}
                onClick={() => { setName(p.name); setDose(String(p.dose)); setUnit(p.unit); }}
                className="px-2.5 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg border border-gray-600 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="補充品名稱（例：維生素D3）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="劑量"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as SupplementUnit)}
              className="px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder="備註（可選）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setSaveTemplate(!saveTemplate)}
              className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${saveTemplate ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}
            >
              {saveTemplate && <Check size={12} className="text-white" />}
            </div>
            <span className="text-sm text-gray-300">儲存為常用補充品</span>
          </label>
        </div>

      </div>
    </div>
  );
}

// ─── Edit Template Sheet ───────────────────────────────────────────────────────

function EditTemplateSheet({
  tpl,
  onSave,
  onClose,
}: {
  tpl: SupplementTemplate;
  onSave: (id: string, name: string, dose: number, unit: SupplementUnit, notes?: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(tpl.name);
  const [dose, setDose] = useState(String(tpl.dose));
  const [unit, setUnit] = useState<SupplementUnit>(tpl.unit);
  const [notes, setNotes] = useState(tpl.notes ?? '');

  function handleSave() {
    if (!name.trim() || !dose) return;
    onSave(tpl.id, name.trim(), parseFloat(dose), unit, notes.trim() || undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">取消</button>
          <h2 className="text-base font-bold text-white">編輯常用補充品</h2>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !dose}
            className="px-4 py-1.5 bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-semibold rounded-xl"
          >
            儲存
          </button>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="補充品名稱"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="劑量"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as SupplementUnit)}
              className="px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <input
            type="text"
            placeholder="備註（可選）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}

// ─── 30-Day History ───────────────────────────────────────────────────────────

function HistorySection({
  supplementEntries,
  supplementTemplates,
}: {
  supplementEntries: { date: string; name: string }[];
  supplementTemplates: { name: string }[];
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(format(subDays(new Date(today + 'T00:00:00'), i), 'yyyy-MM-dd'));
  }

  const countByDate: Record<string, number> = {};
  const namesByDate: Record<string, string[]> = {};
  supplementEntries.forEach((e) => {
    if (!days.includes(e.date)) return;
    countByDate[e.date] = (countByDate[e.date] || 0) + 1;
    if (!namesByDate[e.date]) namesByDate[e.date] = [];
    namesByDate[e.date].push(e.name);
  });

  const templateCount = supplementTemplates.length;
  const activeDays = days.filter((d) => (countByDate[d] || 0) > 0).length;
  const totalTaken = days.reduce((sum, d) => sum + (countByDate[d] || 0), 0);
  const adherence = templateCount > 0
    ? Math.round(
        (days.reduce((sum, d) => sum + Math.min(countByDate[d] || 0, templateCount), 0) /
          (templateCount * 30)) *
          100,
      )
    : null;

  function dotColor(count: number) {
    if (!count) return 'bg-gray-700';
    if (!templateCount) return 'bg-purple-500';
    const ratio = count / templateCount;
    if (ratio >= 1) return 'bg-emerald-500';
    if (ratio >= 0.5) return 'bg-yellow-500';
    return 'bg-purple-400';
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={14} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-200">過去 30 天紀錄</h2>
          </div>
          {adherence !== null && (
            <span className="text-xs text-gray-400">
              打卡率{' '}
              <span className={`font-semibold ${adherence >= 80 ? 'text-emerald-400' : adherence >= 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                {adherence}%
              </span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Stats row */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-gray-700/50 rounded-xl px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-white">{activeDays}</p>
            <p className="text-xs text-gray-400">有記錄天數</p>
          </div>
          <div className="flex-1 bg-gray-700/50 rounded-xl px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-white">{totalTaken}</p>
            <p className="text-xs text-gray-400">總服用次數</p>
          </div>
          {adherence !== null && (
            <div className="flex-1 bg-gray-700/50 rounded-xl px-3 py-2.5 text-center">
              <p className={`text-lg font-bold ${adherence >= 80 ? 'text-emerald-400' : adherence >= 50 ? 'text-yellow-400' : 'text-gray-300'}`}>
                {adherence}%
              </p>
              <p className="text-xs text-gray-400">完成率</p>
            </div>
          )}
        </div>

        {/* 30-day dot grid — 5 weeks × 6 cols layout using flex rows */}
        <div className="grid grid-cols-10 gap-1.5 mb-3">
          {days.map((d) => {
            const count = countByDate[d] || 0;
            const isSelected = selectedDay === d;
            return (
              <button
                key={d}
                onClick={() => setSelectedDay(isSelected ? null : d)}
                title={d}
                className={`aspect-square rounded-md transition-all ${dotColor(count)} ${isSelected ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-700 inline-block" /> 未記錄</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" /> 部分</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> 完整</span>
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="mt-2 p-3 bg-gray-700/50 rounded-xl">
            <p className="text-xs font-medium text-gray-300 mb-1.5">
              {format(new Date(selectedDay + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW })}
            </p>
            {!namesByDate[selectedDay] ? (
              <p className="text-xs text-gray-500">未記錄</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {namesByDate[selectedDay].map((n, i) => (
                  <span key={i} className="px-2 py-0.5 bg-purple-900/40 border border-purple-700/50 text-purple-300 text-xs rounded-lg">{n}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SupplementsPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SupplementTemplate | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const {
    supplementEntries,
    supplementTemplates,
    addSupplementEntry,
    deleteSupplementEntry,
    addSupplementTemplate,
    updateSupplementTemplate,
    deleteSupplementTemplate,
  } = useAppStore();

  const isToday = date === format(new Date(), 'yyyy-MM-dd');
  const dayEntries = supplementEntries.filter((e) => e.date === date);
  const taken = new Set(dayEntries.map((e) => e.name));

  function handleAdd(name: string, dose: number, unit: SupplementUnit, notes?: string, saveAsTemplate = false) {
    const now = new Date();
    const id = `supp-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`;
    const existing = supplementTemplates.find((t) => t.name.toLowerCase() === name.toLowerCase());
    addSupplementEntry({ id, date, name, dose, unit, notes, templateId: existing?.id, timestamp: now.toISOString() });
    if (saveAsTemplate && !existing) {
      addSupplementTemplate({ id: `tpl-${now.getTime()}`, name, dose, unit, notes, createdAt: now.toISOString() });
    }
  }

  function handleQuickAdd(tpl: SupplementTemplate) {
    if (taken.has(tpl.name)) return;
    const now = new Date();
    addSupplementEntry({
      id: `supp-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
      date, name: tpl.name, dose: tpl.dose, unit: tpl.unit, notes: tpl.notes,
      templateId: tpl.id, timestamp: now.toISOString(),
    });
  }

  return (
    <div className="page-container px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Pill size={22} className="text-purple-400" /> 補充品
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isToday ? '今天' : format(new Date(date + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW })}
          </p>
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
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isToday ? 'bg-purple-900/50 text-purple-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
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

      {/* Quick-add from templates */}
      {supplementTemplates.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-gray-200">常用補充品</h2>
              </div>
              <button
                onClick={() => setIsManaging(!isManaging)}
                className={`p-1.5 rounded-lg transition-colors ${isManaging ? 'bg-purple-900/50 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="管理常用清單"
              >
                <Settings size={14} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isManaging ? (
              <div className="space-y-1">
                {supplementTemplates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-200">{tpl.name}</p>
                      <p className="text-xs text-gray-500">{tpl.dose} {tpl.unit}{tpl.notes ? ` · ${tpl.notes}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingTemplate(tpl)}
                        className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteSupplementTemplate(tpl.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-600 pt-1">再次點擊齒輪圖示關閉管理模式</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {supplementTemplates.map((tpl) => {
                  const done = taken.has(tpl.name);
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => handleQuickAdd(tpl)}
                      disabled={done}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors
                        ${done
                          ? 'bg-emerald-900/30 border-emerald-700 text-emerald-400'
                          : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:bg-gray-600'
                        }`}
                    >
                      {done ? '✓ ' : '+ '}{tpl.name} {tpl.dose}{tpl.unit}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Today's log */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">
              {isToday ? '今日記錄' : '當日記錄'}
              {dayEntries.length > 0 && <span className="ml-2 text-xs text-gray-500">{dayEntries.length} 項</span>}
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowForm(true)}>
              <Plus size={14} /> 新增
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {dayEntries.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-500">今天還沒記錄補充品</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800 text-purple-300 text-sm rounded-xl transition-colors"
              >
                + 新增補充品
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {dayEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Pill size={14} className="text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-100">{entry.name}</p>
                      <p className="text-xs text-gray-500">{entry.dose} {entry.unit}{entry.notes ? ` · ${entry.notes}` : ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteSupplementEntry(entry.id)}
                    className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary badge */}
      {dayEntries.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-purple-950/30 border border-purple-800/50 mb-4">
          <span className="text-xl">💊</span>
          <div>
            <p className="text-sm font-semibold text-white">今日已服用 {dayEntries.length} 種補充品</p>
            <p className="text-xs text-gray-400">{dayEntries.map((e) => e.name).join('、')}</p>
          </div>
        </div>
      )}

      {/* History toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="w-full flex items-center justify-between px-4 py-3 mb-4 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-2xl transition-colors"
      >
        <div className="flex items-center gap-2">
          <History size={15} className="text-purple-400" />
          <span className="text-sm font-medium text-gray-300">歷史紀錄（過去 30 天）</span>
        </div>
        <ChevronRight size={16} className={`text-gray-500 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
      </button>

      {showHistory && (
        <HistorySection supplementEntries={supplementEntries} supplementTemplates={supplementTemplates} />
      )}

      {showForm && (
        <AddForm onAdd={handleAdd} onClose={() => setShowForm(false)} />
      )}

      {editingTemplate && (
        <EditTemplateSheet
          tpl={editingTemplate}
          onSave={(id, name, dose, unit, notes) => updateSupplementTemplate(id, { name, dose, unit, notes })}
          onClose={() => setEditingTemplate(null)}
        />
      )}
    </div>
  );
}

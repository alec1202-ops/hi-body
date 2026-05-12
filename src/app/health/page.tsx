'use client';

import React, { useState, useRef } from 'react';
import { Brain, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, AlertTriangle, CheckCircle, Info, Loader2, Pencil, FileUp, ScanLine } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { HealthReport } from '@/types';

// ─── Field Groups ─────────────────────────────────────────────────────────────
const FIELD_GROUPS = [
  {
    id: 'hormones',
    label: '🧬 荷爾蒙與代謝',
    fields: [
      { key: 'testosterone', label: '睪固酮', unit: 'ng/dL', ref: '300–1000' },
      { key: 'freeTestosterone', label: '游離睪固酮', unit: 'pg/mL', ref: '9–30' },
      { key: 'tsh', label: 'TSH（甲狀腺）', unit: 'mIU/L', ref: '0.4–4.0' },
      { key: 't3', label: '游離T3', unit: 'pg/mL', ref: '2.3–4.2' },
      { key: 't4', label: '游離T4', unit: 'ng/dL', ref: '0.8–1.8' },
      { key: 'cortisol', label: '皮質醇（早8點）', unit: 'μg/dL', ref: '6.2–19.4' },
      { key: 'fastingInsulin', label: '空腹胰島素', unit: 'μIU/mL', ref: '<10 最佳' },
      { key: 'fastingGlucose', label: '空腹血糖', unit: 'mg/dL', ref: '70–99' },
      { key: 'homaIR', label: 'HOMA-IR', unit: '', ref: '<1.5 最佳' },
    ],
  },
  {
    id: 'nutrients',
    label: '💊 營養素狀態',
    fields: [
      { key: 'vitaminD', label: '維生素D (25-OH)', unit: 'ng/mL', ref: '40–60 最佳' },
      { key: 'ferritin', label: '鐵蛋白', unit: 'ng/mL', ref: '50–200' },
      { key: 'hemoglobin', label: '血紅素', unit: 'g/dL', ref: '13.5–17.5 (男)' },
      { key: 'vitaminB12', label: '維生素B12', unit: 'pg/mL', ref: '>500 最佳' },
      { key: 'zinc', label: '鋅', unit: 'μg/dL', ref: '70–120' },
      { key: 'rbcMagnesium', label: 'RBC鎂（更準確）', unit: 'mg/dL', ref: '4.2–6.8' },
    ],
  },
  {
    id: 'inflammation',
    label: '🔥 發炎與恢復指標',
    fields: [
      { key: 'hsCRP', label: '高敏感性CRP', unit: 'mg/L', ref: '<1.0 最佳' },
      { key: 'uricAcid', label: '尿酸', unit: 'mg/dL', ref: '3.4–7.0 (男)' },
      { key: 'creatineKinase', label: '肌酸激酶 CK', unit: 'U/L', ref: '22–198' },
    ],
  },
  {
    id: 'liver',
    label: '🫀 肝腎功能',
    fields: [
      { key: 'got', label: 'GOT (AST)', unit: 'U/L', ref: '10–40' },
      { key: 'gpt', label: 'GPT (ALT)', unit: 'U/L', ref: '7–56' },
      { key: 'creatinine', label: '肌酸酐', unit: 'mg/dL', ref: '0.7–1.3 (男)' },
      { key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', ref: '>90 最佳' },
    ],
  },
  {
    id: 'lipids',
    label: '🩸 血脂四項',
    fields: [
      { key: 'totalCholesterol', label: '總膽固醇', unit: 'mg/dL', ref: '<200' },
      { key: 'ldl', label: 'LDL（壞膽固醇）', unit: 'mg/dL', ref: '<100 最佳' },
      { key: 'hdl', label: 'HDL（好膽固醇）', unit: 'mg/dL', ref: '>60 最佳' },
      { key: 'triglycerides', label: '三酸甘油酯', unit: 'mg/dL', ref: '<150' },
    ],
  },
];

// ─── Report Form ──────────────────────────────────────────────────────────────
function ReportForm({ initial, onSave, onClose }: {
  initial?: HealthReport;
  onSave: (r: Omit<HealthReport, 'id'>) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
  const [values, setValues] = useState<Partial<HealthReport>>(initial || {});
  const [notes, setNotes] = useState(initial?.notes || '');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ hormones: true });
  const [extracting, setExtracting] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<{ name: string; status: 'pending' | 'done' | 'error'; count?: number }[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function setVal(key: string, v: string) {
    const num = parseFloat(v);
    setValues((prev) => ({ ...prev, [key]: isNaN(num) ? undefined : num }));
  }

  function handleSave() {
    const data: Omit<HealthReport, 'id'> = { ...values, date, notes: notes || undefined };
    onClose();
    onSave(data);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = '';

    setExtracting(true);
    setFileStatuses(files.map((f) => ({ name: f.name, status: 'pending' })));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl: string = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = (ev) => res(ev.target!.result as string);
        reader.readAsDataURL(file);
      });

      // Only add image previews (not PDFs)
      if (file.type.startsWith('image/')) {
        setPreviews((prev) => [...prev, dataUrl]);
      }

      try {
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/jpeg';
        const res = await fetch('/api/extract-health-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType }),
        });
        const data = await res.json();
        if (data.values && Object.keys(data.values).length > 0) {
          setValues((prev) => ({ ...prev, ...data.values }));
          // Auto-open groups that have new data
          const extracted = Object.keys(data.values);
          setOpenGroups((prev) => {
            const next = { ...prev };
            FIELD_GROUPS.forEach((g) => {
              if (g.fields.some((f) => extracted.includes(f.key))) next[g.id] = true;
            });
            return next;
          });
          setFileStatuses((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'done', count: data.count } : s));
        } else {
          setFileStatuses((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'error' } : s));
        }
      } catch {
        setFileStatuses((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'error' } : s));
      }
    }

    setExtracting(false);
  }

  const totalExtracted = fileStatuses.filter((s) => s.status === 'done').reduce((sum, s) => sum + (s.count ?? 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl max-h-[92dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* ── Fixed header ── */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200">取消</button>
            <h2 className="text-base font-bold text-white">{initial ? '編輯健康報告' : '新增健康報告'}</h2>
            <button onClick={handleSave} className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl">
              ✅ 儲存
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

          {/* Date */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">檢查日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
          </div>

          {/* AI Upload — multiple files */}
          <div className="mb-4">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-purple-700 rounded-2xl text-sm font-medium text-purple-400 hover:bg-purple-950/30 hover:border-purple-500 transition-colors disabled:opacity-60"
            >
              {extracting
                ? <><Loader2 size={18} className="animate-spin" /> AI 識別中...</>
                : <><ScanLine size={18} /> {fileStatuses.length === 0 ? '上傳健檢報告（可多張）' : '再加入報告'}</>
              }
            </button>
            <p className="text-[10px] text-gray-500 text-center mt-1">支援照片（JPG/PNG）或 PDF，可一次多選</p>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFileUpload} />

            {/* Image thumbnails */}
            {previews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2 mt-1">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`報告 ${i + 1}`}
                    className="h-14 w-auto rounded-lg flex-shrink-0 border border-gray-600 object-cover" />
                ))}
              </div>
            )}

            {/* Per-file status */}
            {fileStatuses.length > 0 && (
              <div className="mt-2 space-y-1">
                {fileStatuses.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {s.status === 'pending' && <Loader2 size={12} className="animate-spin text-purple-400 flex-shrink-0" />}
                    {s.status === 'done' && <span className="text-emerald-400 flex-shrink-0">✅</span>}
                    {s.status === 'error' && <span className="text-orange-400 flex-shrink-0">⚠️</span>}
                    <span className={`truncate ${s.status === 'done' ? 'text-emerald-400' : s.status === 'error' ? 'text-orange-400' : 'text-gray-400'}`}>
                      {s.name}
                      {s.status === 'done' && ` · 識別 ${s.count} 項`}
                      {s.status === 'error' && ' · 無法識別'}
                    </span>
                  </div>
                ))}
                {!extracting && totalExtracted > 0 && (
                  <p className="text-xs text-emerald-400 font-medium mt-1">
                    共識別 {totalExtracted} 項數據，請確認後儲存
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Field Groups */}
          {FIELD_GROUPS.map((group) => (
            <div key={group.id} className="mb-3 border border-gray-700 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenGroups((p) => ({ ...p, [group.id]: !p[group.id] }))}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-700 text-sm font-semibold text-gray-200"
              >
                <span>{group.label}</span>
                {openGroups[group.id] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {openGroups[group.id] && (
                <div className="p-3 grid grid-cols-2 gap-2">
                  {group.fields.map((f) => (
                    <div key={f.key}>
                      <label className="text-[10px] text-gray-400 mb-0.5 block">{f.label} {f.unit && <span className="text-gray-500">({f.unit})</span>}</label>
                      <input
                        type="number"
                        step="any"
                        placeholder={f.ref}
                        value={(values as Record<string, number | undefined>)[f.key] ?? ''}
                        onChange={(e) => setVal(f.key, e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Notes */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">備註（其他檢查項目）</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="可記錄過敏原IgE/IgG、其他指標等..."
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400 resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Diagnosis Display ────────────────────────────────────────────────────────
function DiagnosisResult({ text }: { text: string }) {
  // Parse sections from markdown-like text
  const sections = text.split(/(?=^##\s)/m).filter(Boolean);

  return (
    <div className="space-y-4">
      {sections.map((section, i) => {
        const lines = section.trim().split('\n');
        const titleLine = lines[0];
        const content = lines.slice(1).join('\n').trim();
        const title = titleLine.replace(/^#+\s*/, '').trim();

        // Determine card color based on content
        const isWarning = title.includes('問題') || title.includes('⚠️');
        const isAction = title.includes('建議') || title.includes('💊') || title.includes('快速');
        const isPriority = title.includes('優先') || title.includes('📊');

        return (
          <Card key={i} className={isWarning ? 'border-orange-700' : isAction ? 'border-emerald-700' : isPriority ? 'border-blue-700' : ''}>
            <CardContent className="pt-4 pb-4">
              <h3 className={`font-bold text-sm mb-2 ${isWarning ? 'text-orange-400' : isAction ? 'text-emerald-400' : isPriority ? 'text-blue-400' : 'text-gray-100'}`}>
                {title}
              </h3>
              <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {content.split(/\n(?=###\s)/).map((sub, j) => {
                  if (sub.startsWith('### ')) {
                    const subLines = sub.split('\n');
                    const subTitle = subLines[0].replace(/^###\s*/, '');
                    const subContent = subLines.slice(1).join('\n').trim();
                    const severity = subTitle.includes('高') ? 'high' : subTitle.includes('中') ? 'medium' : 'low';
                    return (
                      <div key={j} className={`mb-3 p-3 rounded-xl ${severity === 'high' ? 'bg-red-950/40 border border-red-800' : severity === 'medium' ? 'bg-orange-950/40 border border-orange-800' : 'bg-yellow-950/40 border border-yellow-800'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {severity === 'high' ? <AlertTriangle size={13} className="text-red-400" /> : severity === 'medium' ? <AlertTriangle size={13} className="text-orange-400" /> : <Info size={13} className="text-yellow-400" />}
                          <span className={`text-xs font-semibold ${severity === 'high' ? 'text-red-300' : severity === 'medium' ? 'text-orange-300' : 'text-yellow-300'}`}>{subTitle}</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{subContent}</p>
                      </div>
                    );
                  }
                  return <p key={j} className="text-sm text-gray-300 leading-relaxed">{sub}</p>;
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HealthPage() {
  const { profile, healthReports, foodEntries, exerciseEntries, weightEntries,
    supplementEntries, supplementTemplates,
    addHealthReport, updateHealthReport, deleteHealthReport } = useAppStore();

  const [tab, setTab] = useState<'reports' | 'diagnose'>('reports');
  const [showForm, setShowForm] = useState(false);
  const [editReport, setEditReport] = useState<HealthReport | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [diagError, setDiagError] = useState('');
  const [analysisDays, setAnalysisDays] = useState(30);

  const sortedReports = [...healthReports].sort((a, b) => b.date.localeCompare(a.date));
  const selectedReport = selectedReportId
    ? healthReports.find((r) => r.id === selectedReportId)
    : sortedReports[0];

  function handleSave(data: Omit<HealthReport, 'id'>) {
    if (editReport) {
      updateHealthReport(editReport.id, data);
    } else {
      addHealthReport({ ...data, id: crypto.randomUUID() });
    }
  }

  async function runDiagnosis() {
    if (!profile) { setDiagError('請先在「我的」頁面設定個人資料'); return; }
    if (!selectedReport) { setDiagError('請先新增健康報告'); return; }
    setDiagnosing(true);
    setDiagError('');
    setDiagnosis(null);
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          healthReport: selectedReport,
          foodEntries,
          exerciseEntries,
          weightEntries,
          supplementEntries,
          supplementTemplates,
          analysisPeriodDays: analysisDays,
        }),
      });
      const data = await res.json();
      if (data.diagnosis) {
        setDiagnosis(data.diagnosis);
      } else {
        setDiagError(data.error || '診斷失敗，請稍後再試');
      }
    } catch (err) {
      setDiagError('網路錯誤：' + String(err));
    } finally {
      setDiagnosing(false);
    }
  }

  function countFilled(report: HealthReport): number {
    const keys: (keyof HealthReport)[] = ['testosterone','freeTestosterone','tsh','t3','t4','cortisol','fastingInsulin','fastingGlucose','homaIR','vitaminD','ferritin','hemoglobin','vitaminB12','zinc','rbcMagnesium','hsCRP','uricAcid','creatineKinase','got','gpt','creatinine','egfr','totalCholesterol','ldl','hdl','triglycerides'];
    return keys.filter((k) => report[k] != null).length;
  }

  return (
    <div className="page-container px-4 pt-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-purple-900/40 rounded-xl flex items-center justify-center">
            <Brain size={20} className="text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-white">AI 健康診斷</h1>
        </div>
        <Button size="sm" onClick={() => { setEditReport(null); setShowForm(true); }}>
          <Plus size={16} /> 新增報告
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-5">
        <button onClick={() => setTab('reports')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'reports' ? 'bg-gray-600 shadow-sm text-white' : 'text-gray-400'}`}>
          📋 健康報告
        </button>
        <button onClick={() => setTab('diagnose')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'diagnose' ? 'bg-gray-600 shadow-sm text-purple-300' : 'text-gray-400'}`}>
          🧠 AI 診斷
        </button>
      </div>

      {/* ── REPORTS TAB ──────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-3">
          {sortedReports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain size={40} className="text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-1">尚未新增健康報告</p>
                <p className="text-xs text-gray-500 mb-4">輸入年度健康檢查數值<br />讓 AI 幫你找出身體問題</p>
                <Button size="sm" onClick={() => { setEditReport(null); setShowForm(true); }}>
                  <Plus size={14} /> 新增第一份報告
                </Button>
              </CardContent>
            </Card>
          ) : (
            sortedReports.map((report) => {
              const filled = countFilled(report);
              return (
                <Card key={report.id} className={selectedReportId === report.id ? 'border-purple-300' : ''}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-100">{report.date}</span>
                          <span className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-300 rounded-full">{filled} 項數據</span>
                          {selectedReport?.id === report.id && (
                            <span className="text-xs px-2 py-0.5 bg-emerald-900/40 text-emerald-300 rounded-full">已選用</span>
                          )}
                        </div>
                        {report.notes && <p className="text-xs text-gray-500 mt-1 truncate">{report.notes}</p>}
                        {/* Quick stats */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {report.vitaminD && <span className="text-[10px] bg-yellow-900/30 text-yellow-400 px-1.5 py-0.5 rounded">D: {report.vitaminD}</span>}
                          {report.testosterone && <span className="text-[10px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded">T: {report.testosterone}</span>}
                          {report.fastingGlucose && <span className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">血糖: {report.fastingGlucose}</span>}
                          {report.hsCRP && <span className="text-[10px] bg-orange-900/30 text-orange-400 px-1.5 py-0.5 rounded">CRP: {report.hsCRP}</span>}
                          {report.hdl && <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded">HDL: {report.hdl}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        <button onClick={() => setSelectedReportId(report.id)} className={`p-1.5 rounded-lg transition-colors ${selectedReportId === report.id ? 'bg-purple-900/40 text-purple-300' : 'hover:bg-purple-900/30 text-gray-600 hover:text-purple-400'}`}>
                          <CheckCircle size={14} />
                        </button>
                        <button onClick={() => { setEditReport(report); setShowForm(true); }} className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-200">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteHealthReport(report.id)} className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-600 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── DIAGNOSE TAB ──────────────────────────────────────────────── */}
      {tab === 'diagnose' && (
        <div className="space-y-4">
          {/* Config */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-semibold text-gray-100 mb-3">診斷設定</p>

              {/* Selected report */}
              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">使用健康報告</label>
                {sortedReports.length === 0 ? (
                  <p className="text-xs text-red-400">請先在「健康報告」tab 新增檢查數據</p>
                ) : (
                  <select
                    value={selectedReport?.id || ''}
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                  >
                    {sortedReports.map((r) => (
                      <option key={r.id} value={r.id}>{r.date}（{countFilled(r)} 項）</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Analysis period */}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">分析最近幾天的飲食與運動</label>
                <div className="flex gap-2">
                  {[14, 30, 60, 90].map((d) => (
                    <button key={d} onClick={() => setAnalysisDays(d)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${analysisDays === d ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                      {d}天
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status check */}
          {(() => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - analysisDays);
            const cutoffStr = cutoff.toISOString().slice(0, 10);
            const recentSupp = supplementEntries.filter((e) => e.date >= cutoffStr);
            const suppDays = new Set(recentSupp.map((e) => e.date)).size;
            const suppAdherence = Math.round((suppDays / analysisDays) * 100);
            const hasSupplements = recentSupp.length > 0;

            const items = [
              { label: '個人資料', ok: !!profile, detail: profile ? `${profile.goal === 'lose' ? '減脂' : '增肌'}目標` : '未設定' },
              { label: '健康報告', ok: !!selectedReport, detail: selectedReport ? `${countFilled(selectedReport)}項數據` : '未選擇' },
              { label: '飲食紀錄', ok: foodEntries.length > 0, detail: `${foodEntries.length}筆` },
              { label: '體重紀錄', ok: weightEntries.length > 0, detail: `${weightEntries.length}筆` },
              { label: '補充品紀錄', ok: hasSupplements, detail: hasSupplements ? `打卡率 ${suppAdherence}%` : '未記錄' },
            ];

            return (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {items.map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 p-2.5 rounded-xl ${item.ok ? 'bg-emerald-950/30' : 'bg-gray-700/50'}`}>
                    {item.ok ? <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" /> : <AlertTriangle size={14} className="text-gray-500 flex-shrink-0" />}
                    <div>
                      <p className={`font-medium ${item.ok ? 'text-emerald-400' : 'text-gray-400'}`}>{item.label}</p>
                      <p className="text-gray-500">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {diagError && <p className="text-xs text-red-500 text-center">{diagError}</p>}

          {/* Run button */}
          <button
            onClick={runDiagnosis}
            disabled={diagnosing || !selectedReport || !profile}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50 transition-all"
          >
            {diagnosing ? (
              <><Loader2 size={20} className="animate-spin" /> AI 深度分析中（約30秒）...</>
            ) : (
              <><Sparkles size={20} /> 開始 AI 健康診斷</>
            )}
          </button>

          {/* Result */}
          {diagnosis && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain size={16} className="text-purple-600" />
                <span className="text-sm font-semibold text-gray-200">AI 診斷報告</span>
              </div>
              <DiagnosisResult text={diagnosis} />
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setEditReport(null); setShowForm(true); }}
        className="fixed bottom-20 right-5 w-14 h-14 bg-purple-500 hover:bg-purple-600 rounded-full shadow-lg flex items-center justify-center text-white transition-colors"
      >
        <Plus size={24} />
      </button>

      {showForm && (
        <ReportForm
          initial={editReport || undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditReport(null); }}
        />
      )}
    </div>
  );
}

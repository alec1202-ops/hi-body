'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Trash2, Plus } from 'lucide-react';
import type { HealthCheckEntry } from '@/types';

// ─── Reference ranges (male adult) ───────────────────────────────────────────
type Range = { min?: number; max?: number; label: string; unit: string };

const RANGES: Record<string, Range> = {
  fastingGlucose: { min: 70,   max: 100,  label: '飯前血糖',      unit: 'mg/dL' },
  hba1c:          {             max: 5.7,  label: 'HbA1C',         unit: '%' },
  insulin:        { min: 2,    max: 17,   label: '胰島素IRI',      unit: 'uIU/ml' },
  homaIr:         {             max: 1.4,  label: '胰島素阻抗',    unit: '' },
  triglyceride:   {             max: 150,  label: '三酸甘油脂',    unit: 'mg/dL' },
  cholesterol:    {             max: 200,  label: '總膽固醇',      unit: 'mg/dL' },
  hdl:            { min: 40,              label: 'HDL 好膽固醇',  unit: 'mg/dL' },
  ldl:            {             max: 140,  label: 'LDL 壞膽固醇',  unit: 'mg/dL' },
  cholHdlRatio:   {             max: 5,    label: '膽固醇/HDL',    unit: '' },
  ldlHdlRatio:    {             max: 3,    label: 'LDL/HDL',       unit: '' },
  sgot:           { min: 8,    max: 38,   label: 'SGOT(AST)',      unit: 'U/L' },
  sgpt:           { min: 4,    max: 44,   label: 'SGPT(ALT)',      unit: 'U/L' },
  ggt:            {             max: 73,   label: 'r-GT',           unit: 'U/L' },
  alp:            { min: 43,   max: 115,  label: 'ALP',            unit: 'U/L' },
  bun:            { min: 6,    max: 20,   label: '尿素氮(BUN)',    unit: 'mg/dL' },
  creatinine:     { min: 0.68, max: 1.17, label: '肌酸酐(CRE)',   unit: 'mg/dL' },
  egfr:           { min: 90,              label: 'eGFR',           unit: '' },
  homocysteine:   { min: 5.46, max: 16.2, label: '同半胱胺酸',    unit: 'umol/L' },
  hsCrp:          {             max: 3,    label: 'hs-CRP',         unit: 'mg/L' },
  ldh:            { min: 124,  max: 222,  label: 'LDH',            unit: 'U/L' },
  uricAcid:       {             max: 7,    label: '尿酸(UA)',       unit: 'mg/dL' },
  bodyFatPct:     { min: 10,   max: 20,   label: '體脂肪%',        unit: '%' },
  psa:            {             max: 4,    label: 'PSA',            unit: 'ng/mL' },
};

function isAbnormal(key: string, value: number): boolean {
  const r = RANGES[key];
  if (!r) return false;
  if (r.min !== undefined && value < r.min) return true;
  if (r.max !== undefined && value > r.max) return true;
  return false;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  );
}

// ─── Recommendations engine ───────────────────────────────────────────────────
function buildRecommendations(e: HealthCheckEntry) {
  const recs: { category: string; color: string; items: string[] }[] = [];

  const highTG = (e.triglyceride ?? 0) > 150;
  const lowHDL = (e.hdl ?? 999) < 40;
  const highInsulinRes = (e.homaIr ?? 0) > 1.4;
  const highBF = (e.bodyFatPct ?? 0) > 20;
  const highLiver = (e.sgot ?? 0) > 38 || (e.sgpt ?? 0) > 44;
  const highUA = (e.uricAcid ?? 0) > 7;
  const highChol = (e.cholesterol ?? 0) > 200;
  const highLDL = (e.ldl ?? 0) > 140;

  if (highInsulinRes || highTG || lowHDL) {
    recs.push({
      category: '🔴 代謝症候群（最優先）',
      color: 'border-red-700/40 bg-red-900/20',
      items: [
        '有氧運動每週 ≥150 分鐘：游泳、快走、自行車效果最好',
        '重訓每週 2–3 次：增加肌肉量可提升胰島素敏感性',
        '飲食：大幅減少白米飯、麵食、麵包等精製澱粉',
        '飲食：戒除含糖飲料、果汁、珍珠奶茶',
        '飲食：每餐先吃蔬菜和蛋白質，澱粉最後吃（降血糖波動）',
        '體重每減少 5–10%，胰島素阻抗可顯著改善',
      ],
    });
  }

  if (highTG || highChol || highLDL || lowHDL) {
    recs.push({
      category: '🔴 血脂異常',
      color: 'border-orange-700/40 bg-orange-900/20',
      items: [
        '三酸甘油脂偏高：減少精製澱粉和酒精是最有效方法',
        'HDL 偏低：有氧運動是提升 HDL 最有效的方式',
        '補充 Omega-3 魚油（EPA+DHA ≥1g/天）',
        '以橄欖油取代沙拉油，增加堅果（無鹽）攝取',
        '避免反式脂肪（酥油、植物性奶精、加工食品）',
        '若 3 個月飲食運動後無改善，建議就醫評估是否需藥物',
      ],
    });
  }

  if (highLiver) {
    recs.push({
      category: '🔴 肝功能（疑似脂肪肝）',
      color: 'border-yellow-700/40 bg-yellow-900/20',
      items: [
        'SGOT、SGPT 升高常與體脂肪過高（脂肪肝）相關',
        '減重是改善脂肪肝最有效的方式（體重降 7% 可顯著改善）',
        '完全戒酒或極少量（若有飲酒習慣）',
        '避免熬夜，肝臟在夜間修復最活躍',
        '不要自行服用不明保健品或中草藥（加重肝臟負擔）',
        '建議 3 個月後複查肝功能',
      ],
    });
  }

  if (highUA) {
    recs.push({
      category: '🟡 尿酸偏高（痛風風險）',
      color: 'border-yellow-600/40 bg-yellow-900/10',
      items: [
        '每天喝水 2–3 公升，幫助尿酸排出',
        '減少高嘌呤食物：內臟、蛤蠣、蝦、鮪魚、沙丁魚',
        '啤酒是痛風最大誘因，建議完全戒除',
        '果糖會促進尿酸合成，減少含糖飲料',
        '運動後充分補水，避免劇烈無氧運動（會暫時升高尿酸）',
      ],
    });
  }

  recs.push({
    category: '✅ 整體運動計畫建議',
    color: 'border-emerald-700/40 bg-emerald-900/20',
    items: [
      '週一/三/五：游泳或騎自行車 45–60 分鐘（有氧為主）',
      '週二/四：重訓課（健身房，針對大肌群：深蹲、硬舉、划船）',
      '週六：長距離跑步或健行',
      '週日：拉筋、瑜伽或休息',
      '飯後 30 分鐘散步 10–15 分鐘，降低飯後血糖',
      '目標：3 個月內體重降至 78 kg，體脂降至 24%',
    ],
  });

  return recs;
}

// ─── Single entry detail view ─────────────────────────────────────────────────
function EntryDetail({ entry, onClose, onDelete }: {
  entry: HealthCheckEntry;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<'data' | 'recs'>('data');
  const recs = buildRecommendations(entry);

  const groups: { title: string; keys: (keyof HealthCheckEntry)[] }[] = [
    { title: '糖尿病 / 代謝', keys: ['fastingGlucose', 'hba1c', 'insulin', 'homaIr'] },
    { title: '血脂肪', keys: ['triglyceride', 'cholesterol', 'hdl', 'ldl', 'cholHdlRatio', 'ldlHdlRatio'] },
    { title: '肝功能', keys: ['sgot', 'sgpt', 'ggt', 'alp'] },
    { title: '腎功能', keys: ['bun', 'creatinine', 'egfr'] },
    { title: '心血管', keys: ['homocysteine', 'hsCrp', 'ldh'] },
    { title: '其他', keys: ['uricAcid', 'bodyFatPct', 'psa'] },
  ];

  const abnormalCount = Object.entries(RANGES).filter(([k]) => {
    const v = entry[k as keyof HealthCheckEntry];
    return typeof v === 'number' && isAbnormal(k, v);
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
      <div className="px-4 pt-12 pb-3 border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-sm text-gray-400">← 返回</button>
          <p className="text-sm font-bold text-white">
            {format(new Date(entry.date + 'T00:00:00'), 'yyyy年M月d日', { locale: zhTW })}
          </p>
          <button onClick={onDelete} className="text-gray-600 hover:text-red-400">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${abnormalCount > 0 ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/40 text-emerald-400'}`}>
            {abnormalCount} 項異常
          </span>
          {entry.notes && <p className="text-xs text-gray-500 truncate">{entry.notes}</p>}
        </div>
        <div className="flex gap-1 bg-gray-700/60 rounded-xl p-1">
          <button onClick={() => setTab('data')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'data' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
            檢驗數值
          </button>
          <button onClick={() => setTab('recs')} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === 'recs' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}>
            運動飲食建議
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
        {tab === 'data' ? (
          groups.map(({ title, keys }) => {
            const rows = keys.filter((k) => entry[k] !== undefined && entry[k] !== null);
            if (rows.length === 0) return null;
            return (
              <div key={title} className="bg-gray-800 rounded-2xl overflow-hidden">
                <p className="text-xs font-semibold text-gray-400 px-4 py-3 border-b border-gray-700/50">{title}</p>
                <div className="divide-y divide-gray-700/30">
                  {rows.map((k) => {
                    const val = entry[k] as number;
                    const r = RANGES[k as string];
                    const bad = isAbnormal(k as string, val);
                    const rangeStr = r ? `${r.min !== undefined ? r.min : ''}${r.min !== undefined && r.max !== undefined ? '–' : r.max !== undefined ? '<' : '>'}${r.max ?? r.min ?? ''}` : '';
                    return (
                      <div key={k as string} className="flex items-center gap-3 px-4 py-2.5">
                        <StatusDot ok={!bad} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-300">{r?.label ?? k as string}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-semibold tabular-nums ${bad ? 'text-red-400' : 'text-white'}`}>
                            {val}
                          </span>
                          {r?.unit && <span className="text-xs text-gray-500 ml-1">{r.unit}</span>}
                          {rangeStr && <p className="text-[10px] text-gray-600">{rangeStr}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-4">
            {recs.map(({ category, color, items }) => (
              <div key={category} className={`rounded-2xl border p-4 ${color}`}>
                <p className="text-sm font-bold text-white mb-3">{category}</p>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-2">
                      <span className="text-gray-500 flex-shrink-0">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HealthPage() {
  const { healthChecks, deleteHealthCheck } = useAppStore();
  const [selected, setSelected] = useState<HealthCheckEntry | null>(null);

  const sorted = [...healthChecks].sort((a, b) => b.date.localeCompare(a.date));

  if (selected) {
    return (
      <EntryDetail
        entry={selected}
        onClose={() => setSelected(null)}
        onDelete={() => { deleteHealthCheck(selected.id); setSelected(null); }}
      />
    );
  }

  return (
    <div className="page-container px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-white">健康檢查</h1>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">🏥</p>
          <p className="text-sm text-gray-400">尚無健康檢查記錄</p>
          <p className="text-xs text-gray-600 mt-1">請使用匯入頁面新增</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((e) => {
            const abnormal = Object.entries(RANGES).filter(([k]) => {
              const v = e[k as keyof HealthCheckEntry];
              return typeof v === 'number' && isAbnormal(k, v);
            });
            return (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                className="w-full bg-gray-800 rounded-2xl p-4 text-left hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-white">
                    {format(new Date(e.date + 'T00:00:00'), 'yyyy年M月d日', { locale: zhTW })}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${abnormal.length > 0 ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/40 text-emerald-400'}`}>
                    {abnormal.length} 項異常
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {abnormal.slice(0, 6).map(([k]) => (
                    <span key={k} className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded-md">
                      {RANGES[k]?.label}
                    </span>
                  ))}
                  {abnormal.length > 6 && (
                    <span className="text-[10px] text-gray-500">+{abnormal.length - 6} 項</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

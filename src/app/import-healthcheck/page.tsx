'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

// 健康檢查報告 — 陳立志 L49A15B11
const ENTRY = {
  date: '2026-11-19',
  // 糖尿病 / 代謝
  fastingGlucose: 100,
  hba1c: 5.7,
  insulin: 17.54,
  homaIr: 4.33,
  // 血脂
  triglyceride: 254,
  cholesterol: 262,
  hdl: 38,
  ldl: 194,
  cholHdlRatio: 6.9,
  ldlHdlRatio: 5.1,
  // 肝功能
  sgot: 42,
  sgpt: 55,
  ggt: 31,
  alp: 110,
  // 腎功能
  bun: 13.7,
  creatinine: 1.05,
  egfr: 88.66,
  // 心血管
  homocysteine: 10.98,
  hsCrp: 1.48,
  ldh: 245,
  // 其他
  uricAcid: 7.2,
  bodyFatPct: 27.7,
  psa: 1.834,
  notes: '竇性心搏過慢、輕度三尖瓣膜閉鎖不全、疑輕度下肢動脈硬化、高頻聽力障礙（雙耳）',
};

const NORMAL_RANGES: Record<string, string> = {
  fastingGlucose: '70–100',
  hba1c: '<5.7',
  insulin: '2–17',
  homaIr: '0.5–1.4',
  triglyceride: '<150',
  cholesterol: '≤200',
  hdl: '>40',
  ldl: '<140',
  cholHdlRatio: '0–5',
  ldlHdlRatio: '0–3',
  sgot: '8–38',
  sgpt: '4–44',
  ggt: '<73',
  alp: '43–115',
  bun: '6–20',
  creatinine: '0.68–1.17',
  egfr: '>90',
  homocysteine: '5.46–16.2',
  hsCrp: '<3',
  ldh: '124–222',
  uricAcid: '<7',
  bodyFatPct: '10–20',
  psa: '≤4',
};

const LABELS: Record<string, string> = {
  fastingGlucose: '飯前血糖',
  hba1c: 'HbA1C',
  insulin: '胰島素IRI',
  homaIr: '胰島素阻抗',
  triglyceride: '三酸甘油脂',
  cholesterol: '總膽固醇',
  hdl: 'HDL',
  ldl: 'LDL',
  cholHdlRatio: '膽固醇/HDL',
  ldlHdlRatio: 'LDL/HDL',
  sgot: 'SGOT(AST)',
  sgpt: 'SGPT(ALT)',
  ggt: 'r-GT',
  alp: 'ALP',
  bun: '尿素氮',
  creatinine: '肌酸酐',
  egfr: 'eGFR',
  homocysteine: '同半胱胺酸',
  hsCrp: 'hs-CRP',
  ldh: 'LDH',
  uricAcid: '尿酸',
  bodyFatPct: '體脂肪%',
  psa: 'PSA',
};

function isRed(key: string, value: number): boolean {
  const ranges: Record<string, { min?: number; max?: number }> = {
    fastingGlucose: { min: 70, max: 100 },
    hba1c: { max: 5.7 },
    insulin: { min: 2, max: 17 },
    homaIr: { max: 1.4 },
    triglyceride: { max: 150 },
    cholesterol: { max: 200 },
    hdl: { min: 40 },
    ldl: { max: 140 },
    cholHdlRatio: { max: 5 },
    ldlHdlRatio: { max: 3 },
    sgot: { min: 8, max: 38 },
    sgpt: { min: 4, max: 44 },
    ggt: { max: 73 },
    alp: { min: 43, max: 115 },
    egfr: { min: 90 },
    ldh: { min: 124, max: 222 },
    uricAcid: { max: 7 },
    bodyFatPct: { max: 20 },
  };
  const r = ranges[key];
  if (!r) return false;
  if (r.min !== undefined && value < r.min) return true;
  if (r.max !== undefined && value > r.max) return true;
  return false;
}

export default function ImportHealthCheckPage() {
  const { addHealthCheck } = useAppStore();
  const router = useRouter();
  const [done, setDone] = useState(false);

  function handleImport() {
    addHealthCheck({ ...ENTRY, id: crypto.randomUUID() });
    setDone(true);
    setTimeout(() => router.push('/health'), 1200);
  }

  const entries = Object.entries(ENTRY).filter(([k]) => k !== 'date' && k !== 'notes' && typeof ENTRY[k as keyof typeof ENTRY] === 'number');
  const redCount = entries.filter(([k, v]) => isRed(k, v as number)).length;

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-10">
      <div className="max-w-sm mx-auto">
        <h1 className="text-lg font-bold text-white mb-0.5">匯入健康檢查報告</h1>
        <p className="text-xs text-gray-400 mb-5">陳立志 · 2026-11-19 · {redCount} 項紅字</p>

        <div className="bg-gray-800 rounded-2xl overflow-hidden mb-4">
          <div className="divide-y divide-gray-700/30">
            {entries.map(([k, v]) => {
              const red = isRed(k, v as number);
              return (
                <div key={k} className="flex items-center gap-2 px-4 py-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${red ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="text-xs text-gray-300 flex-1">{LABELS[k] ?? k}</span>
                  <span className={`text-sm font-semibold tabular-nums ${red ? 'text-red-400' : 'text-white'}`}>{v as number}</span>
                  <span className="text-[10px] text-gray-600 w-16 text-right">{NORMAL_RANGES[k] ?? ''}</span>
                </div>
              );
            })}
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500">{ENTRY.notes}</p>
            </div>
          </div>
        </div>

        {done ? (
          <p className="text-center text-emerald-400 font-semibold py-3">✅ 匯入成功，跳轉中…</p>
        ) : (
          <button
            onClick={handleImport}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors"
          >
            確認匯入 ({redCount} 項紅字)
          </button>
        )}
      </div>
    </div>
  );
}

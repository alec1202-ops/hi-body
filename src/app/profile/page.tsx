'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { User, CheckCircle, LogOut, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { APP_VERSION, APP_BUILD_DATE } from '@/lib/version';
import type { UserProfile } from '@/types';

// NumInput: keeps a local string so the user can edit freely; only commits the
// parsed number when they leave the field (onBlur).
function NumInput({
  value,
  onChange,
  placeholder,
  decimal = false,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  decimal?: boolean;
  className?: string;
}) {
  const [str, setStr] = useState(value > 0 ? String(value) : '');

  // Keep in sync when parent reloads (e.g. profile loaded from cloud)
  useEffect(() => {
    setStr(value > 0 ? String(value) : '');
  }, [value]);

  function commit(raw: string) {
    const v = decimal ? parseFloat(raw) : parseInt(raw);
    if (!isNaN(v) && v > 0) onChange(v);
  }

  return (
    <input
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      pattern={decimal ? '[0-9.]*' : '[0-9]*'}
      value={str}
      placeholder={placeholder}
      onChange={(e) => setStr(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      className={className}
    />
  );
}

export default function ProfilePage() {
  const { profile, setProfile, weightEntries, workoutEntries } = useAppStore();
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<UserProfile>({
    name: '', age: 25, gender: 'male', height: 170, weight: 70, targetWeight: 65,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSave() {
    setProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const bmi = form.height > 0 ? form.weight / ((form.height / 100) ** 2) : 0;
  const targetBmi = form.height > 0 ? form.targetWeight / ((form.height / 100) ** 2) : 0;
  const bmiLabel = (v: number) => v < 18.5 ? '過輕' : v < 24 ? '正常' : v < 27 ? '過重' : '肥胖';
  const bmiColor = (v: number) => v < 18.5 ? 'text-blue-400' : v < 24 ? 'text-emerald-400' : v < 27 ? 'text-yellow-400' : 'text-red-400';

  function handleExportWeight() {
    const rows = [['日期', '體重(kg)', '體脂(%)', '骨骼肌肉量(kg)', '備註']];
    [...weightEntries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => rows.push([e.date, String(e.weight), String(e.bodyFat ?? ''), String(e.muscleMass ?? ''), e.notes ?? '']));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hi-body-weight-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportWorkout() {
    const rows = [['日期', '運動類型', '實際類型', '時長(分鐘)', '游泳距離(m)', '跑步距離(km)', '騎車距離(km)', '備註']];
    [...workoutEntries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => rows.push([
        e.date, e.type, e.actualType ?? '', String(e.duration),
        String(e.swimDistance ?? ''), String(e.runDistance ?? ''), String(e.cyclingDistance ?? ''),
        e.notes ?? '',
      ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hi-body-workout-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400';

  return (
    <div className="page-container px-4 pt-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-900/40 rounded-2xl flex items-center justify-center">
            <User size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">我的</h1>
            <p className="text-xs text-gray-500">{user?.email ?? '個人資料與設定'}</p>
          </div>
        </div>
        <button onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-xl transition-colors">
          <LogOut size={14} /> 登出
        </button>
      </div>

      {/* Basic info */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4 space-y-4">
        <p className="text-xs font-semibold text-gray-400">基本資料</p>

        <div>
          <p className="text-xs text-gray-400 mb-1.5">姓名（選填）</p>
          <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
            placeholder="你的名字" className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">性別</p>
            <div className="flex gap-2">
              {(['male', 'female'] as const).map((g) => (
                <button key={g} onClick={() => update('gender', g)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${form.gender === g ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                  {g === 'male' ? '男 ♂' : '女 ♀'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">年齡</p>
            <NumInput value={form.age} onChange={(v) => update('age', v)} placeholder="25" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">身高 (cm)</p>
            <NumInput value={form.height} onChange={(v) => update('height', v)} placeholder="170" className={inputCls} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">體重 (kg)</p>
            <NumInput value={form.weight} onChange={(v) => update('weight', v)} placeholder="70" decimal className={inputCls} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">目標 (kg)</p>
            <NumInput value={form.targetWeight} onChange={(v) => update('targetWeight', v)} placeholder="65" decimal className={inputCls} />
          </div>
        </div>
      </div>

      {/* BMI */}
      {bmi > 0 && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-3">BMI 計算</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className={`text-2xl font-bold ${bmiColor(bmi)}`}>{bmi.toFixed(1)}</p>
              <p className={`text-xs mt-0.5 ${bmiColor(bmi)}`}>{bmiLabel(bmi)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">目前 · {form.weight} kg</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${bmiColor(targetBmi)}`}>{targetBmi.toFixed(1)}</p>
              <p className={`text-xs mt-0.5 ${bmiColor(targetBmi)}`}>{bmiLabel(targetBmi)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">目標 · {form.targetWeight} kg</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 text-center mt-3">正常範圍：18.5–24（衛福部台灣標準）</p>
        </div>
      )}

      {/* Export */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 mb-3">資料匯出 CSV</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleExportWeight}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors">
            <Download size={14} /> 體重記錄
          </button>
          <button onClick={handleExportWorkout}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors">
            <Download size={14} /> 運動記錄
          </button>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave}
        className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mb-4">
        {saved ? <><CheckCircle size={18} /> 儲存成功！</> : '儲存設定'}
      </button>

      <p className="text-center text-xs text-gray-600 mb-6">
        Hi Body v{APP_VERSION} · {APP_BUILD_DATE}
      </p>
    </div>
  );
}

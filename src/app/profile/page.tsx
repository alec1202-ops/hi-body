'use client';

import { useState, useEffect } from 'react';
import { useAppStore, calculateTDEE } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/types';
import { User, Zap, Target, TrendingDown, TrendingUp, Minus, CheckCircle, LogOut, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { APP_VERSION, APP_BUILD_DATE } from '@/lib/version';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: '久坐', desc: '幾乎不運動' },
  { value: 'light', label: '輕量', desc: '每週 1-3 天運動' },
  { value: 'moderate', label: '中等', desc: '每週 3-5 天運動' },
  { value: 'active', label: '活躍', desc: '每週 6-7 天運動' },
  { value: 'very_active', label: '非常活躍', desc: '體力勞動或每天高強度訓練' },
] as const;

const GOAL_OPTIONS = [
  { value: 'lose', label: '減脂', icon: TrendingDown, color: 'text-orange-400', activeBg: 'bg-orange-950/40 border-orange-700' },
  { value: 'maintain', label: '維持', icon: Minus, color: 'text-blue-400', activeBg: 'bg-blue-950/40 border-blue-700' },
  { value: 'gain', label: '增肌', icon: TrendingUp, color: 'text-emerald-400', activeBg: 'bg-emerald-950/40 border-emerald-700' },
] as const;

export default function ProfilePage() {
  const { profile, setProfile, foodEntries, exerciseEntries, weightEntries, waterEntries, healthReports } = useAppStore();
  const { user, signOut } = useAuth();
  const [form, setForm] = useState<Partial<UserProfile>>({
    name: '',
    age: 25,
    gender: 'male',
    height: 170,
    weight: 70,
    targetWeight: 65,
    activityLevel: 'moderate',
    goal: 'lose',
    dailyCalorieTarget: 0,
    dailyProteinTarget: 0,
    dailyWaterTarget: 2000,
    customBMR: undefined,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const previewProfile = { ...form } as UserProfile;
  const autoBMR = form.age && form.weight && form.height
    ? (() => {
        const { weight, height, age, gender } = form;
        const base = 10 * (weight || 0) + 6.25 * (height || 0) - 5 * (age || 0);
        return Math.round(gender === 'male' ? base + 5 : base - 161);
      })()
    : 0;
  const tdee = form.age && form.weight && form.height ? calculateTDEE(previewProfile) : 0;

  const suggestedCalories = tdee > 0
    ? form.goal === 'lose' ? tdee - 500
      : form.goal === 'gain' ? tdee + 300
      : tdee
    : 0;

  const suggestedProtein = form.weight
    ? form.goal === 'gain' ? Math.round(form.weight * 2.2)
      : Math.round(form.weight * 1.8)
    : 0;

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  type ExportType = 'food' | 'exercise' | 'weight' | 'water' | 'health';
  const [exportTypes, setExportTypes] = useState<Set<ExportType>>(new Set(['food', 'exercise', 'weight', 'water']));
  const [exportRange, setExportRange] = useState<'all' | '30' | '90' | '365'>('all');

  function toggleExportType(t: ExportType) {
    setExportTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function toCSV(rows: string[][]): string {
    return rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  }

  function downloadCSV(filename: string, content: string) {
    const blob = new Blob(['﻿' + content, ''], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    const cutoff = exportRange === 'all' ? '' : (() => {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(exportRange));
      return d.toISOString().slice(0, 10);
    })();
    const inRange = (date: string) => !cutoff || date >= cutoff;
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    if (exportTypes.has('food')) {
      const rows = [['日期', '餐別', '名稱', '分類', '熱量(kcal)', '蛋白質(g)', '碳水(g)', '脂肪(g)', '份量', 'AI估算', '時間戳']];
      foodEntries.filter((e) => inRange(e.date)).sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
        rows.push([e.date, e.mealType, e.name, e.category, String(e.nutrition.calories), String(e.nutrition.protein), String(e.nutrition.carbs), String(e.nutrition.fat), e.servingSize, e.estimatedByAI ? '是' : '否', e.timestamp]);
      });
      downloadCSV(`hi-body-food-${now}.csv`, toCSV(rows));
    }

    if (exportTypes.has('exercise')) {
      const rows = [['日期', '名稱', '類型', '時長(分鐘)', '消耗熱量(kcal)', '備註', '時間戳']];
      exerciseEntries.filter((e) => inRange(e.date)).sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
        rows.push([e.date, e.name, e.type, String(e.duration), String(e.caloriesBurned), e.notes ?? '', e.timestamp]);
      });
      downloadCSV(`hi-body-exercise-${now}.csv`, toCSV(rows));
    }

    if (exportTypes.has('weight')) {
      const rows = [['日期', '體重(kg)', 'BMI', '體脂(%)', '肌肉量(kg)', '骨量(kg)', '體水分(%)', '備註']];
      weightEntries.filter((e) => inRange(e.date)).sort((a, b) => a.date.localeCompare(b.date)).forEach((e) => {
        rows.push([e.date, String(e.weight), String(e.bmi ?? ''), String(e.bodyFat ?? ''), String(e.muscleMass ?? ''), String(e.boneMass ?? ''), String(e.bodyWater ?? ''), e.notes ?? '']);
      });
      downloadCSV(`hi-body-weight-${now}.csv`, toCSV(rows));
    }

    if (exportTypes.has('water')) {
      const rows = [['日期', '飲水量(ml)', '時間戳']];
      waterEntries.filter((e) => inRange(e.date)).sort((a, b) => a.timestamp.localeCompare(b.timestamp)).forEach((e) => {
        rows.push([e.date, String(e.amount), e.timestamp]);
      });
      downloadCSV(`hi-body-water-${now}.csv`, toCSV(rows));
    }

    if (exportTypes.has('health')) {
      const rows = [['日期', '睪固酮', '游離睪固酮', 'TSH', 'T3', 'T4', '皮質醇', '空腹胰島素', '空腹血糖', 'HOMA-IR', '維生素D', '鐵蛋白', '血紅素', 'B12', '鋅', 'RBC鎂', 'hs-CRP', '尿酸', '肌酸激酶', 'AST', 'ALT', '肌酸酐', 'eGFR', '總膽固醇', 'LDL', 'HDL', '三酸甘油酯', '備註']];
      healthReports.filter((r) => inRange(r.date)).sort((a, b) => a.date.localeCompare(b.date)).forEach((r) => {
        rows.push([r.date, String(r.testosterone ?? ''), String(r.freeTestosterone ?? ''), String(r.tsh ?? ''), String(r.t3 ?? ''), String(r.t4 ?? ''), String(r.cortisol ?? ''), String(r.fastingInsulin ?? ''), String(r.fastingGlucose ?? ''), String(r.homaIR ?? ''), String(r.vitaminD ?? ''), String(r.ferritin ?? ''), String(r.hemoglobin ?? ''), String(r.vitaminB12 ?? ''), String(r.zinc ?? ''), String(r.rbcMagnesium ?? ''), String(r.hsCRP ?? ''), String(r.uricAcid ?? ''), String(r.creatineKinase ?? ''), String(r.got ?? ''), String(r.gpt ?? ''), String(r.creatinine ?? ''), String(r.egfr ?? ''), String(r.totalCholesterol ?? ''), String(r.ldl ?? ''), String(r.hdl ?? ''), String(r.triglycerides ?? ''), r.notes ?? '']);
      });
      downloadCSV(`hi-body-health-${now}.csv`, toCSV(rows));
    }
  }

  function handleSave() {
    const profileData: UserProfile = {
      name: form.name || '',
      age: form.age || 25,
      gender: form.gender || 'male',
      height: form.height || 170,
      weight: form.weight || 70,
      targetWeight: form.targetWeight || 65,
      activityLevel: form.activityLevel || 'moderate',
      goal: form.goal || 'lose',
      dailyCalorieTarget: form.dailyCalorieTarget || suggestedCalories,
      dailyProteinTarget: form.dailyProteinTarget || suggestedProtein,
      dailyWaterTarget: form.dailyWaterTarget || 2000,
      customBMR: form.customBMR && form.customBMR > 0 ? form.customBMR : undefined,
    };
    setProfile(profileData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="page-container px-4 pt-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-900/40 rounded-2xl flex items-center justify-center">
            <User size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">個人設定</h1>
            <p className="text-xs text-gray-500">{user?.email ?? '設定資料以計算 BMR 與目標'}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-xl transition-colors"
        >
          <LogOut size={14} /> 登出
        </button>
      </div>

      {/* Basic info */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">基本資料</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <input
            type="text"
            placeholder="姓名（選填）"
            value={form.name || ''}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">性別</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => update('gender', g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${form.gender === g ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-700 text-gray-200 border-gray-600'}`}
                  >
                    {g === 'male' ? '男 ♂' : '女 ♀'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">年齡</label>
              <input
                type="number"
                min={10}
                max={100}
                value={form.age || ''}
                onChange={(e) => update('age', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">身高 (cm)</label>
              <input
                type="number"
                min={100}
                max={250}
                value={form.height || ''}
                onChange={(e) => update('height', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">體重 (kg)</label>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={form.weight || ''}
                onChange={(e) => update('weight', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">目標體重 (kg)</label>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={form.targetWeight || ''}
                onChange={(e) => update('targetWeight', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">活動程度</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update('activityLevel', opt.value)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${form.activityLevel === opt.value ? 'border-emerald-600 bg-emerald-950/40' : 'border-gray-700 bg-gray-700/40 hover:bg-gray-700'}`}
            >
              <span className={`text-sm font-medium ${form.activityLevel === opt.value ? 'text-emerald-400' : 'text-gray-200'}`}>{opt.label}</span>
              <span className="text-xs text-gray-500">{opt.desc}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Goal */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">健身目標</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(({ value, label, icon: Icon, color, activeBg }) => (
              <button
                key={value}
                onClick={() => update('goal', value)}
                className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-colors ${form.goal === value ? activeBg : 'border-gray-700 bg-gray-700/40'}`}
              >
                <Icon size={22} className={form.goal === value ? color : 'text-gray-500'} />
                <span className={`text-sm font-semibold mt-1 ${form.goal === value ? color : 'text-gray-400'}`}>{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BMR Preview */}
      {tdee > 0 && (
        <Card className="mb-4 border-emerald-800 bg-gradient-to-br from-emerald-950/40 to-teal-950/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-300">代謝計算結果</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-100">
                  {form.customBMR && form.customBMR > 0 ? form.customBMR : autoBMR}
                </p>
                <p className="text-xs text-gray-400">BMR</p>
                <p className="text-[10px] text-gray-500">{form.customBMR && form.customBMR > 0 ? '手動設定' : '基礎代謝'}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-400">{tdee}</p>
                <p className="text-xs text-gray-400">TDEE</p>
                <p className="text-[10px] text-gray-500">每日消耗</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-400">{suggestedCalories}</p>
                <p className="text-xs text-gray-400">建議攝入</p>
                <p className="text-[10px] text-gray-500">kcal/天</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BMI */}
      {form.weight && form.height && (
        (() => {
          const h = (form.height || 170) / 100;
          const currentBMI = (form.weight || 70) / (h * h);
          const targetBMI = (form.targetWeight || 65) / (h * h);
          const bmiLabel = (bmi: number) =>
            bmi < 18.5 ? '過輕' : bmi < 24 ? '正常' : bmi < 27 ? '過重' : '肥胖';
          const bmiColor = (bmi: number) =>
            bmi < 18.5 ? 'text-blue-400' : bmi < 24 ? 'text-emerald-400' : bmi < 27 ? 'text-yellow-400' : 'text-red-400';
          return (
            <Card className="mb-4">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">目前 BMI</p>
                    <p className={`text-2xl font-bold ${bmiColor(currentBMI)}`}>{currentBMI.toFixed(1)}</p>
                    <p className={`text-xs mt-0.5 ${bmiColor(currentBMI)}`}>{bmiLabel(currentBMI)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{form.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">目標 BMI</p>
                    <p className={`text-2xl font-bold ${bmiColor(targetBMI)}`}>{targetBMI.toFixed(1)}</p>
                    <p className={`text-xs mt-0.5 ${bmiColor(targetBMI)}`}>{bmiLabel(targetBMI)}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{form.targetWeight} kg</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 text-center mt-3">BMI 正常範圍：18.5 – 24（衛福部台灣標準）</p>
              </CardContent>
            </Card>
          );
        })()
      )}

      {/* Custom targets */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200">每日目標（可自訂）</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              基礎代謝率 BMR (kcal) <span className="text-gray-500">— 自動計算 {autoBMR || '—'}</span>
            </label>
            <input
              type="number"
              min={500}
              max={5000}
              placeholder={autoBMR ? `自動：${autoBMR}（可手動覆蓋）` : '留空則自動計算'}
              value={form.customBMR || ''}
              onChange={(e) => update('customBMR', parseInt(e.target.value) || undefined as unknown as number)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
            {form.customBMR && form.customBMR > 0 && (
              <p className="text-[11px] text-emerald-400 mt-1">
                ✅ 使用手動 BMR：{form.customBMR} kcal（自動計算值：{autoBMR}）
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              每日熱量目標 (kcal) <span className="text-gray-500">— 建議 {suggestedCalories}</span>
            </label>
            <input
              type="number"
              min={500}
              max={5000}
              placeholder={String(suggestedCalories || '例如 2000')}
              value={form.dailyCalorieTarget || ''}
              onChange={(e) => update('dailyCalorieTarget', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              每日蛋白質目標 (g) <span className="text-gray-500">— 建議 {suggestedProtein}g</span>
            </label>
            <input
              type="number"
              min={20}
              max={400}
              placeholder={String(suggestedProtein || '例如 150')}
              value={form.dailyProteinTarget || ''}
              onChange={(e) => update('dailyProteinTarget', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">每日飲水目標 (ml)</label>
            <input
              type="number"
              min={500}
              max={5000}
              step={100}
              placeholder="例如 2000"
              value={form.dailyWaterTarget || ''}
              onChange={(e) => update('dailyWaterTarget', parseInt(e.target.value) || 2000)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-200">資料匯出 (CSV)</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Data type toggles */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'food', label: '飲食' },
              { key: 'exercise', label: '運動' },
              { key: 'weight', label: '體重' },
              { key: 'water', label: '飲水' },
              { key: 'health', label: '健康報告' },
            ] as { key: ExportType; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => toggleExportType(key)}
                className={`py-2 rounded-xl text-xs font-medium border transition-colors ${exportTypes.has(key) ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300' : 'bg-gray-700/40 border-gray-700 text-gray-400'}`}
              >
                {exportTypes.has(key) ? '✓ ' : ''}{label}
              </button>
            ))}
          </div>
          {/* Date range */}
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">時間範圍</label>
            <div className="flex gap-2">
              {([
                { v: 'all', label: '全部' },
                { v: '30', label: '近30天' },
                { v: '90', label: '近90天' },
                { v: '365', label: '近1年' },
              ] as { v: typeof exportRange; label: string }[]).map(({ v, label }) => (
                <button
                  key={v}
                  onClick={() => setExportRange(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${exportRange === v ? 'bg-gray-500 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={exportTypes.size === 0}
            className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={15} /> 下載 CSV ({exportTypes.size} 個檔案)
          </button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full mb-4" size="lg">
        {saved ? (
          <span className="flex items-center gap-2"><CheckCircle size={18} /> 儲存成功！</span>
        ) : '儲存設定'}
      </Button>

      <p className="text-center text-xs text-gray-600 mb-6">
        Hi Body v{APP_VERSION} · {APP_BUILD_DATE}
      </p>
    </div>
  );
}

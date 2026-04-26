'use client';

import { useState, useEffect } from 'react';
import { useAppStore, calculateTDEE } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { UserProfile } from '@/types';
import { User, Zap, Target, TrendingDown, TrendingUp, Minus, CheckCircle } from 'lucide-react';

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: '久坐', desc: '幾乎不運動' },
  { value: 'light', label: '輕量', desc: '每週 1-3 天運動' },
  { value: 'moderate', label: '中等', desc: '每週 3-5 天運動' },
  { value: 'active', label: '活躍', desc: '每週 6-7 天運動' },
  { value: 'very_active', label: '非常活躍', desc: '體力勞動或每天高強度訓練' },
] as const;

const GOAL_OPTIONS = [
  { value: 'lose', label: '減脂', icon: TrendingDown, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  { value: 'maintain', label: '維持', icon: Minus, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  { value: 'gain', label: '增肌', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
] as const;

export default function ProfilePage() {
  const { profile, setProfile } = useAppStore();
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
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const previewProfile = { ...form } as UserProfile;
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
    };
    setProfile(profileData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="page-container px-4 pt-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
          <User size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">個人設定</h1>
          <p className="text-xs text-gray-400">設定資料以計算 BMR 與目標</p>
        </div>
      </div>

      {/* Basic info */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">基本資料</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <input
            type="text"
            placeholder="姓名（選填）"
            value={form.name || ''}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">性別</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => update('gender', g)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${form.gender === g ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {g === 'male' ? '男 ♂' : '女 ♀'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">年齡</label>
              <input
                type="number"
                min={10}
                max={100}
                value={form.age || ''}
                onChange={(e) => update('age', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">身高 (cm)</label>
              <input
                type="number"
                min={100}
                max={250}
                value={form.height || ''}
                onChange={(e) => update('height', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">體重 (kg)</label>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={form.weight || ''}
                onChange={(e) => update('weight', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">目標體重 (kg)</label>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={form.targetWeight || ''}
                onChange={(e) => update('targetWeight', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">活動程度</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update('activityLevel', opt.value)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${form.activityLevel === opt.value ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
            >
              <span className={`text-sm font-medium ${form.activityLevel === opt.value ? 'text-emerald-700' : 'text-gray-700'}`}>{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.desc}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Goal */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">健身目標</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2">
            {GOAL_OPTIONS.map(({ value, label, icon: Icon, color, bg }) => (
              <button
                key={value}
                onClick={() => update('goal', value)}
                className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-colors ${form.goal === value ? bg + ' border-current' : 'border-gray-100 bg-gray-50'}`}
              >
                <Icon size={22} className={form.goal === value ? color : 'text-gray-400'} />
                <span className={`text-sm font-semibold mt-1 ${form.goal === value ? color : 'text-gray-500'}`}>{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BMR Preview */}
      {tdee > 0 && (
        <Card className="mb-4 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">代謝計算結果</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-800">{Math.round(tdee * 0.526)}</p>
                <p className="text-xs text-gray-500">BMR</p>
                <p className="text-[10px] text-gray-400">基礎代謝</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-600">{tdee}</p>
                <p className="text-xs text-gray-500">TDEE</p>
                <p className="text-[10px] text-gray-400">每日消耗</p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-500">{suggestedCalories}</p>
                <p className="text-xs text-gray-500">建議攝入</p>
                <p className="text-[10px] text-gray-400">kcal/天</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom targets */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">每日目標（可自訂）</h2>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              每日熱量目標 (kcal) <span className="text-gray-400">— 建議 {suggestedCalories}</span>
            </label>
            <input
              type="number"
              min={500}
              max={5000}
              placeholder={String(suggestedCalories || '例如 2000')}
              value={form.dailyCalorieTarget || ''}
              onChange={(e) => update('dailyCalorieTarget', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              每日蛋白質目標 (g) <span className="text-gray-400">— 建議 {suggestedProtein}g</span>
            </label>
            <input
              type="number"
              min={20}
              max={400}
              placeholder={String(suggestedProtein || '例如 150')}
              value={form.dailyProteinTarget || ''}
              onChange={(e) => update('dailyProteinTarget', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full mb-6" size="lg">
        {saved ? (
          <span className="flex items-center gap-2"><CheckCircle size={18} /> 儲存成功！</span>
        ) : '儲存設定'}
      </Button>
    </div>
  );
}

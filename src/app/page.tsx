'use client';

import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Flame, Zap, Scale, Plus, Droplets, Utensils, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, calculateTDEE, estimateWeightChange } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function NutrientBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-medium">{Math.round(value)}g / {target}g</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { profile, getDailySummary, foodEntries, exerciseEntries, weightEntries } = useAppStore();

  const summary = getDailySummary(date);
  const tdee = profile ? calculateTDEE(profile) : 0;
  const calorieTarget = profile?.dailyCalorieTarget || tdee;
  const proteinTarget = profile?.dailyProteinTarget || 0;

  const caloriePct = calorieTarget > 0 ? Math.round((summary.totalCaloriesIn / calorieTarget) * 100) : 0;
  const proteinPct = proteinTarget > 0 ? Math.round((summary.totalProtein / proteinTarget) * 100) : 0;

  const dayFood = foodEntries.filter((e) => e.date === date);
  const dayExercise = exerciseEntries.filter((e) => e.date === date);
  const sortedWeights = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date));
  const latestWeight = sortedWeights[0];

  const netCalPerDay = calorieTarget > 0 ? summary.totalCaloriesIn - summary.totalCaloriesOut : 0;
  const monthlyChange = estimateWeightChange(netCalPerDay, 30);
  const isToday = date === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="page-container px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi Body 💪</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isToday ? '今天' : format(new Date(date + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(format(subDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-gray-100 rounded-xl">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isToday ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            今天
          </button>
          <button onClick={() => setDate(format(addDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-gray-100 rounded-xl">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {!profile && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <CardContent className="py-4">
            <p className="text-sm text-emerald-800 font-medium mb-2">👋 歡迎！先設定你的個人資料</p>
            <Link href="/profile">
              <Button size="sm">前往設定</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Calorie Ring */}
      <Card className="mb-4">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                value={caloriePct}
                size={100}
                strokeWidth={10}
                color="#10b981"
                trackColor="#f0fdf4"
                label={`${Math.round(summary.totalCaloriesIn)}`}
                sublabel="kcal"
              />
              <span className="text-xs text-gray-500">攝入熱量</span>
            </div>

            <div className="flex-1 px-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Flame size={16} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">目標</p>
                    <p className="text-sm font-semibold text-gray-800">{calorieTarget}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                    <Zap size={16} className="text-red-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">消耗</p>
                    <p className="text-sm font-semibold text-gray-800">{summary.totalCaloriesOut}</p>
                  </div>
                </div>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">淨卡路里</span>
                <span className={`text-sm font-bold ${summary.netCalories > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                  {summary.netCalories > 0 ? '+' : ''}{Math.round(summary.netCalories)} kcal
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <ProgressRing
                value={proteinPct}
                size={100}
                strokeWidth={10}
                color="#6366f1"
                trackColor="#eef2ff"
                label={`${Math.round(summary.totalProtein)}`}
                sublabel="g 蛋白"
              />
              <span className="text-xs text-gray-500">蛋白質</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Macros */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-700">今日宏量營養素</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <NutrientBar label="蛋白質 🥩" value={summary.totalProtein} target={proteinTarget || 150} color="#6366f1" />
          <NutrientBar label="碳水化合物 🍚" value={summary.totalCarbs} target={Math.round(calorieTarget * 0.45 / 4) || 200} color="#f59e0b" />
          <NutrientBar label="脂肪 🥑" value={summary.totalFat} target={Math.round(calorieTarget * 0.3 / 9) || 60} color="#ec4899" />
        </CardContent>
      </Card>

      {/* Weight + Prediction */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale size={16} className="text-blue-500" />
              <span className="text-xs text-gray-500">最新體重</span>
            </div>
            {latestWeight ? (
              <>
                <p className="text-2xl font-bold text-gray-800">
                  {latestWeight.weight} <span className="text-sm font-normal text-gray-500">kg</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{latestWeight.date}</p>
              </>
            ) : (
              <Link href="/progress">
                <Button variant="ghost" size="sm" className="text-xs p-0 h-auto mt-1">
                  <Plus size={12} /> 記錄體重
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-500" />
              <span className="text-xs text-gray-500">月預測變化</span>
            </div>
            {profile ? (
              <>
                <p className={`text-2xl font-bold ${monthlyChange > 0 ? 'text-orange-500' : 'text-emerald-600'}`}>
                  {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(2)} <span className="text-sm font-normal text-gray-500">kg</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {monthlyChange < -0.5 ? '減脂中 🔥' : monthlyChange > 0.5 ? '增肌中 💪' : '維持體重 ✅'}
                </p>
              </>
            ) : (
              <p className="text-xs text-gray-400 mt-1">請先設定個人資料</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's meals */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">今日飲食</h2>
            <Link href="/food">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Plus size={14} /> 新增
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {dayFood.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">尚未記錄飲食</p>
          ) : (
            <div className="space-y-2">
              {dayFood.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    {entry.category === 'liquid' ? (
                      <Droplets size={14} className="text-blue-400" />
                    ) : (
                      <Utensils size={14} className="text-gray-400" />
                    )}
                    <span className="text-sm text-gray-700 truncate max-w-[150px]">{entry.name}</span>
                    {entry.estimatedByAI && <Badge color="purple" className="text-[10px]">AI</Badge>}
                  </div>
                  <span className="text-xs font-medium text-gray-500">{entry.nutrition.calories} kcal</span>
                </div>
              ))}
              {dayFood.length > 4 && (
                <Link href="/food" className="block text-xs text-center text-emerald-600 pt-1">
                  查看全部 {dayFood.length} 筆 →
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's exercise */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">今日運動</h2>
            <Link href="/exercise">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Plus size={14} /> 新增
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {dayExercise.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">尚未記錄運動</p>
          ) : (
            <div className="space-y-2">
              {dayExercise.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{entry.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{entry.duration} 分鐘</span>
                    <span className="text-xs font-medium text-orange-500">-{entry.caloriesBurned} kcal</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

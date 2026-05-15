'use client';

import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Flame, Zap, Scale, Plus, Droplets, Utensils, TrendingUp, Minus } from 'lucide-react';
import Link from 'next/link';
import { useAppStore, calculateTDEE, getStreak, linearRegressionMonthlyChange, getProteinCalorieFactor } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

function NutrientBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="font-medium">{Math.round(value)}g / {target}g</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const QUICK_ADD_ML = [150, 250, 350, 500];

export default function DashboardPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { profile, getDailySummary, foodEntries, exerciseEntries, weightEntries, waterEntries, addWaterEntry, deleteWaterEntry, tdeeReminderDismissedWeight, dismissTdeeReminder } = useAppStore();
  const sortedWeightsAll = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));

  const summary = getDailySummary(date);
  const tdee = profile ? calculateTDEE(profile) : 0;
  const calorieTarget = profile?.dailyCalorieTarget || tdee;
  const proteinTarget = profile?.dailyProteinTarget || 0;

  const caloriePct = calorieTarget > 0 ? Math.round((summary.totalCaloriesIn / calorieTarget) * 100) : 0;

  const streak = getStreak(foodEntries);
  const dayFood = foodEntries.filter((e) => e.date === date);
  const dayExercise = exerciseEntries.filter((e) => e.date === date);
  const dayWater = waterEntries.filter((e) => e.date === date);
  const totalWaterMl = dayWater.reduce((s, e) => s + e.amount, 0);
  const waterTarget = profile?.dailyWaterTarget ?? 2000;
  const waterPct = Math.min(100, Math.round((totalWaterMl / waterTarget) * 100));

  const sortedWeights = [...weightEntries].sort((a, b) => b.date.localeCompare(a.date));
  const latestWeight = sortedWeights[0];

  // Linear regression (primary model)
  const regressionResult = linearRegressionMonthlyChange(sortedWeightsAll);
  // Protein/strength factor for calorie model
  const { factor: calorieFactor } = getProteinCalorieFactor(foodEntries, exerciseEntries, profile);

  const weightDiff = latestWeight && profile ? Math.abs(latestWeight.weight - profile.weight) : 0;
  const showTdeeReminder = weightDiff >= 3 && (
    tdeeReminderDismissedWeight === null ||
    Math.abs(latestWeight!.weight - tdeeReminderDismissedWeight) >= 1
  );

  function handleAddWater(ml: number) {
    const now = new Date();
    addWaterEntry({
      id: `water-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      amount: ml,
      timestamp: now.toISOString(),
    });
  }

  function handleDeleteLastWater() {
    if (dayWater.length === 0) return;
    const last = [...dayWater].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    deleteWaterEntry(last.id);
  }

  const isToday = date === format(new Date(), 'yyyy-MM-dd');

  function dateLabel(dateStr: string): string {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return format(new Date(dateStr + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW });
  }

  // Monthly prediction: require 7 consecutive days with food records
  const loggedDates = new Set(foodEntries.map((e) => e.date));
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const sevenDayWindow: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(new Date(todayStr + 'T00:00:00'), i), 'yyyy-MM-dd');
    if (loggedDates.has(d)) {
      sevenDayWindow.push(d);
      if (sevenDayWindow.length === 7) break;
    } else {
      break;
    }
  }
  const hasEnoughData = sevenDayWindow.length >= 7;
  const avgNetCal = hasEnoughData
    ? sevenDayWindow.reduce((sum, d) => {
        const s = getDailySummary(d);
        return sum + (s.totalCaloriesIn - s.totalCaloriesOut);
      }, 0) / 7
    : 0;
  const calorieMonthlyChange = hasEnoughData ? (avgNetCal * 30) / calorieFactor : 0;
  // Use regression if available, else calorie model
  const monthlyChange = regressionResult ? regressionResult.monthlyChange : calorieMonthlyChange;
  const usingRegression = !!regressionResult;

  return (
    <div className="page-container px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Hi Body 💪</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel(date)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(format(subDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-gray-700 rounded-xl">
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <button
            onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isToday ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            {dateLabel(date)}
          </button>
          <button onClick={() => setDate(format(addDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-gray-700 rounded-xl">
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {!profile && (
        <Card className="mb-4 border-emerald-800 bg-emerald-950/30">
          <CardContent className="py-4">
            <p className="text-sm text-emerald-300 font-medium mb-2">👋 歡迎！先設定你的個人資料</p>
            <Link href="/profile">
              <Button size="sm">前往設定</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* TDEE update reminder */}
      {showTdeeReminder && (
        <Card className="mb-4 border-yellow-800 bg-yellow-950/30">
          <CardContent className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-300">⚡ 建議更新 TDEE 設定</p>
                <p className="text-xs text-yellow-500/80 mt-0.5">
                  你的體重已變化 <span className="font-bold text-yellow-400">{weightDiff.toFixed(1)} kg</span>，TDEE 和目標熱量可能需要調整
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <Link href="/profile">
                  <button className="px-3 py-1.5 text-xs font-semibold bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg transition-colors">
                    去更新
                  </button>
                </Link>
                <button
                  onClick={() => dismissTdeeReminder(latestWeight!.weight)}
                  className="text-gray-500 hover:text-gray-300 text-lg leading-none"
                  aria-label="dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streak banner */}
      {(streak.current > 0 || streak.longest > 0) && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-2xl mb-4 border ${streak.current >= 7 ? 'bg-orange-950/40 border-orange-800' : streak.current > 0 ? 'bg-amber-950/30 border-amber-800/60' : 'bg-gray-800 border-gray-700'}`}>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{streak.current >= 30 ? '🔥' : streak.current >= 7 ? '⚡' : '📅'}</span>
            <div>
              <p className="text-sm font-bold text-white">
                {streak.current > 0
                  ? `連續打卡 ${streak.current} 天`
                  : '今天還沒記錄'}
              </p>
              <p className="text-xs text-gray-400">
                {streak.loggedToday ? '今日已記錄 ✓' : streak.current > 0 ? '記錄今天以延續 streak！' : '快去記錄飲食吧'}
              </p>
            </div>
          </div>
          {streak.longest > 1 && (
            <div className="text-right">
              <p className="text-xs text-gray-500">最長紀錄</p>
              <p className="text-sm font-semibold text-gray-300">{streak.longest} 天</p>
            </div>
          )}
        </div>
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
                trackColor="#052e16"
                label={`${Math.round(summary.totalCaloriesIn)}`}
                sublabel="kcal"
              />
              <span className="text-xs text-gray-400">攝入熱量</span>
            </div>

            <div className="flex-1 px-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-900/40 rounded-xl flex items-center justify-center">
                    <Flame size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">目標</p>
                    <p className="text-sm font-semibold text-gray-100">{calorieTarget}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-900/40 rounded-xl flex items-center justify-center">
                    <Zap size={16} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400">消耗</p>
                    <p className="text-sm font-semibold text-gray-100">{summary.totalCaloriesOut}</p>
                  </div>
                </div>
              </div>
              <div className="h-px bg-gray-700" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">淨卡路里</span>
                <span className={`text-sm font-bold ${summary.netCalories > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {summary.netCalories > 0 ? '+' : ''}{Math.round(summary.netCalories)} kcal
                </span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Macros */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-200">今日營養素攝取進度</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <NutrientBar label="蛋白質 🥩" value={summary.totalProtein} target={proteinTarget || 150} color="#6366f1" />
          <NutrientBar label="碳水化合物 🍚" value={summary.totalCarbs} target={Math.round(calorieTarget * 0.45 / 4) || 200} color="#f59e0b" />
          <NutrientBar label="脂肪 🥑" value={summary.totalFat} target={Math.round(calorieTarget * 0.3 / 9) || 60} color="#ec4899" />
        </CardContent>
      </Card>

      {/* Water Tracking */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-200">今日飲水</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${waterPct >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                {totalWaterMl} <span className="text-xs font-normal text-gray-400">/ {waterTarget} ml</span>
              </span>
              {dayWater.length > 0 && (
                <button
                  onClick={handleDeleteLastWater}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400"
                  title="撤銷最後一筆"
                >
                  <Minus size={12} />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* Progress bar */}
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${waterPct}%`,
                background: waterPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              }}
            />
          </div>
          {/* Quick-add buttons */}
          <div className="flex gap-2">
            {QUICK_ADD_ML.map((ml) => (
              <button
                key={ml}
                onClick={() => handleAddWater(ml)}
                className="flex-1 py-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/50 text-blue-300 text-xs font-medium transition-colors"
              >
                +{ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
              </button>
            ))}
          </div>
          {waterPct >= 100 && (
            <p className="text-xs text-center text-emerald-400">🎉 今天飲水目標達成！</p>
          )}
        </CardContent>
      </Card>

      {/* Weight + Prediction */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale size={16} className="text-blue-400" />
              <span className="text-xs text-gray-400">最新體重</span>
            </div>
            {latestWeight ? (
              <>
                <p className="text-2xl font-bold text-gray-100">
                  {latestWeight.weight} <span className="text-sm font-normal text-gray-400">kg</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">{latestWeight.date}</p>
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
              <TrendingUp size={16} className="text-purple-400" />
              <span className="text-xs text-gray-400">月預測變化</span>
            </div>
            {!profile ? (
              <p className="text-xs text-gray-500 mt-1">請先設定個人資料</p>
            ) : usingRegression ? (
              <>
                <p className={`text-2xl font-bold ${monthlyChange > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(2)} <span className="text-sm font-normal text-gray-400">kg</span>
                </p>
                <p className="text-[10px] text-emerald-600 mt-1">
                  📈 實測趨勢 · R²{(regressionResult!.r2 * 100).toFixed(0)}%
                </p>
                <p className="text-[11px] text-gray-500">
                  {monthlyChange < -0.5 ? '減脂中 🔥' : monthlyChange > 0.5 ? '增肌中 💪' : '維持體重 ✅'}
                </p>
              </>
            ) : !hasEnoughData ? (
              <div className="mt-1">
                <p className="text-xs text-gray-400 leading-snug">需 7 天連續記錄</p>
                <p className="text-[11px] text-gray-600 mt-0.5">已連續 {sevenDayWindow.length} 天</p>
              </div>
            ) : (
              <>
                <p className={`text-2xl font-bold ${monthlyChange > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {monthlyChange > 0 ? '+' : ''}{monthlyChange.toFixed(2)} <span className="text-sm font-normal text-gray-400">kg</span>
                </p>
                {calorieFactor !== 7700 && (
                  <p className="text-[10px] text-purple-400 mt-0.5">✦ 高蛋白+重訓修正</p>
                )}
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {monthlyChange < -0.5 ? '減脂中 🔥' : monthlyChange > 0.5 ? '增肌中 💪' : '維持體重 ✅'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's meals */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">今日飲食</h2>
            <Link href="/food">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Plus size={14} /> 新增
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {dayFood.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">尚未記錄飲食</p>
          ) : (
            <div className="space-y-2">
              {dayFood.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    {entry.category === 'liquid' ? (
                      <Droplets size={14} className="text-blue-400" />
                    ) : (
                      <Utensils size={14} className="text-gray-500" />
                    )}
                    <span className="text-sm text-gray-200 truncate max-w-[150px]">{entry.name}</span>
                    {entry.estimatedByAI && <Badge color="purple" className="text-[10px]">AI</Badge>}
                  </div>
                  <span className="text-xs font-medium text-gray-400">{entry.nutrition.calories} kcal</span>
                </div>
              ))}
              {dayFood.length > 4 && (
                <Link href="/food" className="block text-xs text-center text-emerald-400 pt-1">
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
            <h2 className="text-sm font-semibold text-gray-200">今日運動</h2>
            <Link href="/exercise">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Plus size={14} /> 新增
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {dayExercise.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">尚未記錄運動</p>
          ) : (
            <div className="space-y-2">
              {dayExercise.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-200">{entry.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{entry.duration} 分鐘</span>
                    <span className="text-xs font-medium text-orange-400">-{entry.caloriesBurned} kcal</span>
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

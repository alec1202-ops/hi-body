'use client';

import React, { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Sparkles, BookOpen, Droplets,
  Utensils, ThumbsUp, ThumbsDown, Copy, ChevronLeft, ChevronRight,
  Star, Pencil, X,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { FavoriteMeal, FoodEntry, FoodCategory, NutritionInfo } from '@/types';
import Link from 'next/link';

const MEAL_TYPES = [
  { value: 'breakfast', label: '早餐', emoji: '🌅' },
  { value: 'lunch', label: '午餐', emoji: '☀️' },
  { value: 'dinner', label: '晚餐', emoji: '🌙' },
  { value: 'snack', label: '點心', emoji: '🍎' },
] as const;

type MealType = typeof MEAL_TYPES[number]['value'];

function dateLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  if (dateStr === today) return '今天';
  if (dateStr === yesterday) return '昨天';
  return format(new Date(dateStr + 'T00:00:00'), 'M月d日 (EEE)', { locale: zhTW });
}

// ─── Add Food Form ────────────────────────────────────────────────────────────

interface AddFoodFormProps {
  onAdd: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => void;
  onClose: () => void;
  date: string;
  favoriteMeals: FavoriteMeal[];
}

function AddFoodForm({ onAdd, onClose, date, favoriteMeals }: AddFoodFormProps) {
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('solid');
  const [servingSize, setServingSize] = useState('');
  const [nutrition, setNutrition] = useState<NutritionInfo>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [photo, setPhoto] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'manual' | 'ai' | 'favorites'>('ai');

  async function analyzePhoto() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: photo?.base64, mimeType: photo?.mimeType, foodName: name || undefined, favoriteMeals }),
      });
      const data = await res.json();
      if (data.matched) {
        const m = data.meal;
        setName(m.name); setCategory(m.category); setServingSize(m.servingSize); setNutrition(m.nutrition);
      } else if (data.result) {
        const r = data.result;
        setName(r.name || name); setCategory(r.category || 'solid'); setServingSize(r.servingSize || '');
        setNutrition({ calories: r.calories || 0, protein: r.protein || 0, carbs: r.carbs || 0, fat: r.fat || 0 });
      }
    } catch { setError('AI 分析失敗，請手動輸入'); }
    finally { setLoading(false); }
  }

  async function analyzeName() {
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: name, favoriteMeals }),
      });
      const data = await res.json();
      if (data.matched) {
        const m = data.meal;
        setCategory(m.category); setServingSize(m.servingSize); setNutrition(m.nutrition);
      } else if (data.result) {
        const r = data.result;
        setCategory(r.category || 'solid'); setServingSize(r.servingSize || '');
        setNutrition({ calories: r.calories || 0, protein: r.protein || 0, carbs: r.carbs || 0, fat: r.fat || 0 });
      }
    } catch { setError('分析失敗'); }
    finally { setLoading(false); }
  }

  function selectFavorite(meal: FavoriteMeal) {
    setName(meal.name); setCategory(meal.category); setServingSize(meal.servingSize); setNutrition(meal.nutrition);
    setTab('manual');
  }

  function handleSubmit() {
    if (!name.trim()) { setError('請輸入食物名稱'); return; }
    onClose();
    onAdd({ date, mealType, name, category, nutrition, servingSize, imageUrl: photo?.preview, estimatedByAI: tab === 'ai' });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="overflow-y-auto flex-1 min-h-0 p-5 pb-0" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">新增飲食</h2>
            <div className="flex items-center gap-2">
              <Link href="/food/favorites" className="text-xs text-emerald-400 flex items-center gap-1">
                <BookOpen size={14} /> 管理常用餐點
              </Link>
              <button onClick={handleSubmit} className="px-4 py-1.5 bg-emerald-500 text-white text-sm font-semibold rounded-xl">
                ✅ 新增
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {MEAL_TYPES.map((mt) => (
              <button key={mt.value} onClick={() => setMealType(mt.value)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${mealType === mt.value ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {mt.emoji} {mt.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-gray-700 rounded-xl p-1 mb-4">
            {[
              { key: 'ai', label: '✨ AI 分析' },
              { key: 'favorites', label: '📖 常用餐點' },
              { key: 'manual', label: '手動輸入' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key as typeof tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${tab === key ? 'bg-gray-600 shadow-sm text-white' : 'text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'ai' && (
            <div className="space-y-3 mb-4">
              <PhotoUpload onPhoto={(b64, mime, preview) => setPhoto({ base64: b64, mimeType: mime, preview })}
                preview={photo?.preview} onClear={() => setPhoto(null)} label="拍攝或上傳食物照片" />
              <input type="text" placeholder="食物名稱（選填，幫助識別）" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              <Button onClick={photo ? analyzePhoto : analyzeName} disabled={loading || (!photo && !name.trim())} className="w-full">
                {loading ? '分析中...' : photo ? '📸 AI 分析照片' : '🔍 AI 估算營養'}
              </Button>
            </div>
          )}

          {tab === 'favorites' && (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {favoriteMeals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  尚無常用餐點。<Link href="/food/favorites" className="text-emerald-400 ml-1">新增→</Link>
                </p>
              ) : (
                favoriteMeals.map((m) => (
                  <button key={m.id} onClick={() => selectFavorite(m)}
                    className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-xl hover:bg-emerald-900/30 transition-colors">
                    <div className="flex items-center gap-2">
                      {m.category === 'liquid' ? <Droplets size={14} className="text-blue-400" /> : <Utensils size={14} className="text-gray-400" />}
                      <span className="text-sm font-medium text-gray-100">{m.name}</span>
                      <span className="text-xs text-gray-400">{m.servingSize}</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-medium">{m.nutrition.calories} kcal</span>
                  </button>
                ))
              )}
            </div>
          )}

          <div className="space-y-3 mb-4">
            <input type="text" placeholder="食物名稱 *" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            <div className="flex gap-2">
              <select value={category} onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className="flex-1 px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400">
                <option value="solid">固體食物</option>
                <option value="liquid">液體飲品</option>
                <option value="supplement">補充品</option>
              </select>
              <input type="text" placeholder="份量（如 1碗~300g）" value={servingSize} onChange={(e) => setServingSize(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
                <input key={key} type="number" min={0}
                  placeholder={key === 'calories' ? '熱量 (kcal)' : key === 'protein' ? '蛋白質 (g)' : key === 'carbs' ? '碳水 (g)' : '脂肪 (g)'}
                  value={nutrition[key] || ''}
                  onChange={(e) => setNutrition((n) => ({ ...n, [key]: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-xl text-sm focus:outline-none focus:border-emerald-400" />
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
        </div>
        <div className="p-4 pt-3 border-t border-gray-700 bg-gray-800 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} className="flex-1 py-3 text-base">✅ 新增飲食</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Food Form ───────────────────────────────────────────────────────────

interface EditFoodFormProps {
  entry: FoodEntry;
  isAlreadyFavorite: boolean;
  onSave: (id: string, updates: Partial<FoodEntry>) => void;
  onAddToFavorites: (entry: FoodEntry) => void;
  onClose: () => void;
}

function EditFoodForm({ entry, isAlreadyFavorite, onSave, onAddToFavorites, onClose }: EditFoodFormProps) {
  const [name, setName] = useState(entry.name);
  const [mealType, setMealType] = useState<MealType>(entry.mealType);
  const [servingSize, setServingSize] = useState(entry.servingSize || '');
  const [nutrition, setNutrition] = useState<NutritionInfo>(entry.nutrition);
  const [addedToFav, setAddedToFav] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    onSave(entry.id, { name, mealType, servingSize, nutrition });
    onClose();
  }

  function handleAddToFavorites() {
    if (isAlreadyFavorite || addedToFav) return;
    onAddToFavorites({ ...entry, name, mealType, servingSize, nutrition });
    setAddedToFav(true);
  }

  const alreadyFav = isAlreadyFavorite || addedToFav;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-gray-800 w-full max-w-[480px] rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">編輯飲食</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        </div>

        {/* Meal type */}
        <div className="flex gap-2 mb-4">
          {MEAL_TYPES.map((mt) => (
            <button key={mt.value} onClick={() => setMealType(mt.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${mealType === mt.value ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
              {mt.emoji} {mt.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-4">
          <input type="text" placeholder="食物名稱 *" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400" />
          <input type="text" placeholder="份量（如 1碗~300g）" value={servingSize} onChange={(e) => setServingSize(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400" />
          <div className="grid grid-cols-2 gap-2">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
              <input key={key} type="number" min={0}
                placeholder={key === 'calories' ? '熱量 (kcal)' : key === 'protein' ? '蛋白質 (g)' : key === 'carbs' ? '碳水 (g)' : '脂肪 (g)'}
                value={nutrition[key] || ''}
                onChange={(e) => setNutrition((n) => ({ ...n, [key]: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400" />
            ))}
          </div>
        </div>

        {/* Add to favorites */}
        <button
          onClick={handleAddToFavorites}
          disabled={alreadyFav}
          className={`w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl text-sm font-medium border transition-colors
            ${alreadyFav
              ? 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400 cursor-default'
              : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-yellow-900/30 hover:border-yellow-700 hover:text-yellow-400'
            }`}
        >
          <Star size={15} className={alreadyFav ? 'fill-yellow-400 text-yellow-400' : ''} />
          {alreadyFav ? '已在常用清單' : '加入常用飲食清單'}
        </button>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-xl transition-colors">
            取消
          </button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors">
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Food Page ────────────────────────────────────────────────────────────────

export default function FoodPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);
  const { foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry, favoriteMeals, addFavoriteMeal } = useAppStore();

  const isToday = date === today;
  const dayFood = foodEntries.filter((e) => e.date === date);
  const totalNutrition = dayFood.reduce(
    (acc, e) => ({
      calories: acc.calories + e.nutrition.calories,
      protein: acc.protein + e.nutrition.protein,
      carbs: acc.carbs + e.nutrition.carbs,
      fat: acc.fat + e.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  function handleAdd(entry: Omit<FoodEntry, 'id' | 'timestamp'>) {
    addFoodEntry({ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() });
  }

  function handleCopyToToday(entry: FoodEntry) {
    const alreadyCopied = foodEntries.some((e) => e.date === today && e.name === entry.name && e.mealType === entry.mealType);
    if (alreadyCopied) return;
    addFoodEntry({ ...entry, id: crypto.randomUUID(), date: today, aiFeedback: undefined, estimatedByAI: false, timestamp: new Date().toISOString() });
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function handleAddToFavorites(entry: FoodEntry) {
    addFavoriteMeal({
      id: `fav-${Date.now()}`,
      name: entry.name,
      category: entry.category,
      nutrition: entry.nutrition,
      servingSize: entry.servingSize || '',
      aliases: [],
      createdAt: new Date().toISOString(),
    });
  }

  function isEntryFavorite(entry: FoodEntry) {
    return favoriteMeals.some((m) => m.name.toLowerCase() === entry.name.toLowerCase());
  }

  const grouped = MEAL_TYPES.map((mt) => ({
    ...mt,
    entries: dayFood.filter((e) => e.mealType === mt.value),
  }));

  return (
    <div className="page-container px-4 pt-5">
      {/* Header with date nav */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">飲食記錄</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel(date)}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setDate(format(subDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-gray-700 rounded-xl">
            <ChevronLeft size={18} className="text-gray-400" />
          </button>
          <button
            onClick={() => setDate(today)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isToday ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            {dateLabel(date)}
          </button>
          <button onClick={() => setDate(format(addDays(new Date(date + 'T00:00:00'), 1), 'yyyy-MM-dd'))} className="p-2 hover:bg-gray-700 rounded-xl">
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Past-day copy hint */}
      {!isToday && dayFood.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl bg-gray-800 border border-gray-700">
          <Copy size={13} className="text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-400">點擊 <Copy size={11} className="inline" /> 可將任一餐複製到今天</p>
        </div>
      )}

      {/* Daily totals */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: '熱量', value: Math.round(totalNutrition.calories), unit: 'kcal', color: 'text-orange-400' },
              { label: '蛋白質', value: Math.round(totalNutrition.protein), unit: 'g', color: 'text-indigo-400' },
              { label: '碳水', value: Math.round(totalNutrition.carbs), unit: 'g', color: 'text-amber-400' },
              { label: '脂肪', value: Math.round(totalNutrition.fat), unit: 'g', color: 'text-pink-400' },
            ].map((item) => (
              <div key={item.label}>
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-[10px] text-gray-500">{item.unit}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meals by type */}
      {grouped.map(({ value, label, emoji, entries }) => (
        <Card key={value} className="mb-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">{emoji} {label}</span>
              <span className="text-xs text-gray-400">
                {Math.round(entries.reduce((s, e) => s + e.nutrition.calories, 0))} kcal
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {entries.length === 0 ? (
              <p className="text-xs text-gray-500 pb-1">尚未記錄</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    {entry.imageUrl && (
                      <img src={entry.imageUrl} alt={entry.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    )}
                    {/* Clickable content area → edit */}
                    <button
                      className="flex-1 min-w-0 text-left"
                      onClick={() => setEditingEntry(entry)}
                    >
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm font-medium text-gray-100">{entry.name}</span>
                        {entry.estimatedByAI && <Badge color="purple" className="text-[10px]">AI</Badge>}
                        <Badge color={entry.category === 'liquid' ? 'blue' : entry.category === 'supplement' ? 'orange' : 'gray'} className="text-[10px]">
                          {entry.category === 'liquid' ? '飲品' : entry.category === 'supplement' ? '補充品' : '食物'}
                        </Badge>
                        <Pencil size={10} className="text-gray-600 ml-0.5" />
                      </div>
                      {entry.servingSize && <p className="text-xs text-gray-500">{entry.servingSize}</p>}
                      <div className="flex gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="text-orange-400 font-medium">{entry.nutrition.calories} kcal</span>
                        <span>蛋白 {entry.nutrition.protein}g</span>
                        <span>碳水 {entry.nutrition.carbs}g</span>
                        <span>脂肪 {entry.nutrition.fat}g</span>
                      </div>
                      {entry.estimatedByAI && (
                        <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-gray-500">AI 估算準確？</span>
                          <button
                            onClick={() => updateFoodEntry(entry.id, { aiFeedback: entry.aiFeedback === 'accurate' ? undefined : 'accurate' })}
                            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] transition-colors ${entry.aiFeedback === 'accurate' ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700' : 'bg-gray-700 text-gray-500 hover:text-emerald-400 hover:bg-emerald-900/30'}`}
                          >
                            <ThumbsUp size={10} /> 準確
                          </button>
                          <button
                            onClick={() => updateFoodEntry(entry.id, { aiFeedback: entry.aiFeedback === 'inaccurate' ? undefined : 'inaccurate' })}
                            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] transition-colors ${entry.aiFeedback === 'inaccurate' ? 'bg-red-900/60 text-red-400 border border-red-800' : 'bg-gray-700 text-gray-500 hover:text-red-400 hover:bg-red-900/30'}`}
                          >
                            <ThumbsDown size={10} /> 不準
                          </button>
                        </div>
                      )}
                    </button>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {/* Add to favorites */}
                      <button
                        onClick={() => !isEntryFavorite(entry) && handleAddToFavorites(entry)}
                        title={isEntryFavorite(entry) ? '已在常用清單' : '加入常用清單'}
                        className={`p-1.5 rounded-lg transition-colors ${isEntryFavorite(entry) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-900/30'}`}
                      >
                        <Star size={14} className={isEntryFavorite(entry) ? 'fill-yellow-400' : ''} />
                      </button>
                      {/* Copy to today */}
                      {!isToday && (
                        <button onClick={() => handleCopyToToday(entry)} title="複製到今天"
                          className={`p-1.5 rounded-lg transition-colors ${copiedId === entry.id ? 'bg-emerald-900/50 text-emerald-400' : 'text-gray-600 hover:text-emerald-400 hover:bg-emerald-900/30'}`}>
                          <Copy size={14} />
                        </button>
                      )}
                      {/* Delete */}
                      <button onClick={() => deleteFoodEntry(entry.id)}
                        className="p-1.5 hover:bg-red-900/30 rounded-lg text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-5 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-white transition-colors"
      >
        <Plus size={24} />
      </button>

      {showForm && (
        <AddFoodForm onAdd={handleAdd} onClose={() => setShowForm(false)} date={date} favoriteMeals={favoriteMeals} />
      )}

      {editingEntry && (
        <EditFoodForm
          entry={editingEntry}
          isAlreadyFavorite={isEntryFavorite(editingEntry)}
          onSave={updateFoodEntry}
          onAddToFavorites={handleAddToFavorites}
          onClose={() => setEditingEntry(null)}
        />
      )}
    </div>
  );
}

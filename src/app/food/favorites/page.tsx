'use client';

import { useState } from 'react';
import { Plus, Trash2, Pencil, Search, Droplets, Utensils, Package } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import type { FavoriteMeal, FoodCategory, NutritionInfo } from '@/types';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const CATEGORY_LABELS: Record<FoodCategory, { label: string; icon: typeof Droplets }> = {
  solid: { label: '固體食物', icon: Utensils },
  liquid: { label: '液體飲品', icon: Droplets },
  supplement: { label: '補充品', icon: Package },
};

interface MealFormProps {
  initial?: FavoriteMeal;
  onSave: (meal: Omit<FavoriteMeal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

function MealForm({ initial, onSave, onClose }: MealFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState<FoodCategory>(initial?.category || 'solid');
  const [servingSize, setServingSize] = useState(initial?.servingSize || '');
  const [aliases, setAliases] = useState((initial?.aliases || []).join(', '));
  const [nutrition, setNutrition] = useState<NutritionInfo>(
    initial?.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const [photo, setPhoto] = useState<{ preview: string } | null>(initial?.imageUrl ? { preview: initial.imageUrl } : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function autoFill() {
    if (!name.trim()) { setError('請先輸入食物名稱'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: name, favoriteMeals: [] }),
      });
      const data = await res.json();
      if (data.result) {
        const r = data.result;
        setCategory(r.category || 'solid');
        setServingSize(r.servingSize || '');
        setNutrition({ calories: r.calories || 0, protein: r.protein || 0, carbs: r.carbs || 0, fat: r.fat || 0 });
      }
    } catch {
      setError('AI 估算失敗');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (!name.trim()) { setError('請輸入食物名稱'); return; }
    onSave({
      name,
      category,
      servingSize,
      nutrition,
      aliases: aliases.split(',').map((s) => s.trim()).filter(Boolean),
      imageUrl: photo?.preview,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] rounded-t-3xl p-5 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-900 mb-4">{initial ? '編輯餐點' : '新增常用餐點'}</h2>

        <div className="space-y-3 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="食物名稱 *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
            <Button variant="secondary" size="sm" onClick={autoFill} disabled={loading}>
              {loading ? '...' : '✨ AI'}
            </Button>
          </div>

          <input
            type="text"
            placeholder="別名（用逗號分隔，方便自動比對）"
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
          />

          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            >
              <option value="solid">固體食物</option>
              <option value="liquid">液體飲品</option>
              <option value="supplement">補充品</option>
            </select>
            <input
              type="text"
              placeholder="份量描述"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['calories', 'protein', 'carbs', 'fat'] as const).map((key) => (
              <input
                key={key}
                type="number"
                min={0}
                placeholder={key === 'calories' ? '熱量 (kcal)' : key === 'protein' ? '蛋白質 (g)' : key === 'carbs' ? '碳水 (g)' : '脂肪 (g)'}
                value={nutrition[key] || ''}
                onChange={(e) => setNutrition((n) => ({ ...n, [key]: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400"
              />
            ))}
          </div>

          <PhotoUpload
            onPhoto={(_, __, preview) => setPhoto({ preview })}
            preview={photo?.preview}
            onClear={() => setPhoto(null)}
            label="新增食物圖片（選填）"
          />
        </div>

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSubmit} className="flex-1">儲存</Button>
        </div>
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  const { favoriteMeals, addFavoriteMeal, updateFavoriteMeal, deleteFavoriteMeal } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editMeal, setEditMeal] = useState<FavoriteMeal | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<FoodCategory | 'all'>('all');

  const filtered = favoriteMeals.filter((m) => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.aliases.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === 'all' || m.category === filterCategory;
    return matchSearch && matchCat;
  });

  function handleSave(data: Omit<FavoriteMeal, 'id' | 'createdAt'>) {
    if (editMeal) {
      updateFavoriteMeal(editMeal.id, data);
    } else {
      addFavoriteMeal({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
    }
  }

  return (
    <div className="page-container px-4 pt-5">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/food" className="p-2 hover:bg-gray-100 rounded-xl">
          <ChevronLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">常用餐點管理</h1>
        <Button size="sm" onClick={() => { setEditMeal(null); setShowForm(true); }}>
          <Plus size={16} /> 新增
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-white">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="搜尋餐點..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm focus:outline-none"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as FoodCategory | 'all')}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white"
        >
          <option value="all">全部</option>
          <option value="solid">食物</option>
          <option value="liquid">飲品</option>
          <option value="supplement">補充品</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-gray-400 mb-3">
              {favoriteMeals.length === 0 ? '尚未設定常用餐點' : '找不到符合的餐點'}
            </p>
            {favoriteMeals.length === 0 && (
              <Button size="sm" onClick={() => { setEditMeal(null); setShowForm(true); }}>
                <Plus size={14} /> 新增第一個餐點
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((meal) => {
            const { icon: Icon } = CATEGORY_LABELS[meal.category];
            return (
              <Card key={meal.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {meal.imageUrl ? (
                      <img src={meal.imageUrl} alt={meal.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon size={20} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{meal.name}</span>
                        <Badge color={meal.category === 'liquid' ? 'blue' : meal.category === 'supplement' ? 'orange' : 'gray'}>
                          {CATEGORY_LABELS[meal.category].label}
                        </Badge>
                      </div>
                      {meal.servingSize && <p className="text-xs text-gray-400 mt-0.5">{meal.servingSize}</p>}
                      {meal.aliases.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">別名：{meal.aliases.join(', ')}</p>
                      )}
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <span className="text-orange-500 font-semibold">{meal.nutrition.calories} kcal</span>
                        <span className="text-indigo-500">蛋白 {meal.nutrition.protein}g</span>
                        <span className="text-amber-500">碳水 {meal.nutrition.carbs}g</span>
                        <span className="text-pink-500">脂肪 {meal.nutrition.fat}g</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => { setEditMeal(meal); setShowForm(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteFavoriteMeal(meal.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <MealForm
          initial={editMeal || undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditMeal(null); }}
        />
      )}
    </div>
  );
}

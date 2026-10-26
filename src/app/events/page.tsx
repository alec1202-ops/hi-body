'use client';

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Plus, Trash2, Trophy, Clock, MapPin, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { RaceEvent, RaceType } from '@/types';

const RACE_TYPES: { type: RaceType; label: string; emoji: string }[] = [
  { type: 'run',       label: '路跑',   emoji: '🏃' },
  { type: 'swim',      label: '游泳',   emoji: '🏊' },
  { type: 'triathlon', label: '鐵人三項', emoji: '🏅' },
  { type: 'cycling',   label: '自行車', emoji: '🚴' },
  { type: 'other',     label: '其他',   emoji: '🎽' },
];

function raceEmoji(type: RaceType) {
  return RACE_TYPES.find((r) => r.type === type)?.emoji ?? '🎽';
}
function raceLabel(type: RaceType) {
  return RACE_TYPES.find((r) => r.type === type)?.label ?? '其他';
}

// ─── Event Form ───────────────────────────────────────────────────────────────
function EventForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: RaceEvent;
  onSave: (e: RaceEvent) => void;
  onClose: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? '');
  const [date, setDate]         = useState(initial?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [type, setType]         = useState<RaceType>(initial?.type ?? 'run');
  const [distance, setDistance] = useState(initial?.distance ?? '');
  const [targetTime, setTargetTime] = useState(initial?.targetTime ?? '');
  const [actualTime, setActualTime] = useState(initial?.actualTime ?? '');
  const [result, setResult]     = useState(initial?.result ?? '');
  const [notes, setNotes]       = useState(initial?.notes ?? '');

  function handleSave() {
    if (!name || !date) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name,
      date,
      type,
      distance: distance || undefined,
      targetTime: targetTime || undefined,
      actualTime: actualTime || undefined,
      result: result || undefined,
      notes: notes || undefined,
    });
  }

  const isPast = date < format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-gray-800">
        <div className="px-5 pt-12 pb-3 flex-shrink-0 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm text-gray-400">取消</button>
            <h2 className="text-base font-bold text-white">{initial ? '編輯賽事' : '新增賽事'}</h2>
            <button onClick={handleSave} disabled={!name || !date}
              className="px-4 py-1.5 bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl">
              ✅ 儲存
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-8 pt-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">賽事名稱</p>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例：2026 台北馬拉松" autoFocus
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">日期</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-2">類型</p>
            <div className="grid grid-cols-5 gap-1.5">
              {RACE_TYPES.map(({ type: t, label, emoji }) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex flex-col items-center py-2 rounded-xl text-xs transition-colors ${type === t ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                  <span className="text-lg">{emoji}</span>
                  <span className="mt-0.5 text-[10px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">距離（選填）</p>
            <input type="text" value={distance} onChange={(e) => setDistance(e.target.value)}
              placeholder="例：42.195 km 或 Full"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>

          <div>
            <p className="text-xs text-gray-400 mb-1.5">目標時間（選填）</p>
            <input type="text" value={targetTime} onChange={(e) => setTargetTime(e.target.value)}
              placeholder="例：3:30:00"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
          </div>

          {isPast && (
            <>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">實際成績（選填）</p>
                <input type="text" value={actualTime} onChange={(e) => setActualTime(e.target.value)}
                  placeholder="例：3:45:22"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1.5">名次/結果（選填）</p>
                <input type="text" value={result} onChange={(e) => setResult(e.target.value)}
                  placeholder="例：完成、第 23 名"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400" />
              </div>
            </>
          )}

          <div>
            <p className="text-xs text-gray-400 mb-1.5">備註（選填）</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="報名資訊、地點、心得…" rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-400 resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: RaceEvent;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const isPast = event.date < today;
  const days = differenceInDays(new Date(event.date + 'T00:00:00'), new Date());

  return (
    <div className={`bg-gray-800 rounded-2xl p-4 ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-3 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl
            ${isPast ? 'bg-gray-700' : 'bg-emerald-500/15'}`}>
            {raceEmoji(event.type)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{event.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(event.date + 'T00:00:00'), 'yyyy年M月d日 EEE', { locale: zhTW })}
              {' · '}{raceLabel(event.type)}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {event.distance && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin size={10} /> {event.distance}
                </span>
              )}
              {event.targetTime && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock size={10} /> 目標 {event.targetTime}
                </span>
              )}
              {event.actualTime && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                  <Trophy size={10} /> 成績 {event.actualTime}
                </span>
              )}
              {event.result && (
                <span className="text-[11px] text-yellow-400">{event.result}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {!isPast ? (
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-400 leading-none">{days}</p>
              <p className="text-[9px] text-gray-500">天後</p>
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">已完成</span>
          )}
          <div className="flex gap-1">
            <button onClick={onEdit}
              className="p-1.5 text-gray-500 hover:text-emerald-400 rounded-lg hover:bg-gray-700 transition-colors">
              <ChevronRight size={14} />
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-gray-600 hover:text-red-400 rounded-lg hover:bg-gray-700 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
      {event.notes && (
        <p className="mt-2 text-xs text-gray-500 leading-relaxed border-t border-gray-700/50 pt-2">{event.notes}</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const { raceEvents, addRaceEvent, updateRaceEvent, deleteRaceEvent } = useAppStore();
  const [showForm, setShowForm]       = useState(false);
  const [editEvent, setEditEvent]     = useState<RaceEvent | null>(null);
  const [showPast, setShowPast]       = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const upcoming = raceEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = raceEvents
    .filter((e) => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  function handleSave(event: RaceEvent) {
    if (editEvent) {
      updateRaceEvent(event.id, event);
    } else {
      addRaceEvent(event);
    }
    setShowForm(false);
    setEditEvent(null);
  }

  return (
    <div className="page-container px-4 pt-5 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-white">賽事</h1>
        <button
          onClick={() => { setEditEvent(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-sm font-semibold text-white">
          <Plus size={16} /> 新增賽事
        </button>
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl p-8 text-center mb-4">
          <p className="text-3xl mb-2">🏆</p>
          <p className="text-sm text-gray-400">還沒有即將到來的賽事</p>
          <button
            onClick={() => { setEditEvent(null); setShowForm(true); }}
            className="mt-4 px-5 py-2.5 bg-emerald-500 rounded-xl text-sm font-semibold text-white">
            新增第一場賽事
          </button>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold text-gray-400">即將到來 · {upcoming.length} 場</p>
          {upcoming.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              onEdit={() => { setEditEvent(e); setShowForm(true); }}
              onDelete={() => deleteRaceEvent(e.id)}
            />
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-3">
            <span>過去賽事 · {past.length} 場</span>
            <ChevronRight size={12} className={`transition-transform ${showPast ? 'rotate-90' : ''}`} />
          </button>
          {showPast && (
            <div className="space-y-3">
              {past.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  onEdit={() => { setEditEvent(e); setShowForm(true); }}
                  onDelete={() => deleteRaceEvent(e.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <EventForm
          initial={editEvent ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditEvent(null); }}
        />
      )}
    </div>
  );
}

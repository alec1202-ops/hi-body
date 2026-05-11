'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

const REMINDER_KEY = 'hi-body-push-dismissed';
const PERMISSION_KEY = 'hi-body-push-granted';

export function PushNotificationSetup() {
  const [show, setShow] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    const alreadyGranted = Notification.permission === 'granted';
    const dismissed = sessionStorage.getItem(REMINDER_KEY);
    setGranted(alreadyGranted);
    if (!alreadyGranted && Notification.permission !== 'denied' && !dismissed) {
      // Delay prompt so it doesn't pop immediately on first load
      const t = setTimeout(() => setShow(true), 8000);
      return () => clearTimeout(t);
    }
  }, []);

  // Schedule a daily local reminder using the SW (fires once per session)
  useEffect(() => {
    if (!granted) return;
    if (sessionStorage.getItem(PERMISSION_KEY)) return;
    sessionStorage.setItem(PERMISSION_KEY, '1');
    scheduleDailyReminder();
  }, [granted]);

  function scheduleDailyReminder() {
    const now = new Date();
    // Remind at 20:00 if it hasn't passed, otherwise skip until tomorrow
    const target = new Date(now);
    target.setHours(20, 0, 0, 0);
    const msUntil = target.getTime() - now.getTime();
    if (msUntil > 0 && msUntil < 12 * 3600 * 1000) {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification('Hi Body 提醒 💪', {
            body: '今天的飲食和運動都記錄了嗎？',
            icon: '/icon-192.png',
          });
        }
      }, msUntil);
    }
  }

  async function handleAllow() {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setGranted(true);
      setShow(false);
    } else {
      setShow(false);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem(REMINDER_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 bg-gray-800 border border-gray-600 rounded-2xl shadow-xl p-4">
      <button onClick={handleDismiss} className="absolute top-3 right-3 text-gray-500 hover:text-gray-300">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-emerald-400" />
        </div>
        <div className="flex-1 pr-4">
          <p className="text-sm font-semibold text-white mb-0.5">開啟每日提醒</p>
          <p className="text-xs text-gray-400">每天晚上 8 點提醒你記錄飲食與運動</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAllow}
              className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1"
            >
              <Bell size={13} /> 允許通知
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-xl transition-colors flex items-center gap-1"
            >
              <BellOff size={13} /> 不了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

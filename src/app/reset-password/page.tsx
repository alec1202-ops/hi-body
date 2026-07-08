'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Eye, EyeOff, Dumbbell } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the hash tokens automatically on page load
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }
    if (password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError('更新失敗：' + error.message);
    } else {
      setMessage('✅ 密碼已更新！正在跳轉到登入頁…');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-3xl shadow-xl shadow-black/50 w-full max-w-sm p-8">

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">設定新密碼</h1>
          <p className="text-sm text-gray-400 mt-1">請輸入你的新密碼</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-gray-400">驗證連結中…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 px-4 py-3 border border-gray-600 rounded-xl focus-within:border-emerald-400 bg-gray-700">
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="新密碼（至少 6 位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="flex-1 text-sm focus:outline-none border-0 p-0 bg-transparent"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border border-gray-600 rounded-xl focus-within:border-emerald-400 bg-gray-700">
              <Lock size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="確認新密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="flex-1 text-sm focus:outline-none border-0 p-0 bg-transparent"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
            {message && <p className="text-xs text-emerald-400">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? '更新中...' : '確認更新密碼'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

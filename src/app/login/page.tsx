'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Eye, EyeOff, Dumbbell } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError('登入失敗：' + (error.message === 'Invalid login credentials' ? '信箱或密碼錯誤' : error.message));
          setLoading(false);
        } else if (data.session) {
          // Full page reload ensures middleware sees fresh cookies
          window.location.href = '/';
        } else {
          setError('登入失敗：請稍後再試');
          setLoading(false);
        }
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError('註冊失敗：' + error.message);
        } else {
          setMessage('✅ 註冊成功！現在可以登入了。');
          setMode('login');
        }
        setLoading(false);
      }
    } catch (err) {
      setError('發生錯誤：' + String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-sm p-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-3 shadow-md">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hi Body</h1>
          <p className="text-sm text-gray-400 mt-1">增肌減脂，紀錄每一天</p>
        </div>

        {/* Tab */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode('login'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            登入
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); setMessage(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            註冊帳號
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl focus-within:border-emerald-400">
            <Mail size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="email"
              placeholder="電子信箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 text-sm focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl focus-within:border-emerald-400">
            <Lock size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="密碼（至少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="flex-1 text-sm focus:outline-none"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {message && <p className="text-xs text-emerald-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          你的資料只屬於你，安全加密儲存
        </p>
      </div>
    </div>
  );
}

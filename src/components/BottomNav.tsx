'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UtensilsCrossed, Dumbbell, TrendingUp, User, Brain } from 'lucide-react';

const tabs = [
  { href: '/', label: '總覽', icon: LayoutDashboard },
  { href: '/food', label: '飲食', icon: UtensilsCrossed },
  { href: '/exercise', label: '運動', icon: Dumbbell },
  { href: '/progress', label: '進度', icon: TrendingUp },
  { href: '/health', label: 'AI診斷', icon: Brain },
  { href: '/profile', label: '我的', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-inset-bottom">
      <div className="max-w-[480px] mx-auto flex items-center">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors
                ${active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? 'text-emerald-600' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

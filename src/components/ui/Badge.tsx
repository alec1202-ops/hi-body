import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'gray';
  className?: string;
}

const colors = {
  green: 'bg-emerald-900/50 text-emerald-300',
  blue: 'bg-blue-900/50 text-blue-300',
  purple: 'bg-purple-900/50 text-purple-300',
  orange: 'bg-orange-900/50 text-orange-300',
  red: 'bg-red-900/50 text-red-300',
  gray: 'bg-gray-700 text-gray-300',
};

export function Badge({ children, color = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`px-5 pt-5 pb-3 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = '' }: CardProps) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

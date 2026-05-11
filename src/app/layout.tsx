import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BottomNav } from '@/components/BottomNav';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';
import { ClientOnly } from '@/components/ClientOnly';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Hi Body',
  description: '增肌減脂追蹤 App',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hi Body',
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#10b981',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
      </head>
      <body className="min-h-full bg-gray-900">
        <AuthProvider>
          <ServiceWorkerRegistrar />
          <OfflineBanner />
          <ClientOnly>
            {children}
            <PushNotificationSetup />
            <BottomNav />
          </ClientOnly>
        </AuthProvider>
      </body>
    </html>
  );
}

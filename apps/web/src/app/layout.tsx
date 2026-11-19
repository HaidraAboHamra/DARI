import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from 'next/font/google';
import type { ReactNode } from 'react';
import { CartProvider } from '@/components/cart/cart-context';
import './globals.css';

const reemKufi = Reem_Kufi({ subsets: ['arabic', 'latin'], weight: ['500', '700'], variable: '--font-reem-kufi', display: 'swap' });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'داري — سلمية بين إيديك', template: '%s · داري' },
  description: 'كل ما تحتاجه في سلمية بمكان واحد: مطاعم، متاجر، خدمات، أطباء، وظائف، أخبار وتوصيل.',
  applicationName: 'داري',
  appleWebApp: { capable: true, title: 'داري', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0B1424',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${reemKufi.variable} ${plexArabic.variable}`}>
      <body className="min-h-dvh">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

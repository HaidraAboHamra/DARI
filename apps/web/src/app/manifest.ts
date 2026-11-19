import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'داري — سلمية بين إيديك',
    short_name: 'داري',
    description: 'كل ما تحتاجه في مدينتك بمكان واحد',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/',
    display: 'standalone',
    background_color: '#F6F0E0',
    theme_color: '#0B1424',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}

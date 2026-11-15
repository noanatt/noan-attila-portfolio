import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { site } from '@/content/site';
import { featured } from '@/content/photos';
import SmoothScroll from '@/components/SmoothScroll';
import { LightboxProvider } from '@/components/Lightbox';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import './globals.css';

// Schrift wird beim Build heruntergeladen und selbst gehostet (keine Google-Verbindung für Besucher)
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });

const shareImage = featured.share
  ? `photos/${featured.share.series}/${featured.share.id}-lg.jpg`
  : undefined;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Fotografie`, template: `%s | ${site.name}` },
  description: site.description,
  authors: [{ name: site.name }],
  openGraph: {
    type: 'website',
    siteName: site.name,
    title: `${site.name} | Fotografie`,
    description: site.description,
    images: shareImage ? [shareImage] : undefined,
    locale: 'de_DE',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#000000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={geist.variable}>
      <body>
        <SmoothScroll>
          <LightboxProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </LightboxProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}

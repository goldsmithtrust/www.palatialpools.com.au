import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://palatialpools.com.au'),
  title: { default: 'Palatial Pools', template: '%s | Palatial Pools' },
  description:
    "Melbourne's premium pool and spa service. Regular cleaning, leak detection, heating, and freshwater pool systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}

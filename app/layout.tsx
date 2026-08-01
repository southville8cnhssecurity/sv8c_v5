import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SV8C ID System — South Ville 8C National High School',
  description: 'Faculty & Staff ID Management System',
  icons: { icon: 'https://cdn.phototourl.com/free/2026-05-30-cddc7547-fc18-4888-841d-b8acd54ea907.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

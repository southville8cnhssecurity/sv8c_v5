'use client';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/lib/theme';
import { LazyMotion, domAnimation } from 'framer-motion';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LazyMotion features={domAnimation} strict>
          {children}
        </LazyMotion>
      </ThemeProvider>
    </SessionProvider>
  );
}
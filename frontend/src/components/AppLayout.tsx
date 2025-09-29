'use client';

import { ReactNode } from 'react';
import ModernNavigation from './ModernNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <ModernNavigation />
      <main className="app-main-content">
        {children}
      </main>
    </>
  );
}
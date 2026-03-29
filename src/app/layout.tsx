import type { Metadata } from 'next';
import './globals.css';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Global Backoffice - WeMade',
  description: 'Corporate Admin Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)] min-h-screen">
        <Toaster position="top-center" richColors />
        <AdminLayout>
          {children}
        </AdminLayout>
      </body>
    </html>
  );
}

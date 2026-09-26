import type { Metadata } from 'next';
import { DM_Serif_Display, Karla } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

const serif = DM_Serif_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});

const sans = Karla({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Ruta del Cacao',
  description: 'Sistema de trazabilidad de la producción de cacao',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${serif.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

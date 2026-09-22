import type { Metadata } from 'next';
import { Cormorant_Garamond, Karla } from 'next/font/google';
import './globals.css';

const karla = Karla({
  variable: '--font-karla',
  subsets: ['latin'],
});

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['600', '700'],
});

export const metadata: Metadata = {
  title: 'Ruta del Cacao',
  description: 'Sistema de trazabilidad de la producción de cacao',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${karla.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}

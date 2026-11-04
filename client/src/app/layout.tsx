import type { Metadata, Viewport } from 'next';
import '../styles/variables.css';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Kheyal — Plan Smart. Move Forward.',
  description: 'Student deadline workspace. Socho. Plan karo. Kar dikhao.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="container">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

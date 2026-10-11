import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VoltPath — Physics-Informed Fleet Energy Intelligence',
  description:
    'Thermal & terrain-aware energy-optimal dispatch engine for commercial Indian 2W EV delivery fleets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

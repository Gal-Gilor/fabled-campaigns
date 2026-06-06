import type { Metadata } from 'next';
import AppShell from '../components/app-shell';

// Auth-gated app with no public content — keep it out of search results
// instead of letting it inherit the homepage canonical (which makes Google
// report it as an "Alternate page with proper canonical tag").
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

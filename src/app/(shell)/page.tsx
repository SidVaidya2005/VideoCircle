import { AuthErrorNotice } from '@/components/home/auth-error-notice';
import { FeatureGrid } from '@/components/home/feature-grid';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';

interface HomePageProps {
  // A Promise in Next.js 16 — the async request APIs all are.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// The landing surface. Feature 05 wires the join-by-code form and feature 06 the
// "New meeting" flow; the visible surface lands first, per build-plan.md's Core
// Principle.
export default async function HomePage({ searchParams }: HomePageProps) {
  // Home is where /auth/callback sends anyone whose sign-in could not complete, so
  // the failure has somewhere to land other than a blank page.
  const { error } = await searchParams;

  return (
    <>
      {error === 'auth' ? <AuthErrorNotice /> : null}
      <Hero />
      <HowItWorks />
      <FeatureGrid />
    </>
  );
}

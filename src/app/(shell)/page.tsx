import { FeatureGrid } from '@/components/home/feature-grid';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';

// The landing surface. Feature 05 wires the join-by-code form and feature 06 the
// "New meeting" flow; the visible surface lands first, per build-plan.md's Core
// Principle.
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <FeatureGrid />
    </>
  );
}

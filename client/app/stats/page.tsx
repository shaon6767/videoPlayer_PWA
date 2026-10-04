import { StatsDashboard } from "@/components/StatsDashboard";

export const metadata = {
  title: "Cache & quota stats | Streamly",
  description: "Public, aggregate cache performance and YouTube quota statistics.",
};

export default function StatsPage() {
  return (
    <main className="mx-auto max-w-6xl">
      <h1 className="mb-2 text-2xl font-semibold">Cache &amp; quota stats</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Aggregate counts only. No searches, account data, or video identifiers are exposed.
      </p>
      <StatsDashboard />
    </main>
  );
}

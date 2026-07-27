import type { Metadata } from "next";
import WorkoutLiveScreen from "@/components/workout/WorkoutLiveScreen";

export const metadata: Metadata = {
  title: "Live Scanner — Atlant-Hybrid",
};

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const planDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : undefined;

  return <WorkoutLiveScreen planDate={planDate} />;
}

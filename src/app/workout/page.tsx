import type { Metadata } from "next";
import WorkoutLiveScreen from "@/components/workout/WorkoutLiveScreen";

export const metadata: Metadata = {
  title: "Live Scanner — Atlant-Hybrid",
};

export default function WorkoutPage() {
  return <WorkoutLiveScreen />;
}

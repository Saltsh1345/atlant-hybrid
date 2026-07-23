import type { Metadata } from "next";
import PlanDashboard from "@/components/plan/PlanDashboard";

export const metadata: Metadata = {
  title: "План тренировок — Atlant-Hybrid",
};

export default function PlanPage() {
  return <PlanDashboard />;
}

"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import WelcomeScreen from "@/components/screens/WelcomeScreen";
import RegistrationScreen from "@/components/screens/RegistrationScreen";
import DashboardScreen from "@/components/screens/DashboardScreen";
import CalibrationScreen from "@/components/screens/CalibrationScreen";
import SportSelectScreen from "@/components/screens/SportSelectScreen";
import TrainingScreen from "@/components/screens/TrainingScreen";
import AnalysisScreen from "@/components/screens/AnalysisScreen";
import SettingsScreen from "@/components/screens/SettingsScreen";
import TwinLiveScreen from "@/components/screens/TwinLiveScreen";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import BottomNav from "@/components/layout/BottomNav";

export default function AppShell() {
  const phase = useAppStore((s) => s.phase);
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    const state = useAppStore.getState();
    if (!state.profile) {
      if (
        state.phase !== "welcome" &&
        state.phase !== "registration"
      ) {
        useAppStore.setState({ phase: "welcome" });
      }
      return;
    }
    if (state.phase === "welcome") {
      useAppStore.setState({ phase: "dashboard" });
    }
  }, [profile, phase]);

  return (
    <>
      <ServiceWorkerRegister />
      <div className="pb-16">{renderPhase()}</div>
      <BottomNav />
    </>
  );

  function renderPhase() {
  switch (phase) {
    case "welcome":
      return <WelcomeScreen />;
    case "registration":
      return <RegistrationScreen />;
    case "dashboard":
      return <DashboardScreen />;
    case "settings":
      return <SettingsScreen />;
    case "twin-live":
      return <TwinLiveScreen />;
    case "calibration":
      return <CalibrationScreen />;
    case "sport-select":
      return <SportSelectScreen />;
    case "training":
      return <TrainingScreen />;
    case "analysis":
      return <AnalysisScreen />;
    default:
      return <WelcomeScreen />;
  }
  }
}

import React from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { HardHat, ShieldAlert, Activity, Building2, ClipboardList, BookOpen, MessageSquare, CloudRain } from "lucide-react";
import { C, Card, Page, ErrorBoundary } from "./components/ui.js";
import SafetyMonitor from "./components/SafetyMonitor.js";
import CrackDetection from "./components/CrackDetection.js";
import ProjectPlanner from "./components/ProjectPlanner.js";
import Valuation from "./components/Valuation.js";
import ConstructionChatbot from "./components/ConstructionChatbot.js";
import DailySiteAssistant from "./components/DailySiteAssistant.js";
import WeatherAdvisor from "./components/WeatherAdvisor.js";

const NAV = [
  { to: "/", label: "Dashboard", icon: HardHat, el: null },
  { to: "/safety", label: "Safety Monitor", icon: ShieldAlert, el: <SafetyMonitor /> },
  { to: "/cracks", label: "Crack Detection", icon: Activity, el: <CrackDetection /> },
  { to: "/planner", label: "Project Planner", icon: ClipboardList, el: <ProjectPlanner /> },
  { to: "/valuation", label: "Valuation", icon: Building2, el: <Valuation /> },
  { to: "/daily", label: "Daily Site Assistant", icon: BookOpen, el: <DailySiteAssistant /> },
  { to: "/chat", label: "Construction Chatbot", icon: MessageSquare, el: <ConstructionChatbot /> },
  { to: "/weather", label: "Weather Advisor", icon: CloudRain, el: <WeatherAdvisor /> },
];

const Dashboard = () => (
  <Page icon={HardHat} title="Construction Intelligence Platform"
    subtitle="Multimodal AI for safer sites, smarter plans and better property decisions.">
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
      {NAV.slice(1).map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} style={{ textDecoration: "none", color: "inherit" }}>
          <Card style={{ marginBottom: 0, height: "100%" }}>
            <Icon color={C.accent} /><h3 style={{ margin: "10px 0 0" }}>{label}</h3>
          </Card>
        </NavLink>
      ))}
    </div>
  </Page>
);

export default function App() {
  return (
    <BrowserRouter>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box} a:focus-visible,button:focus-visible{outline:2px solid ${C.accent};outline-offset:2px}`}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text,
        fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
        <nav aria-label="Main" style={{ width: 232, background: C.panel, padding: "20px 12px", position: "sticky",
          top: 0, height: "100vh", flexShrink: 0, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px 20px", fontWeight: 700 }}>
            <HardHat color={C.accent} /> BuildIQ
          </div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}
              style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                borderRadius: 8, marginBottom: 4, textDecoration: "none", fontSize: 14,
                color: isActive ? "#fff" : C.muted, background: isActive ? C.accent : "transparent" })}>
              <Icon size={19} /> {label}
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, padding: 32, minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {NAV.slice(1).map(({ to, el }) => (
              <Route key={to} path={to} element={<ErrorBoundary>{el}</ErrorBoundary>} />
            ))}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

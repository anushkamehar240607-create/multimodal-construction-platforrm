// Shared theme + UI primitives used by every module.
import React from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";

export const C = { bg: "#0f172a", panel: "#1e293b", accent: "#f97316", text: "#e2e8f0",
  muted: "#94a3b8", border: "#334155", ok: "#22c55e", bad: "#ef4444", warn: "#eab308" };

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 90000,
});
export const errMsg = (e) =>
  (typeof e?.response?.data?.detail === "string" && e.response.data.detail) ||
  (e?.code === "ERR_NETWORK" ? "Cannot reach the server. Check that the backend is running on port 8000." : e?.message) ||
  "Something went wrong.";
export const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
export const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const sevColor = (s = "") => {
  const v = String(s).toLowerCase();
  if (/(severe|critical|high|no-go)/.test(v)) return C.bad;
  if (/(moderate|medium)/.test(v)) return C.warn;
  if (/(minor|low|go)/.test(v)) return C.ok;
  return C.muted;
};

const input = { width: "100%", boxSizing: "border-box", background: C.bg, color: C.text,
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", font: "inherit", outlineColor: C.accent };

export const Page = ({ icon: Icon, title, subtitle, children }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
    style={{ maxWidth: 980, margin: "0 auto" }}>
    <header style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 24 }}>
      <Icon size={30} color={C.accent} />
      <div>
        <h1 style={{ margin: 0, fontSize: 26 }}>{title}</h1>
        <p style={{ margin: "4px 0 0", color: C.muted }}>{subtitle}</p>
      </div>
    </header>
    {children}
  </motion.div>
);

export const Card = ({ title, children, accent, style }) => (
  <section style={{ background: C.panel, borderRadius: 12, padding: 20, marginBottom: 16,
    borderLeft: accent ? `4px solid ${accent}` : "none", ...style }}>
    {title && <h3 style={{ margin: "0 0 12px", fontSize: 16, color: accent || C.accent }}>{title}</h3>}
    {children}
  </section>
);

export const Field = ({ label, children }) => (
  <label style={{ display: "block", marginBottom: 14, fontSize: 14, color: C.muted }}>
    <span style={{ display: "block", marginBottom: 6 }}>{label}</span>{children}
  </label>
);
export const TextInput = (p) => <input style={input} {...p} />;
export const TextArea = (p) => <textarea style={{ ...input, minHeight: 90, resize: "vertical" }} {...p} />;
export const Select = ({ options, ...p }) => (
  <select style={input} {...p}>{options.map((o) => <option key={o}>{o}</option>)}</select>
);
export const FileInput = ({ accept, onChange, file }) => (
  <>
    <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] || null)}
      style={{ ...input, padding: 8 }} />
    {file && <small style={{ color: C.muted }}>{file.name} ({Math.round(file.size / 1024)} KB)</small>}
  </>
);

export const Button = ({ loading, children, ...p }) => (
  <button {...p} disabled={loading || p.disabled}
    style={{ background: loading || p.disabled ? C.border : C.accent, color: "#fff", border: 0,
      borderRadius: 8, padding: "11px 20px", fontWeight: 600, fontSize: 15, display: "inline-flex",
      gap: 8, alignItems: "center", cursor: loading || p.disabled ? "not-allowed" : "pointer" }}>
    {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
    {children}
  </button>
);

export const Status = ({ loading, error, message }) => {
  if (loading) return <p role="status" style={{ color: C.muted }}>{message || "Analysing with AI… this can take up to a minute."}</p>;
  if (error) return <p role="alert" style={{ color: C.bad, display: "flex", gap: 8, alignItems: "center" }}><AlertTriangle size={16} />{error}</p>;
  return null;
};

export const FallbackNotice = ({ data }) =>
  data?.fallback_used ? (
    <Card accent={C.warn}><AlertTriangle size={16} color={C.warn} /> {data.note || "Showing safe default values."}</Card>
  ) : null;

export const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}`, borderRadius: 999,
    padding: "3px 12px", fontSize: 13, fontWeight: 600, display: "inline-block", margin: "0 8px 8px 0" }}>{children}</span>
);

export const Bullets = ({ items, empty = "None identified." }) => {
  const list = arr(items);
  if (!list.length) return <p style={{ color: C.muted, margin: 0 }}>{empty}</p>;
  return <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
    {list.map((x, i) => <li key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</li>)}</ul>;
};

export const Stat = ({ label, value }) => (
  <div style={{ background: C.bg, borderRadius: 8, padding: 14 }}>
    <div style={{ color: C.muted, fontSize: 13 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value}</div>
  </div>
);
export const Grid = ({ children, min = 180 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 12 }}>{children}</div>
);

export class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Card accent={C.bad} title="This module hit an unexpected error">
        <p style={{ color: C.muted }}>{String(this.state.error.message || this.state.error)}</p>
        <Button onClick={() => this.setState({ error: null })}>Reload module</Button>
      </Card>
    );
  }
}

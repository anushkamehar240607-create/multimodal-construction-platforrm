import React, { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Page, Card, Field, TextInput, Select, Button, Status, FallbackNotice, Bullets, Grid, Stat, ErrorBoundary, api, arr, errMsg, inr } from "./ui.js";

const TYPES = ["Residential House", "Apartment Building", "Commercial Building", "Industrial Shed", "Villa"];
const LABEL = { cement_bags: "Cement (bags)", steel_kg: "Steel (kg)", sand: "Sand", aggregate: "Aggregate" };

function PlannerInner() {
  const [form, setForm] = useState({ plot_size_sqft: "", construction_type: TYPES[0], location: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.plot_size_sqft) > 0) || !form.location.trim()) return setError("Enter a plot size above 0 and a location.");
    setLoading(true); setError(""); setData(null);
    try { setData((await api.post("/api/project-planner", { ...form, plot_size_sqft: Number(form.plot_size_sqft) })).data); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };
  const cost = data?.cost_breakdown_inr || {};
  const schedule = arr(data?.task_schedule);

  return (
    <Page icon={ClipboardList} title="Project Planner" subtitle="Estimate materials, cost in ₹ and a weekly build schedule.">
      <Card>
        <form onSubmit={submit}>
          <Grid min={220}>
            <Field label="Plot size (sq ft)"><TextInput type="number" min="1" value={form.plot_size_sqft} onChange={set("plot_size_sqft")} placeholder="1200" /></Field>
            <Field label="Construction type"><Select options={TYPES} value={form.construction_type} onChange={set("construction_type")} /></Field>
            <Field label="Location"><TextInput value={form.location} onChange={set("location")} placeholder="Bhopal, Madhya Pradesh" /></Field>
          </Grid>
          <Button type="submit" loading={loading}>{loading ? "Planning…" : "Generate plan"}</Button>
        </form>
        <Status loading={loading} error={error} />
      </Card>
      {data && (<>
        <FallbackNotice data={data} />
        <Card title="Material requirements">
          <Grid>{Object.entries(data.materials || {}).map(([k, v]) => <Stat key={k} label={LABEL[k] || k} value={typeof v === "number" ? v.toLocaleString("en-IN") : String(v)} />)}</Grid>
        </Card>
        <Card title="Cost breakdown (INR)">
          <Grid>
            <Stat label="Total" value={inr(cost.total)} /><Stat label="Material" value={inr(cost.material)} />
            <Stat label="Labor" value={inr(cost.labor)} /><Stat label="Permits" value={inr(cost.permits)} />
          </Grid>
        </Card>
        <Card title="Weekly schedule">
          {schedule.length ? schedule.map((t, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: i ? "1px solid #334155" : "none" }}>
              {typeof t === "string" ? t : <><strong>{t.week || t.milestone || `Week ${i + 1}`}</strong>{" – "}{t.task || t.milestone || t.description || JSON.stringify(t)}</>}
            </div>)) : <Bullets items={[]} empty="No schedule returned." />}
        </Card>
      </>)}
    </Page>
  );
}

export default function ProjectPlanner() {
  return <ErrorBoundary><PlannerInner /></ErrorBoundary>;
}

import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import { Page, Card, Field, TextInput, TextArea, Button, Status, FallbackNotice, Bullets, Grid, api, errMsg, C } from "./ui.js";

export default function DailySiteAssistant() {
  const [f, setF] = useState({ activity: "", worker_count: "", site_conditions: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!f.activity.trim() || !(Number(f.worker_count) > 0)) return setError("Enter an activity and a worker count above 0.");
    setLoading(true); setError(""); setData(null);
    try { setData((await api.post("/api/site-assistant", { ...f, worker_count: parseInt(f.worker_count, 10) })).data); }
    catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };

  return (
    <Page icon={BookOpen} title="Daily Site Assistant" subtitle="Turn today's activity into a task plan, equipment list and safety brief.">
      <Card>
        <form onSubmit={submit}>
          <Grid min={260}>
            <Field label="Activity"><TextInput value={f.activity} onChange={set("activity")} placeholder="Slab shuttering on 2nd floor" /></Field>
            <Field label="Workers on site"><TextInput type="number" min="1" value={f.worker_count} onChange={set("worker_count")} /></Field>
          </Grid>
          <Field label="Site conditions"><TextArea value={f.site_conditions} onChange={set("site_conditions")} placeholder="Narrow access road, wet ground, crane available…" /></Field>
          <Button type="submit" loading={loading}>{loading ? "Building plan…" : "Plan my day"}</Button>
        </form>
        <Status loading={loading} error={error} />
      </Card>
      {data && (<>
        <FallbackNotice data={data} />
        <Card title="Task breakdown"><Bullets items={data.daily_task_breakdown} /></Card>
        <Card title="Required equipment"><Bullets items={data.required_equipment} /></Card>
        <Card title="Safety precautions" accent={C.ok}><Bullets items={data.safety_precautions} /></Card>
        <Card title="Risk alerts" accent={C.bad}><Bullets items={data.risk_alerts} empty="No risk alerts." /></Card>
      </>)}
    </Page>
  );
}

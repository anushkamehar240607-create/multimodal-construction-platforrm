import React, { useState } from "react";
import { CloudRain } from "lucide-react";
import { Page, Card, Field, TextInput, TextArea, Button, Status, FallbackNotice, Badge, Bullets, api, errMsg, sevColor } from "./ui.js";

export default function WeatherAdvisor() {
  const [activity, setActivity] = useState("");
  const [forecast, setForecast] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!activity.trim() || !forecast.trim()) return setError("Enter both the planned activity and the forecast.");
    setLoading(true); setError(""); setData(null);
    try { setData((await api.post("/api/weather-advisor", { activity, forecast })).data); }
    catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };
  const color = sevColor(data?.recommendation);

  return (
    <Page icon={CloudRain} title="Weather Advisor" subtitle="Check whether a planned activity is safe to run in the forecast.">
      <Card>
        <form onSubmit={submit}>
          <Field label="Planned activity"><TextInput value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Concrete pour for roof slab" /></Field>
          <Field label="Forecasted weather"><TextArea value={forecast} onChange={(e) => setForecast(e.target.value)} placeholder="Heavy rain 70% after 2 PM, wind 35 km/h, 31°C…" /></Field>
          <Button type="submit" loading={loading}>{loading ? "Checking…" : "Get recommendation"}</Button>
        </form>
        <Status loading={loading} error={error} />
      </Card>
      {data && (<>
        <FallbackNotice data={data} />
        <Card title="Recommendation" accent={color}>
          <Badge color={color}>{data.recommendation}</Badge>
          <p style={{ marginBottom: 0, lineHeight: 1.6 }}>{data.scheduling_advice}</p>
        </Card>
        <Card title="Identified risks"><Bullets items={data.identified_risks} empty="No significant risks." /></Card>
        <Card title="Safety precautions"><Bullets items={data.safety_precautions} /></Card>
      </>)}
    </Page>
  );
}

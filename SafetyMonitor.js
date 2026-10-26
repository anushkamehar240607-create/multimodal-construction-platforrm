import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Page, Card, Field, TextArea, FileInput, Button, Status, FallbackNotice, Badge, Bullets, api, errMsg, sevColor, C } from "./ui.js";

export default function SafetyMonitor() {
  const [obs, setObs] = useState("");
  const [image, setImage] = useState(null);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!obs.trim() && !image && !doc) return setError("Add observations, a site image, or a document.");
    setLoading(true); setError(""); setData(null);
    const fd = new FormData();
    fd.append("observations", obs);
    if (image) fd.append("site_image", image);
    if (doc) fd.append("doc_file", doc);
    try { setData((await api.post("/api/safety-monitor", fd)).data); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <Page icon={ShieldAlert} title="Safety Monitor" subtitle="Upload a site photo and notes to detect hazards and PPE gaps.">
      <Card>
        <form onSubmit={submit}>
          <Field label="Site observations"><TextArea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="e.g. Workers on 3rd-floor edge, no guardrails, loose scaffolding planks…" /></Field>
          <Field label="Site image"><FileInput accept="image/*" file={image} onChange={setImage} /></Field>
          <Field label="Supporting document (optional, .txt/.md/.csv)"><FileInput accept=".txt,.md,.csv" file={doc} onChange={setDoc} /></Field>
          <Button type="submit" loading={loading}>{loading ? "Analysing…" : "Analyse site safety"}</Button>
        </form>
        <Status loading={loading} error={error} />
      </Card>
      {data && (<>
        <FallbackNotice data={data} />
        <Card title="Risk level" accent={sevColor(data.risk_level)}><Badge color={sevColor(data.risk_level)}>{data.risk_level}</Badge></Card>
        <Card title="Hazards identified" accent={C.bad}><Bullets items={data.hazards} /></Card>
        <Card title="PPE detected" accent={C.ok}><Bullets items={data.ppe} empty="No PPE detected." /></Card>
        <Card title="Missing PPE" accent={C.warn}><Bullets items={data.missing_ppe} empty="No missing PPE reported." /></Card>
        <Card title="Corrective actions"><Bullets items={data.corrective_actions} /></Card>
        <Card title="Relevant OSHA standards"><Bullets items={data.osha_standards} empty="No standards cited." /></Card>
      </>)}
    </Page>
  );
}

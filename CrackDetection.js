import React, { useState, useEffect } from "react";
import { Activity } from "lucide-react";
import { Page, Card, Field, TextArea, FileInput, Button, Status, FallbackNotice, Badge, Bullets, Grid, Stat, api, errMsg, sevColor } from "./ui.js";

export default function CrackDetection() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!image) return setPreview("");
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const submit = async (e) => {
    e.preventDefault();
    if (!image) return setError("Upload a crack photo first.");
    setLoading(true); setError(""); setData(null);
    const fd = new FormData();
    fd.append("crack_image", image);
    fd.append("context", context);
    try { setData((await api.post("/api/crack-detection", fd)).data); }
    catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <Page icon={Activity} title="Crack Detection" subtitle="Classify structural cracks and get repair guidance from a photo.">
      <Card>
        <form onSubmit={submit}>
          <Field label="Crack photo"><FileInput accept="image/*" file={image} onChange={setImage} /></Field>
          {preview && <img src={preview} alt="Crack preview" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 8, marginBottom: 14 }} />}
          <Field label="Context (optional)"><TextArea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Location, building age, when it appeared, width, any water seepage…" /></Field>
          <Button type="submit" loading={loading}>{loading ? "Inspecting…" : "Analyse crack"}</Button>
        </form>
        <Status loading={loading} error={error} />
      </Card>
      {data && (<>
        <FallbackNotice data={data} />
        <Card title="Assessment" accent={sevColor(data.severity)}>
          <Badge color={sevColor(data.severity)}>Severity: {data.severity}</Badge>
          <Grid><Stat label="Crack type" value={data.crack_type} /></Grid>
        </Card>
        <Card title="Probable cause"><p style={{ margin: 0, lineHeight: 1.6 }}>{data.probable_cause}</p></Card>
        <Card title="Structural risk"><p style={{ margin: 0, lineHeight: 1.6 }}>{data.structural_risk}</p></Card>
        <Card title="Remediation steps"><Bullets items={data.remediation} /></Card>
      </>)}
    </Page>
  );
}

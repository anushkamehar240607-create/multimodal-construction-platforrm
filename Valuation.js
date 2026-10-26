import React, { useState } from "react";
import { Building2 } from "lucide-react";
import { Page, Card, Field, TextInput, Select, Button, Status, FallbackNotice, Grid, Stat, api, errMsg, inr } from "./ui.js";

const TYPES = ["Apartment", "Independent House", "Villa", "Plot", "Commercial Office", "Shop"];
const AMENITIES = ["Parking", "Lift", "Gym", "Swimming Pool", "Security", "Power Backup", "Garden", "Clubhouse"];

export default function Valuation() {
  const [f, setF] = useState({ location: "", area_sqft: "", property_type: TYPES[0], building_age_years: "0" });
  const [amen, setAmen] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (a) => setAmen((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.location.trim() || !(Number(f.area_sqft) > 0)) return setError("Enter a location and an area above 0.");
    setLoading(true); setError(""); setData(null);
    try {
      setData((await api.post("/api/real-estate-valuation", {
        ...f, area_sqft: Number(f.area_sqft), building_age_years: Number(f.building_age_years) || 0, amenities: amen })).data);
    } catch (err) { setError(errMsg(err)); } finally { setLoading(false); }
  };
  const r = data?.valuation_range_inr || {};

  return (
    <Page icon={Building2} title="Real Estate Valuation" subtitle="Indian market valuation, rental yield and 5-year outlook.">
      <Card>
        <form onSubmit={submit}>
          <Grid min={220}>
            <Field label="Location"><TextInput value={f.location} onChange={set("location")} placeholder="Arera Colony, Bhopal" /></Field>
            <Field label="Area (sq ft)"><TextInput type="number" min="1" value={f.area_sqft} onChange={set("area_sqft")} /></Field>
            <Field label="Property type"><Select options={TYPES} value={f.property_type} onChange={set("property_type")} /></Field>
            <Field label="Building age (years)"><TextInput type="number" min="0" value={f.building_age_years} onChange={set("building_age_years")} /></Field>
          </Grid>
          <fieldset style={{ border: 0, padding: 0, margin: "0 0 16px" }}>
            <legend style={{ color: "#94a3b8", fontSize: 14, marginBottom: 8 }}>Amenities</legend>
            {AMENITIES.map((a) => (
              <label key={a} style={{ marginRight: 16, display: "inline-flex", gap: 6, alignItems: "center", fontSize: 14 }}>
                <input type="checkbox" checked={amen.includes(a)} onChange={() => toggle(a)} style={{ accentColor: "#f97316" }} />{a}
              </label>))}
          </fieldset>
          <Button type="submit" loading={loading}>{loading ? "Valuing…" : "Estimate value"}</Button>
        </form>
        <Status loading={loading} error={error} />
      </Card>
      {data && (<>
        <FallbackNotice data={data} />
        <Card title="Valuation range">
          <Grid><Stat label="Minimum" value={inr(r.min)} /><Stat label="Average" value={inr(r.avg)} /><Stat label="Maximum" value={inr(r.max)} /></Grid>
        </Card>
        <Card title="Market indicators">
          <Grid><Stat label="Price per sq ft" value={inr(data.price_per_sqft)} /><Stat label="Rental yield" value={`${data.rental_yield_percentage}%`} /></Grid>
        </Card>
        <Card title="5-year appreciation outlook"><p style={{ margin: 0, lineHeight: 1.6 }}>{data.appreciation_outlook_5yr}</p></Card>
        <Card title="ROI analysis"><p style={{ margin: 0, lineHeight: 1.6 }}>{data.roi_analysis}</p></Card>
        <small style={{ color: "#94a3b8" }}>AI estimate for guidance only; confirm with a registered valuer before transacting.</small>
      </>)}
    </Page>
  );
}

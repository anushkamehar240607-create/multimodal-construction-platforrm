import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Page, Card, Button, TextInput, Status, Bullets, api, errMsg, C } from "./ui.js";

export default function ConstructionChatbot() {
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hi! Ask me about construction standards, IS codes, or site safety." }]);
  const [suggest, setSuggest] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async (e, text) => {
    e?.preventDefault();
    const message = (text ?? input).trim();
    if (!message || loading) return;
    const history = msgs.slice(1);
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setInput(""); setError(""); setLoading(true);
    try {
      const { data } = await api.post("/api/chatbot", { message, history });
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
      setSuggest(Array.isArray(data.action_suggestions) ? data.action_suggestions : []);
    } catch (err) { setError(errMsg(err)); }
    finally { setLoading(false); }
  };

  return (
    <Page icon={MessageSquare} title="Construction Chatbot" subtitle="Standards, protocols and practical site guidance.">
      <Card style={{ height: 420, overflowY: "auto" }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
            <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: 12, whiteSpace: "pre-wrap", lineHeight: 1.55,
              background: m.role === "user" ? C.accent : C.bg, color: "#fff" }}>{m.content}</div>
          </div>))}
        {loading && <p style={{ color: C.muted }} role="status">Thinking…</p>}
        <div ref={end} />
      </Card>
      <Status error={error} />
      {suggest.length > 0 && (
        <Card title="Suggested next steps">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggest.map((s, i) => (
              <button key={i} disabled={loading} onClick={() => send(null, String(s))}
                style={{ background: C.bg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 999, padding: "6px 14px", cursor: loading ? "not-allowed" : "pointer" }}>{String(s)}</button>))}
          </div>
        </Card>)}
      <form onSubmit={send} style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><TextInput value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder="e.g. What is the minimum cover for RCC columns?" aria-label="Message" /></div>
        <Button type="submit" loading={loading} disabled={!input.trim()}><Send size={16} /> Send</Button>
      </form>
    </Page>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp, CheckCircle2, Circle, Loader2, AlertTriangle,
  ChevronRight, ArrowLeft,
} from "lucide-react";
import { cn, type Agent, type AnalyzeRequest, SECTION_LABELS } from "../utils";

const TEAM_ORDER = [
  "Analyst Team",
  "Research Team",
  "Trading Team",
  "Risk Management",
  "Portfolio Management",
];

function AnalyzeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<{ type: string; content: string; ts: string }[]>([]);
  const [reports, setReports] = useState<Record<string, string>>({});
  const [finalDecision, setFinalDecision] = useState<{ decision: string; signal: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const configRef = useRef<AnalyzeRequest | null>(null);
  const rawConfig = searchParams.get("config");
  const displayTicker: string = (() => { try { return rawConfig ? (JSON.parse(rawConfig) as AnalyzeRequest).ticker : ""; } catch { return ""; } })();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  const addMessage = useCallback((type: string, content: string) => {
    const ts = new Date().toLocaleTimeString();
    setMessages(prev => [...prev.slice(-200), { type, content, ts }]);
  }, []);

  const handleEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case "agents_init":
        setAgents((data.agents as Agent[]) ?? []);
        addMessage("system", `Starting analysis for ${configRef.current?.ticker} on ${configRef.current?.analysis_date}`);
        break;
      case "agent_status":
        setAgents(prev =>
          prev.map(a => a.name === data.name ? { ...a, status: data.status as Agent["status"] } : a)
        );
        if (data.status === "in_progress") addMessage("agent", `${data.name} is analyzing...`);
        if (data.status === "completed") addMessage("agent", `${data.name} completed`);
        break;
      case "report_section":
        setReports(prev => ({ ...prev, [data.section as string]: data.content as string }));
        addMessage("report", `${SECTION_LABELS[data.section as string] ?? data.section} ready`);
        break;
      case "final_decision":
        setFinalDecision({ decision: data.decision as string, signal: data.signal as string });
        addMessage("decision", `Final signal: ${data.signal}`);
        break;
      case "done":
        setDone(true);
        addMessage("system", "Analysis complete!");
        break;
      case "error":
        setError(data.message as string);
        addMessage("error", `Error: ${data.message}`);
        break;
    }
  }, [addMessage]);

  const startAnalysis = useCallback(async (cfg: AnalyzeRequest) => {
    try {
      const res = await fetch("http://localhost:8000/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const eventMatch = part.match(/^event: (.+)$/m);
          const dataMatch = part.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1].trim();
          const data = JSON.parse(dataMatch[1]);
          handleEvent(event, data);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      addMessage("error", `Connection failed: ${msg}`);
    }
  }, [addMessage, handleEvent]);

  useEffect(() => {
    const raw = searchParams.get("config");
    if (!raw) { router.push("/"); return; }
    if (hasStarted.current) return;
    let cfg: AnalyzeRequest;
    try { cfg = JSON.parse(raw) as AnalyzeRequest; } catch { router.push("/"); return; }
    hasStarted.current = true;
    configRef.current = cfg;
    setTimeout(() => startAnalysis(cfg), 0);
  }, [searchParams, router, startAnalysis]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const groupedAgents = TEAM_ORDER.map(team => ({
    team,
    agents: agents.filter(a => a.team === team),
  })).filter(g => g.agents.length > 0);

  const completedCount = agents.filter(a => a.status === "completed").length;
  const progress = agents.length > 0 ? (completedCount / agents.length) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
            <TrendingUp size={16} style={{ color: "var(--accent)" }} />
          </div>
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>TradingAgents</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>/ Analyzing</span>
          {displayTicker && (
            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
              {displayTicker}
            </span>
          )}
        </div>
        <button onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--muted)" }}>
          <ArrowLeft size={14} /> Back
        </button>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Agent pipeline */}
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: "var(--muted)" }}>Pipeline Progress</span>
              <span className="font-mono" style={{ color: "var(--accent)" }}>
                {completedCount}/{agents.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "var(--accent)" }}
              />
            </div>
          </div>

          {/* Agent teams */}
          {groupedAgents.map(({ team, agents: teamAgents }) => (
            <div key={team} className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}>
              <div className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
                style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                {team}
              </div>
              <div className="divide-y divide-zinc-800">
                {teamAgents.map(agent => (
                  <div key={agent.name}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: "var(--surface)" }}>
                    {agent.status === "completed" && (
                      <CheckCircle2 size={16} style={{ color: "var(--green)", flexShrink: 0 }} />
                    )}
                    {agent.status === "in_progress" && (
                      <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent)", flexShrink: 0 }} />
                    )}
                    {agent.status === "pending" && (
                      <Circle size={16} style={{ color: "var(--border)", flexShrink: 0 }} />
                    )}
                    {agent.status === "error" && (
                      <AlertTriangle size={16} style={{ color: "var(--red)", flexShrink: 0 }} />
                    )}
                    <span className={cn(
                      "text-sm",
                      agent.status === "completed" && "text-zinc-300",
                      agent.status === "in_progress" && "font-medium",
                      agent.status === "pending" && "text-zinc-600",
                    )}
                      style={agent.status === "in_progress" ? { color: "var(--foreground)" } : {}}>
                      {agent.name}
                    </span>
                    {agent.status === "in_progress" && (
                      <span className="ml-auto text-xs animate-pulse-glow" style={{ color: "var(--accent)" }}>
                        active
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Final decision badge */}
          {finalDecision && (
            <div className="rounded-xl p-4 space-y-2"
              style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                Final Signal
              </p>
              <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                {finalDecision.signal}
              </p>
            </div>
          )}

          {/* View Report button */}
          {done && (
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  config: searchParams.get("config") ?? "",
                  reports: JSON.stringify(reports),
                  decision: JSON.stringify(finalDecision),
                });
                router.push(`/report?${params.toString()}`);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: "var(--accent)", color: "#000" }}>
              View Full Report
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Right: Live log + partial reports */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live message log */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-2.5 flex items-center justify-between"
              style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Live Feed
              </span>
              {!done && !error && (
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--accent)" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                  streaming
                </span>
              )}
            </div>
            <div className="h-56 overflow-y-auto p-4 space-y-1.5 font-mono text-xs"
              style={{ background: "var(--surface)" }}>
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-2">
                  <span style={{ color: "var(--muted)" }}>{msg.ts}</span>
                  <span className={cn(
                    msg.type === "error" && "text-red-400",
                    msg.type === "decision" && "text-yellow-400 font-bold",
                    msg.type === "report" && "text-cyan-400",
                    msg.type === "agent" && "text-zinc-300",
                    msg.type === "system" && "text-zinc-500",
                  )}>
                    {msg.content}
                  </span>
                </div>
              ))}
              {!done && !error && messages.length === 0 && (
                <span style={{ color: "var(--muted)" }}>Waiting for server response…</span>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Report sections as they arrive */}
          {Object.entries(reports).map(([section, content]) => (
            content && (
              <div key={section} className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)" }}>
                <div className="px-4 py-2.5 flex items-center gap-2"
                  style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  <CheckCircle2 size={13} style={{ color: "var(--green)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                    {SECTION_LABELS[section] ?? section}
                  </span>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ background: "var(--surface)", color: "#d4d4d8" }}>
                  {content.slice(0, 800)}{content.length > 800 ? "…" : ""}
                </div>
              </div>
            )
          ))}

          {error && (
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}>
              <AlertTriangle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Analysis Error</p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{error}</p>
                <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
                  Make sure the backend server is running: <code className="text-cyan-400">uv run --native-tls python web/server.py</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <AnalyzeInner />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  TrendingUp, ArrowLeft, Download, BarChart2, MessageSquare,
  Newspaper, BookOpen, GitPullRequest, TrendingDown, ShieldAlert, Award,
} from "lucide-react";
import { SECTION_LABELS, getSignalColor, getSignalBg, type AnalyzeRequest } from "../utils";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  market_report:          <BarChart2 size={14} />,
  sentiment_report:       <MessageSquare size={14} />,
  news_report:            <Newspaper size={14} />,
  fundamentals_report:    <BookOpen size={14} />,
  investment_plan:        <GitPullRequest size={14} />,
  trader_investment_plan: <TrendingDown size={14} />,
  risk_debate:            <ShieldAlert size={14} />,
  final_trade_decision:   <Award size={14} />,
};

const SECTION_ORDER = [
  "market_report",
  "sentiment_report",
  "news_report",
  "fundamentals_report",
  "investment_plan",
  "trader_investment_plan",
  "risk_debate",
  "final_trade_decision",
];

function ReportInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawConfig  = searchParams.get("config");
  const rawReports = searchParams.get("reports");
  const rawDecision = searchParams.get("decision");

  let config: AnalyzeRequest | null = null;
  let reports: Record<string, string> = {};
  let finalDecision: { decision: string; signal: string } | null = null;

  try { if (rawConfig)   config       = JSON.parse(rawConfig); }   catch { /* ignore */ }
  try { if (rawReports)  reports      = JSON.parse(rawReports); }  catch { /* ignore */ }
  try { if (rawDecision) finalDecision = JSON.parse(rawDecision); } catch { /* ignore */ }

  const sections = SECTION_ORDER.filter(s => reports[s]);

  function handleDownload() {
    const parts: string[] = [];
    if (config) {
      parts.push(`# TradingAgents Report`);
      parts.push(`**Ticker:** ${config.ticker}  **Date:** ${config.analysis_date}`);
      if (finalDecision) parts.push(`**Signal:** ${finalDecision.signal}\n`);
    }
    for (const s of SECTION_ORDER) {
      if (reports[s]) {
        parts.push(`## ${SECTION_LABELS[s] ?? s}\n\n${reports[s]}`);
      }
    }
    const blob = new Blob([parts.join("\n\n---\n\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config?.ticker ?? "report"}_${config?.analysis_date ?? "report"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
            <TrendingUp size={16} style={{ color: "var(--accent)" }} />
          </div>
          <span className="font-semibold" style={{ color: "var(--foreground)" }}>TradingAgents</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>/ Report</span>
          {config && (
            <span className="font-mono font-bold text-sm px-2 py-0.5 rounded"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
              {config.ticker}
            </span>
          )}
          {config && (
            <span className="text-sm" style={{ color: "var(--muted)" }}>{config.analysis_date}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--muted)" }}>
            <Download size={13} /> Export MD
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--muted)" }}>
            <ArrowLeft size={14} /> New Analysis
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: signal + section nav */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Final signal card */}
          {finalDecision && (
            <div className={`rounded-xl p-5 border ${getSignalBg(finalDecision.signal)}`}>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
                Final Decision
              </p>
              <p className={`text-3xl font-bold mb-3 ${getSignalColor(finalDecision.signal)}`}>
                {finalDecision.signal}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {finalDecision.decision?.slice(0, 200)}{(finalDecision.decision?.length ?? 0) > 200 ? "…" : ""}
              </p>
            </div>
          )}

          {/* Section nav */}
          <nav className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}>
            <div className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider"
              style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
              Sections
            </div>
            {sections.map(s => (
              <a key={s} href={`#${s}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:opacity-80"
                style={{ background: "var(--surface)", color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
                {SECTION_ICONS[s]}
                {SECTION_LABELS[s] ?? s}
              </a>
            ))}
          </nav>

          {/* Meta */}
          {config && (
            <div className="rounded-xl p-4 space-y-2 text-xs"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Provider</span>
                <span style={{ color: "var(--foreground)" }}>{config.llm_provider}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Deep model</span>
                <span className="font-mono" style={{ color: "var(--foreground)" }}>{config.deep_think_llm}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Language</span>
                <span style={{ color: "var(--foreground)" }}>{config.output_language}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Analysts</span>
                <span style={{ color: "var(--foreground)" }}>{config.analysts.length}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--muted)" }}>Debate rounds</span>
                <span style={{ color: "var(--foreground)" }}>{config.max_debate_rounds}</span>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {sections.length === 0 && (
            <div className="rounded-xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p style={{ color: "var(--muted)" }}>No report sections available. Run an analysis first.</p>
              <button onClick={() => router.push("/")}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#000" }}>
                Start Analysis
              </button>
            </div>
          )}

          {sections.map(section => (
            <section key={section} id={section} className="rounded-xl overflow-hidden scroll-mt-24"
              style={{ border: "1px solid var(--border)" }}>
              <div className="px-5 py-3.5 flex items-center gap-2.5"
                style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--accent)" }}>{SECTION_ICONS[section]}</span>
                <h2 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                  {SECTION_LABELS[section] ?? section}
                </h2>
              </div>
              <div className="p-5 prose prose-sm max-w-none"
                style={{ background: "var(--surface)" }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reports[section]}
                </ReactMarkdown>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-sm" style={{ color: "var(--muted)" }}>Loading report…</div>
      </div>
    }>
      <ReportInner />
    </Suspense>
  );
}

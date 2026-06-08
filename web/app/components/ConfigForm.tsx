"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Calendar, Brain, Users, Globe, ChevronRight,
  Zap, BarChart2, Newspaper, MessageSquare, BookOpen, Settings2,
} from "lucide-react";
import { cn, PROVIDERS, LANGUAGES, ANALYST_OPTIONS, type AnalyzeRequest } from "../utils";

const DEFAULT_MODELS: Record<string, { deep: string; quick: string }> = {
  openai:      { deep: "gpt-4o",            quick: "gpt-4o-mini" },
  anthropic:   { deep: "claude-opus-4-5",   quick: "claude-sonnet-4-5" },
  google:      { deep: "gemini-2.0-flash",  quick: "gemini-2.0-flash" },
  xai:         { deep: "grok-4",            quick: "grok-3-mini" },
  deepseek:    { deep: "deepseek-reasoner", quick: "deepseek-chat" },
  qwen:        { deep: "qwen-max",          quick: "qwen-turbo" },
  "qwen-cn":   { deep: "qwen-max",          quick: "qwen-turbo" },
  glm:         { deep: "glm-4",             quick: "glm-4-flash" },
  "glm-cn":    { deep: "glm-4",             quick: "glm-4-flash" },
  minimax:     { deep: "MiniMax-Text-01",   quick: "MiniMax-Text-01" },
  "minimax-cn":{ deep: "MiniMax-Text-01",   quick: "MiniMax-Text-01" },
  openrouter:  { deep: "openai/gpt-4o",     quick: "openai/gpt-4o-mini" },
  ollama:      { deep: "llama3",            quick: "llama3" },
  azure:       { deep: "gpt-4o",            quick: "gpt-4o-mini" },
};

const DEPTH_OPTIONS = [
  { value: 1, label: "Standard", desc: "1 debate round — fast & efficient" },
  { value: 2, label: "Deep",     desc: "2 rounds — balanced depth" },
  { value: 3, label: "Thorough", desc: "3 rounds — most comprehensive" },
];

export default function ConfigForm() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [ticker, setTicker] = useState("AAPL");
  const [date, setDate] = useState(today);
  const [provider, setProvider] = useState("openai");
  const [deepModel, setDeepModel] = useState(DEFAULT_MODELS.openai.deep);
  const [quickModel, setQuickModel] = useState(DEFAULT_MODELS.openai.quick);
  const [analysts, setAnalysts] = useState(["market", "social", "news", "fundamentals"]);
  const [depth, setDepth] = useState(1);
  const [language, setLanguage] = useState("English");
  const [backendUrl, setBackendUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  function handleProviderChange(p: string) {
    setProvider(p);
    const m = DEFAULT_MODELS[p] ?? DEFAULT_MODELS.openai;
    setDeepModel(m.deep);
    setQuickModel(m.quick);
  }

  function toggleAnalyst(key: string) {
    setAnalysts(prev =>
      prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim() || analysts.length === 0) return;

    const req: AnalyzeRequest = {
      ticker: ticker.trim().toUpperCase(),
      analysis_date: date,
      llm_provider: provider,
      deep_think_llm: deepModel,
      quick_think_llm: quickModel,
      analysts,
      max_debate_rounds: depth,
      max_risk_discuss_rounds: depth,
      output_language: language,
      backend_url: backendUrl || undefined,
    };

    const params = new URLSearchParams({ config: JSON.stringify(req) });
    router.push(`/analyze?${params.toString()}`);
  }

  const analystIcons: Record<string, React.ReactNode> = {
    market:       <BarChart2 size={16} />,
    social:       <MessageSquare size={16} />,
    news:         <Newspaper size={16} />,
    fundamentals: <BookOpen size={16} />,
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-dim)", border: "1px solid var(--accent)" }}>
            <TrendingUp size={16} style={{ color: "var(--accent)" }} />
          </div>
          <span className="font-semibold text-base" style={{ color: "var(--foreground)" }}>
            TradingAgents
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full ml-1"
            style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid rgba(34,211,238,0.2)" }}>
            v0.2.5
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ color: "var(--foreground)" }}>
            Multi-Agent Trading Analysis
          </h1>
          <p className="text-lg" style={{ color: "var(--muted)" }}>
            Analyst team · Researcher debate · Risk management · Portfolio decision
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Ticker + Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
                <TrendingUp size={14} /> Ticker Symbol
              </label>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                placeholder="e.g. AAPL, 0700.HK, BTC-USD"
                required
                className="w-full bg-transparent text-2xl font-mono font-bold outline-none placeholder:text-zinc-700"
                style={{ color: "var(--foreground)" }}
              />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Supports US, HK, JP, CN, IN, AU, Crypto
              </p>
            </div>

            <div className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <label className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
                <Calendar size={14} /> Analysis Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full bg-transparent text-2xl font-mono font-bold outline-none"
                style={{ color: "var(--foreground)", colorScheme: "dark" }}
              />
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Historical or recent trading date
              </p>
            </div>
          </div>

          {/* Analyst Selection */}
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Users size={14} style={{ color: "var(--muted)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>Analyst Team</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {ANALYST_OPTIONS.map(opt => {
                const active = analysts.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleAnalyst(opt.value)}
                    className="flex flex-col gap-1.5 p-3 rounded-lg text-left transition-all"
                    style={{
                      background: active ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      color: active ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      {analystIcons[opt.value]}
                      {opt.label.replace(" Analyst", "")}
                    </div>
                    <p className="text-xs leading-tight" style={{ color: "var(--muted)", opacity: 0.8 }}>
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LLM Provider */}
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Brain size={14} style={{ color: "var(--muted)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>LLM Provider & Models</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Provider</label>
                <select
                  value={provider}
                  onChange={e => handleProviderChange(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Deep Thinker (complex reasoning)</label>
                <input
                  type="text"
                  value={deepModel}
                  onChange={e => setDeepModel(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs" style={{ color: "var(--muted)" }}>Quick Thinker (fast tasks)</label>
                <input
                  type="text"
                  value={quickModel}
                  onChange={e => setQuickModel(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
              </div>
            </div>
          </div>

          {/* Depth + Language row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: "var(--muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>Research Depth</span>
              </div>
              <div className="flex gap-2">
                {DEPTH_OPTIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDepth(d.value)}
                    className={cn("flex-1 rounded-lg py-2.5 text-sm font-medium transition-all")}
                    style={{
                      background: depth === d.value ? "var(--accent-dim)" : "var(--surface-2)",
                      border: `1px solid ${depth === d.value ? "var(--accent)" : "var(--border)"}`,
                      color: depth === d.value ? "var(--accent)" : "var(--muted)",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {DEPTH_OPTIONS.find(d => d.value === depth)?.desc}
              </p>
            </div>

            <div className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <Globe size={14} style={{ color: "var(--muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>Output Language</span>
              </div>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Reports will be generated in this language
              </p>
            </div>
          </div>

          {/* Advanced */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm transition-colors"
              style={{ background: "var(--surface)", color: "var(--muted)" }}
            >
              <div className="flex items-center gap-2">
                <Settings2 size={14} />
                Advanced Settings
              </div>
              <ChevronRight
                size={14}
                className={cn("transition-transform", showAdvanced && "rotate-90")}
              />
            </button>
            {showAdvanced && (
              <div className="px-5 pb-5 pt-4 space-y-3" style={{ background: "var(--surface)" }}>
                <div className="space-y-1.5">
                  <label className="text-xs" style={{ color: "var(--muted)" }}>
                    Custom Backend URL <span className="opacity-50">(Ollama / Azure / proxy)</span>
                  </label>
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={e => setBackendUrl(e.target.value)}
                    placeholder="e.g. http://localhost:11434/v1"
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!ticker.trim() || analysts.length === 0}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--accent)",
              color: "#000",
            }}
          >
            Start Analysis
            <ChevronRight size={18} />
          </button>
        </form>
      </main>

      <footer className="border-t py-5" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>TradingAgents · For research purposes only</span>
          <a href="https://github.com/TauricResearch/TradingAgents" target="_blank" rel="noopener noreferrer"
            className="hover:underline" style={{ color: "var(--accent)" }}>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

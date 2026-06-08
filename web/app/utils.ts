import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AgentStatus = "pending" | "in_progress" | "completed" | "error";

export interface Agent {
  name: string;
  team: string;
  status: AgentStatus;
}

export interface ReportSection {
  section: string;
  content: string;
}

export interface AnalyzeRequest {
  ticker: string;
  analysis_date: string;
  llm_provider: string;
  deep_think_llm: string;
  quick_think_llm: string;
  analysts: string[];
  max_debate_rounds: number;
  max_risk_discuss_rounds: number;
  output_language: string;
  backend_url?: string;
}

export const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "qwen", label: "Qwen (International)" },
  { value: "qwen-cn", label: "Qwen (China)" },
  { value: "glm", label: "GLM (International)" },
  { value: "glm-cn", label: "GLM (China)" },
  { value: "minimax", label: "MiniMax (Global)" },
  { value: "minimax-cn", label: "MiniMax (China)" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "azure", label: "Azure OpenAI" },
];

export const LANGUAGES = [
  "English", "中文", "日本語", "한국어", "Español", "Français", "Deutsch", "Português", "Русский",
];

export const ANALYST_OPTIONS = [
  { value: "market", label: "Market Analyst", desc: "Technical indicators & price patterns" },
  { value: "social", label: "Sentiment Analyst", desc: "Social media & market mood" },
  { value: "news", label: "News Analyst", desc: "Global news & macro events" },
  { value: "fundamentals", label: "Fundamentals Analyst", desc: "Financials & company metrics" },
];

export const SECTION_LABELS: Record<string, string> = {
  market_report: "Market Analysis",
  sentiment_report: "Sentiment Analysis",
  news_report: "News Analysis",
  fundamentals_report: "Fundamentals Analysis",
  investment_plan: "Research Team Debate",
  trader_investment_plan: "Trader Decision",
  risk_debate: "Risk Management Debate",
  final_trade_decision: "Final Decision",
};

export function getSignalColor(signal: string): string {
  const s = signal?.toLowerCase();
  if (s?.includes("buy") || s?.includes("long")) return "text-green-400";
  if (s?.includes("sell") || s?.includes("short")) return "text-red-400";
  return "text-yellow-400";
}

export function getSignalBg(signal: string): string {
  const s = signal?.toLowerCase();
  if (s?.includes("buy") || s?.includes("long")) return "bg-green-400/10 border-green-400/30";
  if (s?.includes("sell") || s?.includes("short")) return "bg-red-400/10 border-red-400/30";
  return "bg-yellow-400/10 border-yellow-400/30";
}

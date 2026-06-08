"""FastAPI backend for TradingAgents Web UI.

Streams analysis progress via Server-Sent Events (SSE).
Run: uv run --native-tls python web/server.py
"""

from __future__ import annotations

import asyncio
import json
import sys
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional

# Make sure the project root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from tradingagents.default_config import DEFAULT_CONFIG
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.llm_clients.model_catalog import get_model_options

app = FastAPI(title="TradingAgents API", version="0.2.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    ticker: str
    analysis_date: str
    llm_provider: str = "openai"
    deep_think_llm: str = "gpt-4o"
    quick_think_llm: str = "gpt-4o-mini"
    analysts: List[str] = ["market", "social", "news", "fundamentals"]
    max_debate_rounds: int = 1
    max_risk_discuss_rounds: int = 1
    output_language: str = "English"
    backend_url: Optional[str] = None


# ── SSE helpers ──────────────────────────────────────────────────────────────

def sse(event: str, data: Any) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


# ── Analysis stream ──────────────────────────────────────────────────────────

AGENT_TEAM_MAP = {
    "Market Analyst": "Analyst Team",
    "Sentiment Analyst": "Analyst Team",
    "News Analyst": "Analyst Team",
    "Fundamentals Analyst": "Analyst Team",
    "Bull Researcher": "Research Team",
    "Bear Researcher": "Research Team",
    "Research Manager": "Research Team",
    "Trader": "Trading Team",
    "Aggressive Analyst": "Risk Management",
    "Conservative Analyst": "Risk Management",
    "Neutral Analyst": "Risk Management",
    "Portfolio Manager": "Portfolio Management",
}

ANALYST_MAPPING = {
    "market": "Market Analyst",
    "social": "Sentiment Analyst",
    "news": "News Analyst",
    "fundamentals": "Fundamentals Analyst",
}

FIXED_AGENTS = [
    "Bull Researcher", "Bear Researcher", "Research Manager",
    "Trader",
    "Aggressive Analyst", "Conservative Analyst", "Neutral Analyst",
    "Portfolio Manager",
]


async def run_analysis_stream(req: AnalyzeRequest):
    """Run TradingAgentsGraph in a thread and stream SSE events."""

    queue: asyncio.Queue[Optional[str]] = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def worker():
        try:
            config = DEFAULT_CONFIG.copy()
            config["llm_provider"] = req.llm_provider.lower()
            config["deep_think_llm"] = req.deep_think_llm
            config["quick_think_llm"] = req.quick_think_llm
            config["max_debate_rounds"] = req.max_debate_rounds
            config["max_risk_discuss_rounds"] = req.max_risk_discuss_rounds
            config["output_language"] = req.output_language
            if req.backend_url:
                config["backend_url"] = req.backend_url

            # Build initial agent status list
            agents = []
            for key in req.analysts:
                name = ANALYST_MAPPING.get(key)
                if name:
                    agents.append({"name": name, "team": "Analyst Team", "status": "pending"})
            for name in FIXED_AGENTS:
                agents.append({"name": name, "team": AGENT_TEAM_MAP[name], "status": "pending"})

            loop.call_soon_threadsafe(
                queue.put_nowait,
                sse("agents_init", {"agents": agents}),
            )

            # Determine asset type
            ticker_upper = req.ticker.upper()
            crypto_suffixes = ("-USD", "-USDT", "-USDC", "-BTC", "-ETH")
            asset_type = "crypto" if ticker_upper.endswith(crypto_suffixes) else "stock"

            graph = TradingAgentsGraph(
                selected_analysts=req.analysts,
                config=config,
                debug=False,
            )

            instrument_context = graph.resolve_instrument_context(req.ticker, asset_type)
            init_state = graph.propagator.create_initial_state(
                req.ticker,
                req.analysis_date,
                asset_type=asset_type,
                instrument_context=instrument_context,
                past_context=graph.memory_log.get_past_context(req.ticker),
            )
            graph_args = graph.propagator.get_graph_args()

            active_analysts = list(req.analysts)
            analyst_index = 0

            # Mark first analyst as in_progress
            if active_analysts:
                first = ANALYST_MAPPING.get(active_analysts[0])
                if first:
                    loop.call_soon_threadsafe(
                        queue.put_nowait,
                        sse("agent_status", {"name": first, "status": "in_progress"}),
                    )

            reports: Dict[str, str] = {}

            for chunk in graph.graph.stream(init_state, **graph_args):
                # Analyst reports
                for section, analyst_key, agent_name in [
                    ("market_report", "market", "Market Analyst"),
                    ("sentiment_report", "social", "Sentiment Analyst"),
                    ("news_report", "news", "News Analyst"),
                    ("fundamentals_report", "fundamentals", "Fundamentals Analyst"),
                ]:
                    if analyst_key in req.analysts and chunk.get(section):
                        content = chunk[section]
                        if content and content != reports.get(section):
                            reports[section] = content
                            loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": agent_name, "status": "completed"}))
                            loop.call_soon_threadsafe(queue.put_nowait, sse("report_section", {"section": section, "content": content}))
                            # Advance analyst progress
                            analyst_index += 1
                            if analyst_index < len(active_analysts):
                                next_name = ANALYST_MAPPING.get(active_analysts[analyst_index])
                                if next_name:
                                    loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": next_name, "status": "in_progress"}))
                            else:
                                loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Bull Researcher", "status": "in_progress"}))

                # Research team debate
                if chunk.get("investment_debate_state"):
                    ds = chunk["investment_debate_state"]
                    if ds.get("bull_history"):
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Bull Researcher", "status": "in_progress"}))
                    if ds.get("bear_history"):
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Bear Researcher", "status": "in_progress"}))
                    if ds.get("judge_decision"):
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Bull Researcher", "status": "completed"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Bear Researcher", "status": "completed"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Research Manager", "status": "completed"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Trader", "status": "in_progress"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("report_section", {
                            "section": "investment_plan",
                            "content": (
                                "### Bull Analysis\n" + ds.get("bull_history", "") +
                                "\n\n### Bear Analysis\n" + ds.get("bear_history", "") +
                                "\n\n### Research Manager Decision\n" + ds.get("judge_decision", "")
                            )
                        }))

                # Trader
                if chunk.get("trader_investment_plan"):
                    plan = chunk["trader_investment_plan"]
                    loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Trader", "status": "completed"}))
                    loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Aggressive Analyst", "status": "in_progress"}))
                    loop.call_soon_threadsafe(queue.put_nowait, sse("report_section", {"section": "trader_investment_plan", "content": plan}))

                # Risk debate
                if chunk.get("risk_debate_state"):
                    rs = chunk["risk_debate_state"]
                    if rs.get("judge_decision"):
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Aggressive Analyst", "status": "completed"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Conservative Analyst", "status": "completed"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Neutral Analyst", "status": "completed"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Portfolio Manager", "status": "in_progress"}))
                        loop.call_soon_threadsafe(queue.put_nowait, sse("report_section", {
                            "section": "risk_debate",
                            "content": (
                                "### Aggressive Analyst\n" + rs.get("aggressive_history", "") +
                                "\n\n### Conservative Analyst\n" + rs.get("conservative_history", "") +
                                "\n\n### Neutral Analyst\n" + rs.get("neutral_history", "") +
                                "\n\n### Risk Judge Decision\n" + rs.get("judge_decision", "")
                            )
                        }))

                # Final decision
                if chunk.get("final_trade_decision"):
                    decision = chunk["final_trade_decision"]
                    signal = graph.process_signal(decision)
                    loop.call_soon_threadsafe(queue.put_nowait, sse("agent_status", {"name": "Portfolio Manager", "status": "completed"}))
                    loop.call_soon_threadsafe(queue.put_nowait, sse("report_section", {"section": "final_trade_decision", "content": decision}))
                    loop.call_soon_threadsafe(queue.put_nowait, sse("final_decision", {"decision": decision, "signal": signal}))

            loop.call_soon_threadsafe(queue.put_nowait, sse("done", {"message": "Analysis complete"}))
            loop.call_soon_threadsafe(queue.put_nowait, None)

        except Exception as e:
            err = traceback.format_exc()
            loop.call_soon_threadsafe(queue.put_nowait, sse("error", {"message": str(e), "detail": err}))
            loop.call_soon_threadsafe(queue.put_nowait, None)

    asyncio.get_event_loop().run_in_executor(None, worker)

    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
    finally:
        pass


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.2.5"}


@app.get("/api/models")
async def get_models(provider: str = "openai"):
    try:
        options = get_model_options(provider.lower())
        return {"provider": provider, "models": options}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    return StreamingResponse(
        run_analysis_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

import time
from fastapi import APIRouter, HTTPException, status
from app.services.insights import get_supabase_client
from app.services.analytics import compute_financial_kpis, get_ai_context_metrics
from app.services.market_news import fetch_portfolio_news
from app.services.ai_insights import generate_financial_insights

router = APIRouter()

# 6-Hour in-memory cache
CACHE_DURATION_SEC = 6 * 3600
insights_cache = {
    "timestamp": 0,
    "data": None
}

@router.get("/")
async def get_insights(bypass_cache: bool = False):
    """
    Returns structured AI executive reports based on portfolio KPI analysis and market news.
    Cached for 6 hours.
    """
    now = time.time()
    if not bypass_cache and insights_cache["data"] and (now - insights_cache["timestamp"] < CACHE_DURATION_SEC):
        return insights_cache["data"]
        
    try:
        supabase = get_supabase_client()
        
        # 1. Fetch transactions
        res = supabase.table("transactions").select("*").execute()
        transactions = res.data or []
        
        # 2. Compute deterministic KPIs for AI context
        metrics = get_ai_context_metrics(user_id="anonymous", supabase=supabase)
        
        # 3. Extract held entities for news lookup
        held_entities = list(set([tx.get("clean_entity") for tx in transactions if tx.get("clean_entity")]))
        
        # 4. Fetch market news
        news = fetch_portfolio_news(held_entities)
        
        # 5. Generate structured report (Gemini Flash or offline fallback)
        report = generate_financial_insights(metrics, news)
        
        # Cache results
        payload = {
            "report": report.dict(),
            "news": news
        }
        insights_cache["timestamp"] = now
        insights_cache["data"] = payload
        
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate structured financial report: {str(e)}"
        )

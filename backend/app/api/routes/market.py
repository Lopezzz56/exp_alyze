from fastapi import APIRouter, HTTPException, status
from app.services.insights import get_supabase_client
from app.services.market_news import resolve_ticker, fetch_indices_overview, fetch_corporate_events_and_news

router = APIRouter()

@router.get("/overview")
async def get_market_overview():
    """
    Returns live benchmark indices, dynamic resolved portfolio tickers, upcoming corporate action calendars,
    and portfolio news items grouped by active holdings.
    """
    try:
        supabase = get_supabase_client()
        
        # 1. Fetch clean entities and revenue streams to scan for stock holdings
        res = supabase.table("transactions") \
            .select("clean_entity, revenue_stream") \
            .execute()
            
        known_stocks = ["TITAN", "NESTLE", "TCS", "PIDILITE", "ADITYA BIRLA", "PERSISTENT", "RELIANCE", "KOTAK"]
        raw_entities = []
        for item in res.data or []:
            entity = item.get("clean_entity")
            stream = item.get("revenue_stream") or ""
            if not entity:
                continue
            
            is_dividend = "dividend" in stream.lower()
            is_stock_keyword = any(k in entity.upper() for k in known_stocks)
            
            if is_dividend or is_stock_keyword:
                raw_entities.append(entity)
                
        raw_entities = list(set(raw_entities))
        
        # If no active stock dividend cash transfers are logged yet, check all unique entities to keep hub populated
        if not raw_entities:
            all_res = supabase.table("transactions").select("clean_entity").execute()
            raw_entities = list(set([item.get("clean_entity") for item in all_res.data or [] if item.get("clean_entity")]))
            
        # Limit lookup to top 8 entities to prevent API throttling
        entities = raw_entities[:8]
        
        # 2. Dynamically resolve ticker symbols using Yahoo Finance search
        tickers = []
        entities_map = {}
        resolved_companies = []
        
        for name in entities:
            # We filter out generic unresolved entities
            if "unresolved" in name.lower() or "personal" in name.lower():
                continue
            ticker = await resolve_ticker(name)
            if ticker:
                tickers.append(ticker)
                entities_map[ticker] = name
                resolved_companies.append({
                    "name": name,
                    "ticker": ticker
                })
                
        # 3. Fetch benchmark indices overview (NIFTY 50, SENSEX, NIFTY BANK)
        indices = await fetch_indices_overview()
        
        # 4. Fetch corporate actions calendar and holdings news
        details = await fetch_corporate_events_and_news(tickers, entities_map)
        
        return {
            "indices": indices,
            "companies": resolved_companies,
            "events": details.get("events", []),
            "news": details.get("news", [])
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile dynamic market overview: {str(e)}"
        )

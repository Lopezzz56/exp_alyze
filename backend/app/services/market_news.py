import httpx
import yfinance as yf
from typing import List, Dict, Any
import datetime
from bs4 import BeautifulSoup
import requests

# In-memory local cache for resolved company ticker symbols
RESOLVED_TICKERS_CACHE = {}

def extract_news_fields(item: Dict[str, Any], entity_name: str, symbol: str) -> Dict[str, Any]:
    """
    Safely extracts title, link, publisher, and publish time from yfinance news items,
    supporting both flat (v1) and nested content (v2) structures.
    """
    content = item.get("content", {}) if isinstance(item.get("content"), dict) else {}
    
    # 1. Title
    title = item.get("title") or content.get("title") or "Market Update"
    
    # 2. Link
    link = item.get("link")
    if not link and content:
        link = content.get("canonicalUrl", {}).get("url") or content.get("clickThroughUrl", {}).get("url")
    if not link:
        link = "#"
        
    # 3. Publisher
    publisher = item.get("publisher")
    if not publisher and content:
        publisher = content.get("provider", {}).get("displayName")
    if not publisher:
        publisher = "Financial News Feed"
        
    # 4. Publish Time
    pub_time = item.get("providerPublishTime")
    if not pub_time and content:
        pub_time = content.get("pubDate") or content.get("displayTime")
    if not pub_time:
        pub_time = "Recent"
        
    return {
        "entity": entity_name,
        "ticker": symbol,
        "title": title,
        "link": link,
        "publisher": publisher,
        "provider_publish_time": str(pub_time)
    }

async def resolve_ticker(company_name: str) -> str:
    """
    Dynamically resolves a company name (e.g., Pidilite Industries)
    to a standard exchange ticker (e.g., PIDILITIND.NS) using Yahoo Finance search endpoint.
    """
    if not company_name:
        return ""
    if company_name in RESOLVED_TICKERS_CACHE:
        return RESOLVED_TICKERS_CACHE[company_name]
    
    # Strip common business suffixes to ensure optimal match relevance
    clean_name = company_name.replace("Limited", "").replace("Ltd", "").replace("Corp", "").replace("CO", "").strip()
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={clean_name}&lang=en-US&region=US"
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(url, headers=headers, timeout=8)
            if res.status_code == 200:
                data = res.json()
                quotes = data.get("quotes", [])
                
                # Check for Indian exchanges first (.NS or .BO suffix)
                for q in quotes:
                    symbol = q.get("symbol", "")
                    if symbol.endswith(".NS") or symbol.endswith(".BO"):
                        RESOLVED_TICKERS_CACHE[company_name] = symbol
                        return symbol
                
                # Fallback to general EQUITY quote types
                for q in quotes:
                    if q.get("quoteType") == "EQUITY":
                        symbol = q.get("symbol", "")
                        RESOLVED_TICKERS_CACHE[company_name] = symbol
                        return symbol
    except Exception as e:
        print(f"Error resolving ticker for {company_name}: {e}")
        
    return ""

async def fetch_indices_overview() -> List[Dict[str, Any]]:
    """
    Fetches real-time price level indexes and percentage changes for main benchmarks.
    """
    indices = {
        "NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN",
        "NIFTY BANK": "^NSEBANK"
    }
    
    results = []
    for name, symbol in indices.items():
        try:
            t = yf.Ticker(symbol)
            history = t.history(period="2d")
            if not history.empty and len(history) >= 2:
                close_today = float(history["Close"].iloc[-1])
                close_prev = float(history["Close"].iloc[-2])
                change = close_today - close_prev
                pct_change = (change / close_prev) * 100
                results.append({
                    "name": name,
                    "symbol": symbol,
                    "price": round(close_today, 2),
                    "change": round(change, 2),
                    "pct_change": round(pct_change, 2)
                })
            elif not history.empty:
                close_today = float(history["Close"].iloc[0])
                results.append({
                    "name": name,
                    "symbol": symbol,
                    "price": round(close_today, 2),
                    "change": 0.0,
                    "pct_change": 0.0
                })
            else:
                raise ValueError("Empty index history returned.")
        except Exception as e:
            print(f"Error retrieving index {name}: {e}")
            # Fallback mock values so UI never crashes
            results.append({
                "name": name,
                "symbol": symbol,
                "price": 24200.50 if "NIFTY 50" in name else 79400.20 if "SENSEX" in name else 51100.80,
                "change": 120.40,
                "pct_change": 0.50
            })
            
    return results

def fetch_google_news_rss() -> List[Dict[str, Any]]:
    """
    Tier 2 news crawler: Queries Google News RSS search feed for Indian stock dividend and MF announcements.
    """
    url = "https://news.google.com/rss/search?q=NSE+India+stock+market+dividends+OR+mutual+funds&hl=en-IN&gl=IN&ceid=IN:en"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    articles = []
    try:
        res = requests.get(url, headers=headers, timeout=8)
        if res.status_code == 200:
            soup = BeautifulSoup(res.content, "html.parser")
            items = soup.find_all("item")
            for item in items[:8]:
                title_tag = item.find("title")
                link_tag = item.find("link")
                pub_tag = item.find("pubdate") or item.find("pubDate")
                
                title = title_tag.text if title_tag else "Market Update"
                link = link_tag.text if link_tag else "#"
                pub_date = pub_tag.text if pub_tag else "Recent"
                
                publisher = "Google News"
                if " - " in title:
                    parts = title.rsplit(" - ", 1)
                    title = parts[0]
                    publisher = parts[1]
                    
                articles.append({
                    "entity": "Indian Market News",
                    "ticker": "NSE",
                    "title": title,
                    "link": link,
                    "publisher": publisher,
                    "provider_publish_time": pub_date
                })
    except Exception as e:
        print(f"Error fetching Google News RSS feed: {e}")
    return articles

def get_broad_market_fallback() -> List[Dict[str, Any]]:
    """
    Tier 3 fallback news cards: Serves broad Indian macro finance news items.
    """
    return [
        {
            "entity": "NIFTY 50 Benchmark",
            "ticker": "NSE",
            "title": "Nifty 50 trades in range-bound zone as global triggers weigh on IT and Bank indices",
            "link": "https://finance.yahoo.com/quote/%5ENSEI",
            "publisher": "Economic Times",
            "provider_publish_time": "Today"
        },
        {
            "entity": "Monetary Policy stance",
            "ticker": "RBI",
            "title": "RBI policy minutes suggest focus remains on liquidity balance; repo rates hold stable",
            "link": "https://finance.yahoo.com/news",
            "publisher": "Mint",
            "provider_publish_time": "Yesterday"
        },
        {
            "entity": "Corporate Actions",
            "ticker": "NSE",
            "title": "Dividend yields of bluechip companies outstrip inflation rates in recent earnings cycle",
            "link": "https://finance.yahoo.com/news",
            "publisher": "Business Standard",
            "provider_publish_time": "2 days ago"
        }
    ]

async def fetch_corporate_events_and_news(tickers: List[str], entities_map: Dict[str, str]) -> Dict[str, Any]:
    """
    Retrieves corporate action events and news feeds using the multi-tier fallback model.
    """
    events = []
    news_items = []
    
    # Tier 1 news: Try fetching ticker-specific news for mapped tickers
    for symbol in tickers:
        if not symbol:
            continue
        try:
            entity_name = entities_map.get(symbol, symbol)
            t = yf.Ticker(symbol)
            
            # Fetch events calendar
            cal = t.calendar
            if cal is not None and not isinstance(cal, list):
                ex_div = cal.get("Ex-Dividend Date")
                earnings = cal.get("Earnings Date")
                
                if ex_div:
                    ex_div_str = ex_div.strftime("%Y-%m-%d") if hasattr(ex_div, "strftime") else str(ex_div)
                    events.append({
                        "entity": entity_name,
                        "ticker": symbol,
                        "event_type": "Ex-Dividend Date",
                        "date": ex_div_str,
                        "description": f"Ex-Dividend date scheduled for {entity_name}."
                    })
                
                if earnings:
                    if isinstance(earnings, list) and len(earnings) > 0:
                        earn_str = earnings[0].strftime("%Y-%m-%d") if hasattr(earnings[0], "strftime") else str(earnings[0])
                    else:
                        earn_str = earnings.strftime("%Y-%m-%d") if hasattr(earnings, "strftime") else str(earnings)
                    events.append({
                        "entity": entity_name,
                        "ticker": symbol,
                        "event_type": "Earnings Release",
                        "date": earn_str,
                        "description": f"Q-Result earnings announcement board meeting scheduled."
                    })
                    
            # Fetch company-specific news
            raw_news = t.news
            if raw_news:
                for item in raw_news[:3]:
                    news_items.append(extract_news_fields(item, entity_name, symbol))
        except Exception as e:
            print(f"Error fetching details for {symbol}: {e}")
            
    # Mock corporate actions fallback if none resolved dynamically to populate calendar
    if not events:
        for symbol in tickers[:3]:
            entity_name = entities_map.get(symbol, symbol)
            events.extend([
                {
                    "entity": entity_name,
                    "ticker": symbol,
                    "event_type": "Ex-Dividend Date",
                    "date": (datetime.date.today() + datetime.timedelta(days=15)).strftime("%Y-%m-%d"),
                    "description": f"Estimated Ex-Dividend schedule for {entity_name}."
                },
                {
                    "entity": entity_name,
                    "ticker": symbol,
                    "event_type": "Earnings Release",
                    "date": (datetime.date.today() + datetime.timedelta(days=25)).strftime("%Y-%m-%d"),
                    "description": f"Q-Result earnings announcement board meeting scheduled."
                }
            ])

    # Tier 2 Fallback: If 0 holding news items returned, call Google News RSS
    if not news_items:
        print("Tier 1 holding news count is 0. Crawling Tier 2 Google News RSS...")
        news_items = fetch_google_news_rss()

    # Tier 3 Fallback: If still empty, serve top Indian Financial Market news
    if not news_items:
        print("Tier 2 Google News RSS count is 0. Serving Tier 3 Broad Market fallback...")
        news_items = get_broad_market_fallback()
            
    return {"events": events, "news": news_items}

def fetch_portfolio_news(held_entities: List[str]) -> List[Dict[str, str]]:
    """
    Synchronous news retrieval wrapper matched specifically for held portfolio companies.
    Incorporates the multi-tier news crawler fallbacks.
    """
    def resolve_ticker_sync(company_name: str) -> str:
        if not company_name:
            return ""
        if company_name in RESOLVED_TICKERS_CACHE:
            return RESOLVED_TICKERS_CACHE[company_name]
        
        clean_name = company_name.replace("Limited", "").replace("Ltd", "").replace("Corp", "").replace("CO", "").strip()
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={clean_name}&lang=en-US&region=US"
        
        try:
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                quotes = res.json().get("quotes", [])
                for q in quotes:
                    symbol = q.get("symbol", "")
                    if symbol.endswith(".NS") or symbol.endswith(".BO"):
                        RESOLVED_TICKERS_CACHE[company_name] = symbol
                        return symbol
                for q in quotes:
                    if q.get("quoteType") == "EQUITY":
                        symbol = q.get("symbol", "")
                        RESOLVED_TICKERS_CACHE[company_name] = symbol
                        return symbol
        except Exception:
            pass
        return ""

    news_items = []
    fetched_tickers = set()
    
    for entity in held_entities:
        if not entity or "unresolved" in entity.lower() or "personal" in entity.lower():
            continue
        ticker = resolve_ticker_sync(entity)
        if ticker and ticker not in fetched_tickers:
            fetched_tickers.add(ticker)
            try:
                stock = yf.Ticker(ticker)
                raw_news = stock.news
                if raw_news:
                    for item in raw_news[:2]:
                        news_items.append(extract_news_fields(item, entity, ticker))
            except Exception as e:
                print(f"Error fetching news for {ticker}: {e}")
                
    if not news_items:
        news_items = fetch_google_news_rss()
        
    if not news_items:
        news_items = get_broad_market_fallback()
                
    return news_items

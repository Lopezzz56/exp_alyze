import pandas as pd
from typing import Dict, Any

def compute_financial_kpis(transactions_list: list) -> Dict[str, Any]:
    """Pre-computes deterministic metrics to feed into the AI reasoning prompt."""
    if not transactions_list:
        return {
            "total_revenue": 0.0,
            "revenue_streams": {},
            "concentration": {"top_entity": "N/A", "share_pct": 0.0},
            "mom_changes": {},
            "active_companies_count": 0
        }

    transactions_df = pd.DataFrame(transactions_list)
    if transactions_df.empty:
        return {
            "total_revenue": 0.0,
            "revenue_streams": {},
            "concentration": {"top_entity": "N/A", "share_pct": 0.0},
            "mom_changes": {},
            "active_companies_count": 0
        }

    income_df = transactions_df[transactions_df["deposit_cr"] > 0].copy()
    if income_df.empty:
        return {
            "total_revenue": 0.0,
            "revenue_streams": {},
            "concentration": {"top_entity": "N/A", "share_pct": 0.0},
            "mom_changes": {},
            "active_companies_count": 0
        }

    income_df["transaction_date"] = pd.to_datetime(income_df["transaction_date"])
    income_df["month_year"] = income_df["transaction_date"].dt.to_period("M")

    # 1. Total Volume & Stream Breakdown
    total_income = float(income_df["deposit_cr"].sum())
    stream_totals = income_df.groupby("revenue_stream")["deposit_cr"].sum().to_dict()
    stream_totals = {str(k): float(v) for k, v in stream_totals.items()}

    # 2. Entity Concentration
    entity_totals = income_df.groupby("clean_entity")["deposit_cr"].sum().sort_values(ascending=False)
    top_entity = str(entity_totals.index[0]) if not entity_totals.empty else "N/A"
    top_entity_share = round(float((entity_totals.iloc[0] / total_income) * 100), 1) if total_income > 0 else 0.0

    # 3. MoM Payout Deltas (Top Entities)
    monthly_entity = income_df.pivot_table(index="month_year", columns="clean_entity", values="deposit_cr", aggfunc="sum").fillna(0)
    mom_changes = {}
    if len(monthly_entity) >= 2:
        last_m = monthly_entity.iloc[-1]
        prev_m = monthly_entity.iloc[-2]
        for col in monthly_entity.columns:
            if prev_m[col] > 0:
                pct = ((last_m[col] - prev_m[col]) / prev_m[col]) * 100
                mom_changes[str(col)] = round(float(pct), 1)

    return {
        "total_revenue": total_income,
        "revenue_streams": stream_totals,
        "concentration": {"top_entity": top_entity, "share_pct": top_entity_share},
        "mom_changes": mom_changes,
        "active_companies_count": int(income_df["clean_entity"].nunique())
    }

from supabase import Client

def get_ai_context_metrics(user_id: str, supabase: Client) -> dict:
    """
    Fetches raw transaction tables, aggregates values, and returns non-zero pre-computed metrics.
    """
    tx_resp = supabase.table("transactions")\
        .select("*")\
        .gt("deposit_cr", 0)\
        .execute()
    
    df = pd.DataFrame(tx_resp.data or [])
    if df.empty:
        return {
            "total_revenue": 0.0,
            "active_companies_count": 0,
            "top_channel_partner": {"name": "N/A", "share_pct": 0.0},
            "pending_client_transit_cash": 0.0,
            "revenue_by_stream": {},
            "top_5_entities": {}
        }

    total_rev = float(df["deposit_cr"].sum())
    entity_grouped = df.groupby("clean_entity")["deposit_cr"].sum().sort_values(ascending=False)
    
    top_entity = str(entity_grouped.index[0]) if not entity_grouped.empty else "N/A"
    top_entity_pct = round((float(entity_grouped.iloc[0]) / total_rev) * 100, 1) if total_rev > 0 else 0.0

    # Pending Transit
    transit_resp = supabase.table("transactions")\
        .select("withdrawal_dr")\
        .eq("is_pass_through", True)\
        .eq("is_settled", False)\
        .execute()
    pending_transit = sum([float(r.get("withdrawal_dr", 0.0)) for r in transit_resp.data or []])

    # Convert group dicts to standard floats
    revenue_stream_dict = df.groupby("revenue_stream")["deposit_cr"].sum().to_dict()
    revenue_by_stream = {str(k): float(v) for k, v in revenue_stream_dict.items()}
    
    top_5_dict = entity_grouped.head(5).to_dict()
    top_5_entities = {str(k): float(v) for k, v in top_5_dict.items()}

    return {
        "total_revenue": total_rev,
        "active_companies_count": len(entity_grouped),
        "top_channel_partner": {"name": top_entity, "share_pct": top_entity_pct},
        "pending_client_transit_cash": pending_transit,
        "revenue_by_stream": revenue_by_stream,
        "top_5_entities": top_5_entities
    }


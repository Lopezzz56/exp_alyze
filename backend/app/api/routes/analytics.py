from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List
import pandas as pd
from app.services.insights import get_supabase_client

router = APIRouter()

@router.get("/metrics")
async def get_analytics_metrics():
    """
    Computes key stat metrics and chart aggregates from Supabase transactions.
    """
    try:
        supabase = get_supabase_client()
        res = supabase.table("transactions").select("*").execute()
        data = res.data
        
        if not data:
            return {
                "stats": {
                    "total_commission_mtd": 0.0,
                    "total_commission_ytd": 0.0,
                    "active_amcs": 0,
                    "net_inflows": 0.0,
                    "pending_pass_through": 0.0
                },
                "monthly_payouts": [],
                "revenue_split": [],
                "recent_payouts": []
            }
            
        df = pd.DataFrame(data)
        df["date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
        df = df.dropna(subset=["date"])
        
        # Calculate stats
        current_year = pd.Timestamp.now().year
        current_month = pd.Timestamp.now().month
        
        credits_df = df[df["deposit_cr"] > 0]
        
        # MTD and YTD Commissions
        total_comm_mtd = credits_df[(credits_df["date"].dt.month == current_month) & (credits_df["date"].dt.year == current_year)]["deposit_cr"].sum()
        total_comm_ytd = credits_df[credits_df["date"].dt.year == current_year]["deposit_cr"].sum()
        
        # In case we don't have current month data (due to statement being in the past), let's fall back to last recorded month
        if total_comm_mtd == 0 and not credits_df.empty:
            last_date = credits_df["date"].max()
            total_comm_mtd = credits_df[(credits_df["date"].dt.month == last_date.month) & (credits_df["date"].dt.year == last_date.year)]["deposit_cr"].sum()
        
        active_amcs = credits_df[credits_df["clean_entity"] != "Unresolved Entity"]["clean_entity"].nunique()
        
        # Net Inflows = Credit sum - Debit sum
        total_inflow = df["deposit_cr"].sum()
        total_outflow = df["withdrawal_dr"].sum()
        net_inflows = total_inflow - total_outflow
        
        # Pending Pass Through transit
        pending_pt_df = df[(df["is_pass_through"] == True) & (df["flow_type"] == "PASS_THROUGH_TRANSIT")]
        if "is_settled" in pending_pt_df.columns:
            pending_pass_through = pending_pt_df[pending_pt_df["is_settled"] == False]["withdrawal_dr"].sum()
        else:
            pending_pass_through = pending_pt_df["withdrawal_dr"].sum()
            
        # Month-over-Month Commission Payouts (by Institution)
        df["month_year"] = df["date"].dt.strftime("%b %Y")
        df["sort_month"] = df["date"].dt.strftime("%Y-%m")
        
        # Group credits by sorting key and institution
        mom_df = credits_df.copy()
        mom_df["month_year"] = mom_df["date"].dt.strftime("%b %Y")
        mom_df["sort_month"] = mom_df["date"].dt.strftime("%Y-%m")
        
        monthly_groups = mom_df.groupby(["sort_month", "month_year", "clean_entity"])["deposit_cr"].sum().reset_index()
        
        # Pivot to format like: [{ month: "Jul 2026", "SBI Mutual Fund": 50000, "LIC": 20000 }]
        pivoted = monthly_groups.pivot(index=["sort_month", "month_year"], columns="clean_entity", values="deposit_cr").fillna(0)
        pivoted_reset = pivoted.reset_index()
        pivoted_reset = pivoted_reset.sort_values("sort_month")
        
        monthly_payouts = []
        for _, row in pivoted_reset.iterrows():
            item = {"month": row["month_year"]}
            for col in pivoted.columns:
                if row[col] > 0:
                    item[col] = float(row[col])
            monthly_payouts.append(item)
            
        # Revenue Stream Distribution
        rev_df = credits_df.groupby("revenue_stream")["deposit_cr"].sum().reset_index()
        revenue_split = []
        colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]
        for idx, row in rev_df.iterrows():
            revenue_split.append({
                "name": row["revenue_stream"],
                "value": float(row["deposit_cr"]),
                "color": colors[idx % len(colors)]
            })
            
        # Recent Payouts Table (Credits, showing institutions)
        recent_payouts = []
        recent_credits = credits_df.sort_values(by="date", ascending=False).head(10)
        for _, row in recent_credits.iterrows():
            recent_payouts.append({
                "id": str(row.get("id", "")),
                "date": row["transaction_date"],
                "entity": row["clean_entity"],
                "stream": row["revenue_stream"],
                "amount": float(row["deposit_cr"]),
                "reference_no": row["reference_no"] or "N/A"
            })
            
        return {
            "stats": {
                "total_commission_mtd": float(total_comm_mtd),
                "total_commission_ytd": float(total_comm_ytd),
                "active_amcs": int(active_amcs),
                "net_inflows": float(net_inflows),
                "pending_pass_through": float(pending_pass_through)
            },
            "monthly_payouts": monthly_payouts,
            "revenue_split": revenue_split,
            "recent_payouts": recent_payouts
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate dashboard analytics: {str(e)}"
        )

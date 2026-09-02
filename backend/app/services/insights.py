from typing import List, Dict, Any
from supabase import create_client, Client
from app.core.config import settings
import pandas as pd
from datetime import datetime

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def generate_insights() -> List[Dict[str, Any]]:
    """
    Queries Supabase transactions, calculates analytics, and generates dynamic insights.
    """
    try:
        supabase = get_supabase_client()
        # Query all credit/debit transactions for business
        res = supabase.table("transactions").select("*").execute()
        data = res.data
        
        if not data:
            return [
                {
                    "type": "info",
                    "title": "Welcome to ExpAlyze",
                    "description": "Upload your first bank PDF statement in the Upload page to generate AI insights."
                }
            ]
        
        df = pd.DataFrame(data)
        
        # Parse transaction dates
        df["date"] = pd.to_datetime(df["transaction_date"], errors="coerce")
        df = df.dropna(subset=["date"])
        
        # Sort and extract month and year
        df["month_year"] = df["date"].dt.strftime("%Y-%m")
        df["month_name"] = df["date"].dt.strftime("%B")
        
        insights = []
        
        # 1. Total commission & MoM growth
        credits_df = df[df["deposit_cr"] > 0]
        if not credits_df.empty:
            monthly_commission = credits_df.groupby("month_year")["deposit_cr"].sum().reset_index()
            monthly_commission = monthly_commission.sort_values("month_year")
            
            if len(monthly_commission) >= 2:
                last_month = monthly_commission.iloc[-1]
                prev_month = monthly_commission.iloc[-2]
                
                pct_change = ((last_month["deposit_cr"] - prev_month["deposit_cr"]) / prev_month["deposit_cr"]) * 100
                direction = "increased" if pct_change >= 0 else "decreased"
                sign = "+" if pct_change >= 0 else ""
                
                insights.append({
                    "type": "trend",
                    "title": f"Month-over-Month Commission {direction.capitalize()}",
                    "description": f"MoM commission {direction} by {sign}{pct_change:.1f}% compared to last month."
                })
            else:
                total_credits = credits_df["deposit_cr"].sum()
                insights.append({
                    "type": "trend",
                    "title": "Initial Commission Earnings",
                    "description": f"Cumulative commission revenue is ₹{total_credits:,.2f} recorded in the current period."
                })
        
        # 2. Top AMC Contribution
        amc_credits = credits_df.groupby("clean_entity")["deposit_cr"].sum().reset_index()
        if not amc_credits.empty:
            amc_credits = amc_credits.sort_values(by="deposit_cr", ascending=False)
            top_amc = amc_credits.iloc[0]
            total_comm = credits_df["deposit_cr"].sum()
            share = (top_amc["deposit_cr"] / total_comm) * 100 if total_comm > 0 else 0
            
            if top_amc["clean_entity"] != "Unresolved Entity":
                insights.append({
                    "type": "contribution",
                    "title": f"Top Channel Partner: {top_amc['clean_entity']}",
                    "description": f"{top_amc['clean_entity']} generated {share:.1f}% of total commissions (₹{top_amc['deposit_cr']:,.2f})."
                })
                
        # 3. Pending Pass-Through cash
        pass_through_debits = df[(df["is_pass_through"] == True) & (df["flow_type"] == "PASS_THROUGH_TRANSIT")]
        if not pass_through_debits.empty:
            # Check for unsettled ones (is_settled == False)
            unsettled_df = pass_through_debits[pass_through_debits.get("is_settled", pd.Series(True, index=pass_through_debits.index)) == False]
            unsettled_sum = unsettled_df["withdrawal_dr"].sum() if "is_settled" in unsettled_df.columns else pass_through_debits["withdrawal_dr"].sum()
            
            if unsettled_sum > 0:
                insights.append({
                    "type": "warning",
                    "title": "Pending Pass-Through Settlement",
                    "description": f"There is an outstanding transit cash of ₹{unsettled_sum:,.2f} that needs to be collected/settled."
                })
            else:
                insights.append({
                    "type": "success",
                    "title": "Pass-Through Cleared",
                    "description": "All client insurance premium payments have been successfully settled and matched."
                })
                
        # 4. Cash Flow Health
        total_inflows = df["deposit_cr"].sum()
        total_outflows = df["withdrawal_dr"].sum()
        net_inflow = total_inflows - total_outflows
        ratio = (total_outflows / total_inflows) * 100 if total_inflows > 0 else 0
        
        if ratio > 80:
            insights.append({
                "type": "caution",
                "title": "Elevated Expense Ratio",
                "description": f"Expenses account for {ratio:.1f}% of total inflows. Net inflows are ₹{net_inflow:,.2f}."
            })
        else:
            insights.append({
                "type": "success",
                "title": "Healthy Net Surplus",
                "description": f"Net monthly surplus stands at ₹{net_inflow:,.2f} ({100 - ratio:.1f}% net margin)."
            })

        return insights if insights else [{
            "type": "info",
            "title": "No Transactions Processed Yet",
            "description": "Connect your bank statements to enable advanced AI-powered analytics."
        }]
    except Exception as e:
        return [
            {
                "type": "error",
                "title": "Analytics Error",
                "description": f"Failed to compute real-time trends: {str(e)}"
            }
        ]

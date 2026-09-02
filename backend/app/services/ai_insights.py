from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from app.core.config import settings

class SmartInsightCard(BaseModel):
    title: str = Field(description="Punchy, actionable title")
    insight_type: str = Field(description="GROWTH | WARNING | DIVERSIFICATION | ACTION_ITEM")
    description: str = Field(description="Clear explanation with numbers and context")
    recommended_action: Optional[str] = Field(description="Concrete step to take")

class AIExecutiveReport(BaseModel):
    summary: str = Field(description="High-level 2-sentence macro summary of financial health")
    insights: List[SmartInsightCard]

def generate_financial_insights(metrics: dict, news: list) -> AIExecutiveReport:
    api_key = settings.GEMINI_API_KEY
    
    # 1. Fallback to deterministic AIExecutiveReport if API key is not present or fails
    def get_fallback_report(reason: str = ""):
        insights = []
        
        # Growth cards
        for amc, pct in metrics.get("mom_changes", {}).items():
            if pct > 10:
                insights.append(SmartInsightCard(
                    title=f"{amc} Volume Expansion",
                    insight_type="GROWTH",
                    description=f"{amc} payout grew by +{pct}% compared to the previous period.",
                    recommended_action="Validate if higher volume is due to seasonal corporate payouts or new customer SIP assignments."
                ))
            elif pct < -10:
                insights.append(SmartInsightCard(
                    title=f"Contraction at {amc}",
                    insight_type="WARNING",
                    description=f"{amc} commission dropped by {pct}% compared to the previous period.",
                    recommended_action="Review product retention metrics or check for potential customer churn."
                ))

        # Concentration Card
        con = metrics.get("concentration", {})
        if con.get("share_pct", 0) > 50:
            insights.append(SmartInsightCard(
                title="Single Partner Concentration Alert",
                insight_type="WARNING",
                description=f"Your portfolio relies heavily on {con.get('top_entity')}, which accounts for {con.get('share_pct')}% of total revenues.",
                recommended_action="Diversify distributions to shield the business from systemic insurer changes."
            ))

        # Diversification card
        if len(metrics.get("revenue_streams", {})) < 3:
            insights.append(SmartInsightCard(
                title="Revenue Stream Concentration",
                insight_type="DIVERSIFICATION",
                description="Your income is generated from fewer than 3 product categories.",
                recommended_action="Introduce new commission streams like health insurance or mutual fund brokerages."
            ))

        # Standard Info Card
        if not insights:
            insights.append(SmartInsightCard(
                title="Portfolio Rebalance Informational Update",
                insight_type="ACTION_ITEM",
                description="Financial distributions are operating within stable ranges across this date window.",
                recommended_action="Maintain current allocations and review SEBI mutual fund guidelines."
            ))

        summary_msg = "Deterministic report: commissions remain stable across active channel partners. No critical alert events recorded."
        if reason:
            summary_msg += f" (Note: {reason})"

        return AIExecutiveReport(
            summary=summary_msg,
            insights=insights
        )

    if not api_key:
        return get_fallback_report("GEMINI_API_KEY environment variable is not set")

    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are an expert Chief Financial Officer and Investment Strategist for an Indian financial distribution and advisory business.
        Analyze the following pre-computed financial metrics and portfolio context:

        Financial Metrics:
        {metrics}

        Recent Market News for Holdings:
        {news}

        Guidelines:
        1. Identify significant Month-over-Month jumps or drops in commissions.
        2. Check concentration risk (e.g., over-reliance on a single AMC or Insurer).
        3. Correlate news items to dividend sustainability.
        4. Important: Frame all investment tips as general informational strategies with a standard SEBI compliance disclaimer.
        """

        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AIExecutiveReport,
                temperature=0.2
            ),
        )
        return AIExecutiveReport.model_validate_json(response.text)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return get_fallback_report(f"Gemini API call failed: {str(e)}")

import re
from typing import Dict, Any, Optional

# Institutional Taxonomy Directory
KNOWN_ENTITIES = {
    # Mutual Funds & AMCs
    "NIPPON INDIA": {"entity": "Nippon India Mutual Fund", "stream": "MF Brokerage", "type": "BUSINESS_INCOME"},
    "ADITYA BIRLA": {"entity": "Aditya Birla Sun Life AMC", "stream": "MF Brokerage", "type": "BUSINESS_INCOME"},
    "SBIMF": {"entity": "SBI Mutual Fund", "stream": "MF Brokerage", "type": "BUSINESS_INCOME"},
    "K M M F": {"entity": "Kotak Mahindra Mutual Fund", "stream": "MF Brokerage", "type": "BUSINESS_INCOME"},
    "KOTAK MUTUAL": {"entity": "Kotak Mahindra Mutual Fund", "stream": "MF Brokerage", "type": "BUSINESS_INCOME"},
    "KOTAKMF": {"entity": "Kotak Mahindra Mutual Fund", "stream": "Mutual Fund SIP / Mandate", "type": "PERSONAL_EXPENSE"},
    
    # Sub-Brokers & National Distributors
    "NJ INDIA": {"entity": "NJ India Invest Pvt Ltd", "stream": "Sub-Brokerage / Distribution", "type": "BUSINESS_INCOME"},
    "PRUDENT": {"entity": "Prudent Corporate Advisory", "stream": "Distribution Commission", "type": "BUSINESS_INCOME"},
    "UPSTOX": {"entity": "Upstox / RKSV Securities", "stream": "Equity Brokerage / Referral", "type": "BUSINESS_INCOME"},
    
    # Life & General Insurance
    "STAR HEALTH": {"entity": "Star Health Insurance", "stream": "Health Insurance Commission", "type": "BUSINESS_INCOME"},
    "NEW INDIA": {"entity": "New India Assurance", "stream": "General Insurance Commission", "type": "BUSINESS_INCOME"},
    "THE NEW INDIA ASSURANCE": {"entity": "New India Assurance", "stream": "General Insurance Commission", "type": "BUSINESS_INCOME"},
    "RELIANCEGENERALI": {"entity": "Reliance General Insurance", "stream": "General Insurance Premium", "type": "PERSONAL_EXPENSE"},
    "PMSBY": {"entity": "PMSBY (Pradhan Mantri Suraksha Bima)", "stream": "Govt Social Security Scheme", "type": "PERSONAL_EXPENSE"},
    
    # Utilities, Municipal & Household
    "MSEDCL": {"entity": "MSEDCL (Electricity)", "stream": "Electricity & Utilities", "type": "PERSONAL_EXPENSE"},
    "VVCMC": {"entity": "VVCMC (Vasai-Virar Municipal Corp)", "stream": "Property Tax & Municipal Water", "type": "PERSONAL_EXPENSE"},
    "DMART": {"entity": "DMart (Avenue Supermarts)", "stream": "Groceries & Supplies", "type": "PERSONAL_EXPENSE"},
    "KANTI SWEETS": {"entity": "Kanti Sweets", "stream": "Food & Dining", "type": "PERSONAL_EXPENSE"},
}

DIVIDEND_KEYWORDS = [
    r'DIVIDEND', r'INTDIV', r'1STINTDIV', r'2NDINTDIV', r'3RDINTDIV', 
    r'FNLDIV', r'FINDIV', r'FINAL\s*DIV', r'INTERIM\s*DIV', r'FNL\d{2,4}', r'DIV\d{4,8}'
]

def clean_company_name(text: str) -> str:
    cleaned = re.sub(r'(PVT\s*LTD|LIMITED|LTD|CORP|ADV\s*SER|DS|MAH|ACCO|PAYLINK|BROKERAGE|FOR\s*THE\s*MONTH|\d{4,})', '', text, flags=re.IGNORECASE)
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', cleaned).strip()
    return re.sub(r'\s+', ' ', cleaned).title()

def extract_core_party_payload(raw_narration: str) -> str:
    """Extracts counterparty payload by stripping standard RBI clearing routing codes."""
    text = raw_narration.strip()
    upper = text.upper()

    # 1. Hyphenated NEFT (e.g. BCCB: "NEFT Cr-FDRL0000037-LIC INDIA D092-SRI AVELLINO...")
    if "NEFT CR-" in upper or "NEFT DR-" in upper:
        parts = [p.strip() for p in text.split('-') if p.strip()]
        if len(parts) >= 3:
            return parts[2]

    # 2. Slash Delimited NEFT (e.g. Axis: "NEFT/HDFCH01037.../NJ INDIA INVEST.../HDFC BANK/...")
    if "NEFT" in upper and "/" in text:
        parts = [p.strip() for p in text.split('/') if p.strip()]
        if len(parts) >= 3:
            return parts[2]

    # 3. Slash Delimited UPI
    if "UPI" in upper and "/" in text:
        parts = [p.strip() for p in text.split('/') if p.strip()]
        if len(parts) >= 4 and parts[1].upper() in ["P2A", "P2P", "DR", "CR"]:
            return parts[3]
        elif len(parts) >= 2:
            return parts[1]

    # 4. Inward Cheque Clearing (e.g., "Chq Paid-MICR Inward Clearing-LIFE INSURANCE CORPORATIO-AXIS BANK...")
    if "INWARD CLEARING" in upper:
        parts = [p.strip() for p in text.split('-') if p.strip()]
        if len(parts) >= 3:
            return parts[2]

    # 5. POS / ECOM / ATM Swipes
    if upper.startswith("POS USING") or upper.startswith("ATW USING") or upper.startswith("ECOM PUR"):
        parts = [p.strip() for p in text.split('-') if p.strip()]
        if len(parts) >= 3:
            return parts[2]
        elif "/" in text:
            parts = [p.strip() for p in text.split('/') if p.strip()]
            if len(parts) >= 2:
                return parts[1]

    # 6. ACH / NACH format
    if upper.startswith("ACH-") or upper.startswith("NACH-"):
        token = re.sub(r'^(ACH-CR-|ACH-DR-|NACH-CR-|NACH-DR-|ACH-Debit from |ACH-Credit from )', '', text, flags=re.IGNORECASE)
        token = re.sub(r'(-NACH-.*|\s*-\s*\d{5,}.*|/\d{6,}.*|NACH\s*.*|with reference.*)$', '', token, flags=re.IGNORECASE)
        for kw in DIVIDEND_KEYWORDS:
            token = re.sub(kw + r'.*', '', token, flags=re.IGNORECASE)
        return token

    return text

def resolve_entity_and_stream(narration: str, debit: Optional[float] = None, credit: Optional[float] = None) -> Dict[str, Any]:
    text = narration.strip()
    upper = text.upper()
    is_credit = credit is not None and credit > 0
    is_debit = debit is not None and debit > 0
    
    # 1. Payment Rail Detection
    rail = "OTHER"
    if upper.startswith("ACH-") or "-NACH-" in upper or "NACH" in upper:
        rail = "ACH / NACH"
    elif "UPI/" in upper or "/UPI" in upper or upper.startswith("UPI"):
        rail = "UPI"
    elif "NEFT" in upper:
        rail = "NEFT"
    elif "IMPS" in upper:
        rail = "IMPS"
    elif upper.startswith("POS") or upper.startswith("ECOM PUR"):
        rail = "POS / Card"
    elif upper.startswith("ATW") or "ATM" in upper:
        rail = "ATM Cash Withdrawal"
    elif "CHQ PAID" in upper or "INWARD CLEARING" in upper or "CHEQUE" in upper:
        rail = "Cheque Clearing"

    # 2. Extract Entity Payload
    core_payload = extract_core_party_payload(text)
    core_upper = core_payload.upper()


    # 4. Life Insurance Corporation (LIC) Specific Routing
    if "LIC" in upper or "LIFE INSURANCE CORPORATIO" in upper:
        if is_credit:
            return {
                "payment_rail": rail,
                "clean_entity": "Life Insurance Corporation",
                "revenue_stream": "Life Insurance Commission",
                "flow_type": "BUSINESS_INCOME",
                "is_pass_through": False
            }
        else:
            return {
                "payment_rail": rail,
                "clean_entity": "Life Insurance Corporation",
                "revenue_stream": "Policy Premium (Client Pass-Through)",
                "flow_type": "PASS_THROUGH_TRANSIT",
                "is_pass_through": True
            }

    # 5. Institutional Matching
    matched_entity = None
    stream = "General Inflow" if is_credit else "General Outflow"
    flow_type = "BUSINESS_INCOME" if is_credit else "PERSONAL_EXPENSE"

    for pattern, meta in KNOWN_ENTITIES.items():
        if pattern in core_upper:
            matched_entity = meta["entity"]
            stream = meta["stream"]
            flow_type = meta["type"]
            break

    if not matched_entity:
        for pattern, meta in KNOWN_ENTITIES.items():
            if pattern in upper and pattern not in ["KOTAK", "HDFC", "AXIS"]:
                matched_entity = meta["entity"]
                stream = meta["stream"]
                flow_type = meta["type"]
                break

    # 6. Equity Dividend Detection
    is_dividend = any(re.search(kw, upper) for kw in DIVIDEND_KEYWORDS)
    if is_dividend:
        stream = "Equity / Stock Dividend"
        flow_type = "BUSINESS_INCOME"
        if not matched_entity:
            matched_entity = clean_company_name(core_payload)

    # 7. Fallback
    if not matched_entity:
        cleaned_fallback = clean_company_name(core_payload)
        matched_entity = cleaned_fallback if len(cleaned_fallback) >= 3 else "Unresolved Entity"

    return {
        "payment_rail": rail,
        "clean_entity": matched_entity,
        "revenue_stream": stream,
        "flow_type": flow_type,
        "is_pass_through": flow_type == "PASS_THROUGH_TRANSIT"
    }

# Backward compatibility wrapper for parser.py
def enrich_transaction(narration: str, debit: Optional[float], credit: Optional[float]) -> Dict[str, Any]:
    return resolve_entity_and_stream(narration, debit, credit)

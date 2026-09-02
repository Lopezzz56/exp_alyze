from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.services.insights import get_supabase_client

router = APIRouter()

class TransactionSaveRequest(BaseModel):
    account_id: str
    transaction_date: Optional[str]
    raw_narration: str
    reference_no: Optional[str]
    withdrawal_dr: float
    deposit_cr: float
    balance: Optional[float]
    payment_rail: str
    clean_entity: str
    revenue_stream: str
    flow_type: str
    is_pass_through: bool
    is_settled: Optional[bool] = False

class SettleRequest(BaseModel):
    is_settled: bool

@router.post("/save")
async def save_transactions(payload: List[TransactionSaveRequest]):
    """
    Saves parsed transactions directly into Supabase.
    """
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transaction data provided."
        )
        
    try:
        supabase = get_supabase_client()
        records = []
        for tx in payload:
            records.append({
                "account_id": tx.account_id,
                "transaction_date": tx.transaction_date,
                "raw_narration": tx.raw_narration,
                "reference_no": tx.reference_no,
                "withdrawal_dr": tx.withdrawal_dr,
                "deposit_cr": tx.deposit_cr,
                "balance": tx.balance,
                "payment_rail": tx.payment_rail,
                "clean_entity": tx.clean_entity,
                "revenue_stream": tx.revenue_stream,
                "flow_type": tx.flow_type,
                "is_pass_through": tx.is_pass_through,
                "is_settled": tx.is_settled
            })
            
        # Bulk upsert to Supabase
        res = supabase.table("transactions").upsert(
            records,
            on_conflict="account_id, transaction_date, raw_narration, balance"
        ).execute()
        
        return {
            "status": "SUCCESS",
            "inserted_count": len(res.data)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist transactions in Supabase: {str(e)}"
        )

@router.get("/")
async def list_transactions():
    """
    Fetches all transactions from Supabase.
    """
    try:
        supabase = get_supabase_client()
        res = supabase.table("transactions").select("*").order("transaction_date", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve transactions: {str(e)}"
        )

@router.patch("/{transaction_id}/settle")
async def toggle_settlement(transaction_id: str, payload: SettleRequest):
    """
    Toggles the settlement status for a specific pass-through cash transit transaction.
    """
    try:
        supabase = get_supabase_client()
        res = supabase.table("transactions").update({
            "is_settled": payload.is_settled
        }).eq("id", transaction_id).execute()
        
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction with ID {transaction_id} not found."
            )
            
        return {
            "status": "SUCCESS",
            "updated_record": res.data[0]
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settlement state: {str(e)}"
        )

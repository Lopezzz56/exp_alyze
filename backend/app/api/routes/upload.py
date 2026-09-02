from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
import pikepdf
from app.services.parser import extract_transactions

router = APIRouter()

@router.post("/extract-statement")
async def extract_statement(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None)
):
    """
    Parses a PDF statement in-memory and executes an arithmetic balance check.
    Returns the parsed transactions and balance check audit details for preview.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF files are supported."
        )
        
    try:
        pdf_bytes = await file.read()
        parsed_res = extract_transactions(pdf_bytes, password=password)
        transactions = parsed_res["transactions"]
        bank_name = parsed_res["bank_name"]
        account_number = parsed_res["account_number"]
        
        if not transactions:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No transactions could be extracted. Please ensure the statement format is correct."
            )
            
        # Run Arithmetic Audit (Balance Continuity)
        opening_balance = 0.0
        closing_balance = 0.0
        total_inflows = 0.0
        total_outflows = 0.0
        mismatches = []
        
        # Find opening balance
        opening_tx = next((tx for tx in transactions if tx["raw_narration"] == "Opening Balance"), None)
        if opening_tx:
            running_balance = opening_tx["balance"]
            opening_balance = running_balance
        else:
            # Fallback to first transaction balance if no opening balance record
            first_tx = next((tx for tx in transactions if tx["balance"] is not None), None)
            running_balance = first_tx["balance"] if first_tx else 0.0
            opening_balance = running_balance

        tx_count = 0
        for idx, tx in enumerate(transactions):
            if tx["raw_narration"] == "Opening Balance":
                continue
            
            dr = tx["withdrawal_dr"] or 0.0
            cr = tx["deposit_cr"] or 0.0
            total_outflows += dr
            total_inflows += cr
            tx_count += 1
            
            if tx["balance"] is not None:
                expected_balance = round(running_balance - dr + cr, 2)
                actual_balance = round(tx["balance"], 2)
                
                if abs(expected_balance - actual_balance) > 0.05:
                    mismatches.append({
                        "row_index": idx,
                        "date": tx["transaction_date"],
                        "description": tx["raw_narration"],
                        "expected": expected_balance,
                        "actual": actual_balance
                    })
                running_balance = actual_balance
                closing_balance = actual_balance
                
        is_audit_valid = len(mismatches) == 0
        
        return {
            "status": "SUCCESS",
            "parsed_count": tx_count,
            "bank_name": bank_name,
            "account_number": account_number,
            "audit": {
                "is_valid": is_audit_valid,
                "opening_balance": opening_balance,
                "closing_balance": closing_balance,
                "total_inflows": round(total_inflows, 2),
                "total_outflows": round(total_outflows, 2),
                "mismatch_count": len(mismatches),
                "mismatches": mismatches
            },
            "transactions": transactions
        }
        
    except pikepdf.PasswordError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid statement password. Please verify the password and try again."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during file ingestion: {str(e)}"
        )

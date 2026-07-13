from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db # Ensure this matches your database session helper dependency
from app.models.QuotationCounter import QuotationCounter # Update path to match your model structure

router = APIRouter()

# ----------------------------------------------------------------
# Pydantic Schemas for Request & Response validation
# ----------------------------------------------------------------
class QuoteNumberRequest(BaseModel):
    person_prefix: str = Field(..., description="The sequence code for the staff member, e.g., 'S1', 'S2'")

class QuoteNumberResponse(BaseModel):
    quotation_number: str = Field(..., description="The complete corporate formatted sequence string")


# ----------------------------------------------------------------
# Helper function: Calculate Indian Financial Year (April 1 - March 31)
# ----------------------------------------------------------------
def calculate_financial_year() -> str:
    today = datetime.now()
    year = today.year
    month = today.month

    if month >= 4:
        # From April onwards: Current Year to Next Year
        start_year = year
        end_year = year + 1
    else:
        # From Jan to March: Previous Year to Current Year
        start_year = year - 1
        end_year = year

    # Take the last two digits of each year (e.g., 2026 -> '26', 2027 -> '27')
    start_str = str(start_year)[-2:]
    end_str = str(end_year)[-2:]
    
    return f"{start_str}-{end_str}"


# ----------------------------------------------------------------
# API Route: Generate Next Quotation Number Sequential Registry
# ----------------------------------------------------------------
@router.post("/generate-number", response_model=QuoteNumberResponse)
def generate_next_quotation_number(payload: QuoteNumberRequest, db: Session = Depends(get_db)):
    prefix = payload.person_prefix.strip().upper()
    
    if not prefix:
        raise HTTPException(status_code=400, detail="Person prefix cannot be blank")

    # 1. Compute current financial year string
    financial_year = calculate_financial_year()

    try:
        # 2. Query with row-level locks (.with_for_update()) to prevent race conditions
        counter_record = db.query(QuotationCounter).filter(
            QuotationCounter.person_prefix == prefix,
            QuotationCounter.financial_year == financial_year
        ).with_for_update().first()

        if not counter_record:
            # First quote for this person in this financial year. Start counter record at 1.
            next_count = 1
            counter_record = QuotationCounter(
                person_prefix=prefix,
                financial_year=financial_year,
                current_count=next_count
            )
            db.add(counter_record)
        else:
            # Increment existing registry count by 1
            counter_record.current_count += 1
            next_count = counter_record.current_count

        # 3. Commit row adjustments immediately to release the database lock
        db.commit()

        # 4. Format numbers to string with leading zeros (e.g., 5 becomes "05")
        padded_count = str(next_count).zfill(2)
        formatted_quote_number = f"{prefix}/{padded_count}/{financial_year}"

        return {"quotation_number": formatted_quote_number}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database sequence transaction failed: {str(e)}"
        )
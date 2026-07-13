from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.quotation import Quotation, QuotationLineItem, QuotationStatus
from app.models.QuotationCounter import QuotationCounter
from app.schemas.quotation import QuotationCreate, QuotationUpdate
from datetime import datetime
from typing import List
from typing import Optional

def _generate_next_quotation_number(db: Session, prefix: str = "SR1", fy: str = "25-26") -> str:
    """
    Safely locks, increments, and retrieves the next sequential corporate tracking reference.
    Yields explicit string identifiers matching your target structure: SR1/034/25-26.
    """
    # Use with_for_update() to handle concurrent creation transactions cleanly
    counter_record = (
        db.query(QuotationCounter)
        .filter(
            QuotationCounter.person_prefix == prefix,
            QuotationCounter.financial_year == fy
        )
        .with_for_update()
        .first()
    )

    if not counter_record:
        # Initialize record if it does not exist for this financial period yet
        counter_record = QuotationCounter(
            person_prefix=prefix,
            financial_year=fy,
            current_count=0
        )
        db.add(counter_record)
        db.flush()  # Push to DB state without committing tracking bounds

    # Increment running counter sequence
    counter_record.current_count += 1
    
    # Pad integer value to align format outputs smoothly (e.g., 001, 012, 134)
    padded_sequence = str(counter_record.current_count).zfill(3)
    
    return f"{prefix}/{padded_sequence}/{fy}"


def _calculate_quotation_aggregates(payload_items) -> dict:
    """
    Internal calculation block to aggregate lines and tax totals reliably.
    """
    sub_total = 0.0
    processed_lines = []

    for item in payload_items:
        line_total = float(item.quantity) * float(item.unit_price)
        sub_total += line_total
        
        # Build dictionary matching DB model requirements
        processed_lines.append({
    "model_id": item.model_id,
    "model_no": item.model_no,
    "description": item.description,
    "quantity": item.quantity,
    "unit_price": item.unit_price,
    "total_price": line_total,
    "hsn_code": item.hsn_code,
    "delivery_type": item.delivery_type,
})
        
    return {
        "sub_total": sub_total,
        "processed_lines": processed_lines
    }


def create_new_quotation(db: Session, data: QuotationCreate, prefix: str = "SR1", fy: str = "25-26") -> Quotation:
    try:
        
        calculations = _calculate_quotation_aggregates(data.items)
        
        # New Calculation block containing your exact discount logic matrix
        sub_total = calculations["sub_total"]
        discount_amount = sub_total * (data.discount_rate / 100.0)
        taxable_value = sub_total - discount_amount
        tax_amount = taxable_value * (data.tax_rate / 100.0)
        grand_total = taxable_value + tax_amount
        generated_no = _generate_next_quotation_number(
    db,
    prefix=prefix,
    fy=fy
)
        db_quotation = Quotation(
            revision_no=0,
            is_active=True,
            quotation_no=generated_no,
            client_name=data.client_name,
            client_email=data.client_email,
            company_name=data.company_name,
            tax_rate=data.tax_rate,
            discount_rate=data.discount_rate,
            discount_amount=discount_amount,
            sub_total=sub_total,
            tax_amount=tax_amount,
            grand_total=grand_total,
            status=data.status,
           

        )
        db.add(db_quotation)
        db.flush()
        
        for line in calculations["processed_lines"]:
            db_line = QuotationLineItem(
            quotation_id=db_quotation.id,
            **line
            )
            db.add(db_line)

        db.commit()
        db.refresh(db_quotation)
        return db_quotation
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate core database quotation track: {str(e)}"
        )


def handle_quotation_revision(db: Session, quotation_no: str, data: QuotationUpdate) -> Quotation:
    """
    Implements Hard History editing. Locates the active revision record, 
    deactivates it, and spits out a cloned child entry containing an incremented revision integer.
    """
    try:
        # 1. Fetch currently active reference variant
        old_active_revision = (
            db.query(Quotation)
            .filter(Quotation.quotation_no == quotation_no, Quotation.is_active == True)
            .with_for_update()
            .first()
        )

        if not old_active_revision:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No active quotation tracking line found under reference: {quotation_no}"
            )

        # 2. Deactivate old instance record to seal history log securely
        old_active_revision.is_active = False
        old_active_revision.status = QuotationStatus.SUPERSEDED
        db.flush()
        calculations = _calculate_quotation_aggregates(data.items)
        # 3. Calculate metrics for the incoming modified layout
        sub_total = calculations["sub_total"]
        discount_amount = sub_total * (data.discount_rate / 100.0)
        taxable_value = sub_total - discount_amount
        tax_amount = taxable_value * (data.tax_rate / 100.0)
        grand_total = taxable_value + tax_amount

        # 4. Spin up cloned, incremented record instance block
        new_revision_no = old_active_revision.revision_no + 1
        
        db_new_revision = Quotation(
            quotation_no=old_active_revision.quotation_no,  # Preserves baseline sequence reference exactly
            revision_no=new_revision_no,
            is_active=True,
            client_name=data.client_name,
            client_email=data.client_email,
            company_name=data.company_name,
            tax_rate=data.tax_rate,
            sub_total=sub_total,
            tax_amount=tax_amount,
            grand_total=grand_total,
            status=data.status,
        

        )
        db.add(db_new_revision)
        db.flush()

        # 5. Populate fresh line parameters
        for line in calculations["processed_lines"]:
            db_line = QuotationLineItem(
                quotation_id=db_new_revision.id,
                **line
            )
            db.add(db_line)

        db.commit()
        db.refresh(db_new_revision)
        return db_new_revision

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quotation revision tracking transaction failure: {str(e)}"
        )


def get_quotation_by_number(db: Session, quotation_no: str) -> List[Quotation]:
    """
    Retrieves the complete historical timeline string variations for a specific target quotation number,
    ordered systematically from earliest version to the newest active layout variant.
    """
    return (
        db.query(Quotation)
        .options(joinedload(Quotation.items))
        .filter(Quotation.quotation_no == quotation_no)
        .order_by(Quotation.revision_no.asc())
        .all()
    )


def get_active_quotation(db: Session, quotation_no: str) -> Optional[Quotation]:
    """
    Direct fetch targeting exclusively the active variant execution reference point.
    """
    return (
        db.query(Quotation)
        .options(joinedload(Quotation.items))
        .filter(Quotation.quotation_no == quotation_no, Quotation.is_active == True)
        .first()
    )
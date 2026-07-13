from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime, timedelta

from app.models.purchase import PurchaseInward, PurchaseItem, PurchaseItemSerial, PurchaseType
from app.models.sales import SalesOutward, SalesItem, SalesItemSerial, SalesType
from app.models.models import SerialNumber
from app.models.models import Model


def get_demo_tracking(db: Session, demo_type: str = "all"):
    """
    Get complete demo tracking data.
    
    demo_type: "with_customer" | "from_supplier" | "overdue" | "all"
    """
    today = datetime.utcnow()
    
    # All demo serials in the system
    demo_serials = (
        db.query(SerialNumber)
        .filter(
            SerialNumber.status.in_([
                "DEMO_FROM_SUPPLIER",
                "DEMO_WITH_CUSTOMER",
                "DEMO_RETURNED_BY_CUSTOMER",
                "RETURNED_TO_SUPPLIER",
            ])
        )
        .all()
    )
    
    results = []
    
    for serial in demo_serials:
        # Find the original purchase that brought this serial in
        purchase_item_serial = (
            db.query(PurchaseItemSerial)
            .filter(PurchaseItemSerial.serial_number == serial.serial_number)
            .first()
        )
        
        # Find any sales that sent this serial out
        sales_item_serial = (
            db.query(SalesItemSerial)
            .filter(SalesItemSerial.serial_number == serial.serial_number)
            .first()
        )
        
        # Get purchase info
        purchase_info = None
        expected_return_date = None
        if purchase_item_serial:
            purchase_item = purchase_item_serial.purchase_item
            purchase = purchase_item.purchase
            purchase_info = {
                "purchase_id": purchase.id,
                "purchase_no": purchase.purchase_no,
                "purchase_type": purchase.purchase_type.value,
                "purchase_date": purchase.created_at,
                "supplier_name": purchase.supplier_name,
            }
            if purchase.expected_return_date:
                expected_return_date = purchase.expected_return_date
        
        # Get sales info
        sales_info = None
        if sales_item_serial:
            sales_item = sales_item_serial.sales_item
            sales = sales_item.sales
            sales_info = {
                "sales_id": sales.id,
                "sales_no": sales.sales_no,
                "sales_type": sales.sales_type.value,
                "sales_date": sales.created_at,
                "client_name": sales.client_name,
            }
        
        # Get model info
        model = db.query(Model).filter(Model.id == serial.model_id).first()
        
        # Calculate days remaining
        days_remaining = None
        is_overdue = False
        if expected_return_date:
            delta = expected_return_date - today
            days_remaining = delta.days
            is_overdue = days_remaining < 0
        
        result = {
            "serial_number": serial.serial_number,
            "model_no": model.model_no if model else "Unknown",
            "description": model.description if model else "",
            "current_status": serial.status,
            "purchase": purchase_info,
            "sales": sales_info,
            "expected_return_date": expected_return_date,
            "days_remaining": days_remaining,
            "is_overdue": is_overdue,
            "lifecycle": build_lifecycle(serial.serial_number, purchase_info, sales_info),
        }
        
        # Apply filter
        if demo_type == "with_customer" and serial.status != "DEMO_WITH_CUSTOMER":
            continue
        if demo_type == "from_supplier" and serial.status != "DEMO_FROM_SUPPLIER":
            continue
        if demo_type == "overdue" and not is_overdue:
            continue
        
        results.append(result)
    
    # Sort: overdue first, then by days remaining
    results.sort(key=lambda x: (
        not x["is_overdue"],
        x["days_remaining"] if x["days_remaining"] is not None else 999
    ))
    
    return {
        "total": len(results),
        "overdue": sum(1 for r in results if r["is_overdue"]),
        "with_customer": sum(1 for r in results if r["current_status"] == "DEMO_WITH_CUSTOMER"),
        "from_supplier": sum(1 for r in results if r["current_status"] == "DEMO_FROM_SUPPLIER"),
        "data": results,
    }


def build_lifecycle(serial_number, purchase_info, sales_info):
    """Build lifecycle timeline for a demo serial"""
    events = []
    
    if purchase_info:
        events.append({
            "date": purchase_info["purchase_date"],
            "event": f"Received: {purchase_info['purchase_type']}",
            "reference": purchase_info["purchase_no"],
            "party": purchase_info["supplier_name"],
            "type": "inward",
        })
    
    if sales_info:
        events.append({
            "date": sales_info["sales_date"],
            "event": f"Sent: {sales_info['sales_type']}",
            "reference": sales_info["sales_no"],
            "party": sales_info["client_name"],
            "type": "outward",
        })
    
    events.sort(key=lambda x: x["date"])
    return events


def get_demo_stats(db: Session):
    """Get summary statistics for demo dashboard"""
    today = datetime.utcnow()
    warning_date = today + timedelta(days=7)
    
    demo_serials = (
        db.query(SerialNumber)
        .filter(
            SerialNumber.status.in_([
                "DEMO_FROM_SUPPLIER",
                "DEMO_WITH_CUSTOMER",
                "DEMO_RETURNED_BY_CUSTOMER",
            ])
        )
        .all()
    )
    
    # Count overdue demos
    overdue_count = 0
    due_soon_count = 0
    active_count = 0
    
    for serial in demo_serials:
        purchase_item_serial = (
            db.query(PurchaseItemSerial)
            .filter(PurchaseItemSerial.serial_number == serial.serial_number)
            .first()
        )
        if purchase_item_serial:
            purchase = purchase_item_serial.purchase_item.purchase
            if purchase.expected_return_date:
                if purchase.expected_return_date < today:
                    overdue_count += 1
                elif purchase.expected_return_date <= warning_date:
                    due_soon_count += 1
                else:
                    active_count += 1
            else:
                active_count += 1
    
    return {
        "total_demo_units": len(demo_serials),
        "with_customers": sum(1 for s in demo_serials if s.status == "DEMO_WITH_CUSTOMER"),
        "from_suppliers": sum(1 for s in demo_serials if s.status == "DEMO_FROM_SUPPLIER"),
        "overdue": overdue_count,
        "due_soon": due_soon_count,
        "active": active_count,
    }
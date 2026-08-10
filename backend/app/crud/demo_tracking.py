# app/crud/demo_tracking.py — Complete Rewrite

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.models.purchase import PurchaseInward, PurchaseItem, PurchaseItemSerial, PurchaseType
from app.models.sales import SalesOutward, SalesItem, SalesItemSerial, SalesType
from app.models.models import SerialNumber, Model
from app.models.delivery_challan import SerialDeliveryChallan, DeliveryChallan, DCType, DeliveryStatus


def get_demo_tracking(db: Session, demo_type: str = "all"):
    """
    Get complete demo tracking across ALL sources.
    
    Sources: Purchase, Sales, Delivery Challans
    demo_type: "all" | "with_customer" | "from_supplier" | "overdue" | "missing_dc"
    """
    today = datetime.utcnow()
    
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
        # Find all possible sources
        purchase_info = _get_purchase_info(db, serial.serial_number)
        sales_info = _get_sales_info(db, serial.serial_number)
        dc_links = _get_dc_links(db, serial.id)
        
        # Determine the best source of truth
        source = _determine_source(purchase_info, sales_info, dc_links)
        
        # Get expected return date from any source
        expected_return_date = (
            purchase_info.get("expected_return_date") if purchase_info else None
        ) or _get_dc_return_date(dc_links)
        
        # Calculate days remaining
        days_remaining = None
        is_overdue = False
        is_due_soon = False
        
        if expected_return_date:
            delta = expected_return_date - today
            days_remaining = delta.days
            is_overdue = days_remaining < 0
            is_due_soon = 0 <= days_remaining <= 7
        
        # Check if missing DC documentation
        has_missing_dc = _check_missing_dc(serial.status, dc_links)
        
        model = db.query(Model).filter(Model.id == serial.model_id).first()
        
        result = {
            "id": serial.id,
            "serial_number": serial.serial_number,
            "model_id": serial.model_id,
            "model_no": model.model_no if model else "Unknown",
            "description": model.description if model else "",
            "current_status": serial.status,
            "source": source,  # "purchase" | "sales" | "delivery_challan" | "unknown"
            
            # Party info
            "supplier": purchase_info.get("supplier_name") if purchase_info else None,
            "supplier_ref": purchase_info.get("purchase_no") if purchase_info else None,
            "customer": sales_info.get("client_name") if sales_info else None,
            "customer_ref": sales_info.get("sales_no") if sales_info else None,
            
            # DC info
            "dc_links": dc_links,
            "has_missing_dc": has_missing_dc,
            "dc_count": len(dc_links),
            
            # Dates
            "received_date": purchase_info.get("purchase_date") if purchase_info else None,
            "sent_date": sales_info.get("sales_date") if sales_info else _get_first_dc_out_date(dc_links),
            "expected_return_date": expected_return_date,
            "days_remaining": days_remaining,
            "is_overdue": is_overdue,
            "is_due_soon": is_due_soon,
            
            # Lifecycle
            "lifecycle": _build_full_lifecycle(purchase_info, sales_info, dc_links),
        }
        
        # Apply filters
        if demo_type == "with_customer" and serial.status != "DEMO_WITH_CUSTOMER":
            continue
        if demo_type == "from_supplier" and serial.status != "DEMO_FROM_SUPPLIER":
            continue
        if demo_type == "overdue" and not is_overdue:
            continue
        if demo_type == "missing_dc" and not has_missing_dc:
            continue
        
        results.append(result)
    
    # Sort: overdue first, then due soon, then by days remaining
    results.sort(key=lambda x: (
        not x["is_overdue"],
        not x["is_due_soon"],
        x["days_remaining"] if x["days_remaining"] is not None else 999
    ))
    
    return {
        "total": len(results),
        "overdue": sum(1 for r in results if r["is_overdue"]),
        "due_soon": sum(1 for r in results if r["is_due_soon"]),
        "with_customer": sum(1 for r in results if r["current_status"] == "DEMO_WITH_CUSTOMER"),
        "from_supplier": sum(1 for r in results if r["current_status"] == "DEMO_FROM_SUPPLIER"),
        "missing_dc": sum(1 for r in results if r["has_missing_dc"]),
        "data": results,
    }


def _get_purchase_info(db: Session, serial_number: str) -> Optional[dict]:
    """Get purchase info for a serial number."""
    pis = (
        db.query(PurchaseItemSerial)
        .filter(PurchaseItemSerial.serial_number == serial_number)
        .first()
    )
    if not pis:
        return None
    
    purchase = pis.purchase_item.purchase
    return {
        "purchase_id": purchase.id,
        "purchase_no": purchase.purchase_no,
        "purchase_type": purchase.purchase_type.value,
        "purchase_date": purchase.created_at,
        "supplier_id": purchase.supplier_id,
        "supplier_name": purchase.supplier_name,
        "expected_return_date": purchase.expected_return_date,
    }


def _get_sales_info(db: Session, serial_number: str) -> Optional[dict]:
    """Get sales info for a serial number."""
    sis = (
        db.query(SalesItemSerial)
        .filter(SalesItemSerial.serial_number == serial_number)
        .first()
    )
    if not sis:
        return None
    
    sales = sis.sales_item.sales
    return {
        "sales_id": sales.id,
        "sales_no": sales.sales_no,
        "sales_type": sales.sales_type.value,
        "sales_date": sales.created_at,
        "client_id": sales.client_id,
        "client_name": sales.client_name,
    }


def _get_dc_links(db: Session, serial_id: int) -> list:
    """Get all DC links for a serial number."""
    links = (
        db.query(SerialDeliveryChallan)
        .filter(SerialDeliveryChallan.serial_number_id == serial_id)
        .order_by(SerialDeliveryChallan.created_at.asc())
        .all()
    )
    
    result = []
    for link in links:
        dc = link.delivery_challan
        result.append({
            "dc_id": dc.id,
            "dc_no": dc.challan_no,
            "dc_type": dc.dc_type.value if dc.dc_type else "UNKNOWN",
            "dc_status": dc.status.value if dc.status else "UNKNOWN",
            "dc_date": dc.created_at,
            "direction": link.direction,
            "client_name": dc.client.company_name if dc.client else None,
            "expected_return_date": dc.expected_return_date,
            "is_returned": dc.is_returned,
        })
    
    return result


def _get_dc_return_date(dc_links: list) -> Optional[datetime]:
    """Get expected return date from DC links."""
    for link in dc_links:
        if link.get("expected_return_date"):
            return link["expected_return_date"]
    return None


def _get_first_dc_out_date(dc_links: list) -> Optional[datetime]:
    """Get date of first OUT DC."""
    for link in dc_links:
        if link.get("direction") == "OUT":
            return link.get("dc_date")
    return None


def _determine_source(purchase_info, sales_info, dc_links) -> str:
    """Determine primary source of this demo."""
    if dc_links:
        return "delivery_challan"
    if sales_info:
        return "sales"
    if purchase_info:
        return "purchase"
    return "unknown"


def _check_missing_dc(status: str, dc_links: list) -> bool:
    """Check if demo is missing DC documentation."""
    has_dc = len(dc_links) > 0
    
    # If demo is with customer but no DC link, it's missing paperwork
    if status == "DEMO_WITH_CUSTOMER" and not has_dc:
        return True
    
    # If demo was sent out (has sales) but no DC, flag it
    if status in ["DEMO_WITH_CUSTOMER", "DEMO_RETURNED_BY_CUSTOMER"] and not has_dc:
        return True
    
    return False


def _build_full_lifecycle(purchase_info, sales_info, dc_links) -> list:
    """Build complete lifecycle including all sources."""
    events = []
    
    # Purchase event
    if purchase_info:
        events.append({
            "date": purchase_info["purchase_date"],
            "event": f"Received from Supplier",
            "detail": purchase_info["purchase_type"],
            "reference": purchase_info["purchase_no"],
            "party": purchase_info["supplier_name"],
            "type": "inward",
            "source": "purchase",
        })
    
    # DC events
    for dc in dc_links:
        direction_label = "Sent to Customer" if dc["direction"] == "OUT" else "Returned from Customer"
        events.append({
            "date": dc["dc_date"],
            "event": f"DC: {direction_label}",
            "detail": f"Status: {dc['dc_status']}",
            "reference": dc["dc_no"],
            "party": dc["client_name"] or "Unknown",
            "type": "outward" if dc["direction"] == "OUT" else "inward",
            "source": "delivery_challan",
            "dc_status": dc["dc_status"],
        })
    
    # Sales event
    if sales_info:
        events.append({
            "date": sales_info["sales_date"],
            "event": f"Sales Outward",
            "detail": sales_info["sales_type"],
            "reference": sales_info["sales_no"],
            "party": sales_info["client_name"],
            "type": "outward",
            "source": "sales",
        })
    
    events.sort(key=lambda x: x["date"] if x["date"] else datetime.min)
    return events


def get_demo_stats(db: Session) -> dict:
    """Get comprehensive demo statistics."""
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
    
    total = len(demo_serials)
    with_customer = 0
    from_supplier = 0
    overdue = 0
    due_soon = 0
    missing_dc = 0
    
    for serial in demo_serials:
        if serial.status == "DEMO_WITH_CUSTOMER":
            with_customer += 1
        elif serial.status == "DEMO_FROM_SUPPLIER":
            from_supplier += 1
        
        # Check overdue/due soon from all sources
        pis = (
            db.query(PurchaseItemSerial)
            .filter(PurchaseItemSerial.serial_number == serial.serial_number)
            .first()
        )
        
        deadline = None
        if pis and pis.purchase_item.purchase.expected_return_date:
            deadline = pis.purchase_item.purchase.expected_return_date
        
        if not deadline:
            dc_links = (
                db.query(SerialDeliveryChallan)
                .filter(SerialDeliveryChallan.serial_number_id == serial.id)
                .all()
            )
            for link in dc_links:
                if link.delivery_challan.expected_return_date and not link.delivery_challan.is_returned:
                    deadline = link.delivery_challan.expected_return_date
                    break
        
        if deadline:
            if deadline < today:
                overdue += 1
            elif deadline <= warning_date:
                due_soon += 1
        
        # Check missing DC
        dc_count = (
            db.query(SerialDeliveryChallan)
            .filter(SerialDeliveryChallan.serial_number_id == serial.id)
            .count()
        )
        if serial.status in ["DEMO_WITH_CUSTOMER", "DEMO_RETURNED_BY_CUSTOMER"] and dc_count == 0:
            missing_dc += 1
    
    return {
        "total_demo_units": total,
        "with_customers": with_customer,
        "from_suppliers": from_supplier,
        "overdue": overdue,
        "due_soon": due_soon,
        "missing_dc": missing_dc,
        "active": total - overdue,
    }


def get_serial_by_number(db: Session, serial_number: str):
    """Find serial number by its value."""
    return db.query(SerialNumber).filter(SerialNumber.serial_number == serial_number).first()


def link_serial_to_dc(db: Session, serial_number_id: int, dc_id: int, dc_item_id: int = None, direction: str = "OUT"):
    """Link a serial number to a delivery challan."""
    link = SerialDeliveryChallan(
        serial_number_id=serial_number_id,
        delivery_challan_id=dc_id,
        delivery_challan_item_id=dc_item_id,
        direction=direction,
    )
    db.add(link)
    db.commit()
    return link
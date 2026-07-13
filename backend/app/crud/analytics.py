from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.models.models import StockLedger, MovementType, ReferenceType
from app.models.purchase import PurchaseInward, PurchaseStatus
from app.models.sales import SalesOutward, SalesStatus, SalesType
from app.models.models import Model
from app.models.models import SerialNumber


def get_dashboard_stats(db: Session):
    """Get overall statistics"""
    today = datetime.utcnow()
    month_start = today.replace(day=1, hour=0, minute=0, second=0)
    
    # Total purchases this month
    monthly_purchases = (
        db.query(func.coalesce(func.sum(PurchaseInward.grand_total), 0))
        .filter(
            PurchaseInward.status == PurchaseStatus.POSTED,
            PurchaseInward.created_at >= month_start
        )
        .scalar()
    )
    
    # Total sales this month
    monthly_sales = (
        db.query(func.coalesce(func.sum(SalesOutward.grand_total), 0))
        .filter(
            SalesOutward.status == SalesStatus.POSTED,
            SalesOutward.created_at >= month_start
        )
        .scalar()
    )
    
    # --- FIXED: Dynamic Stock Value Calculation ---
    # Calculates total value directly from current ledger quantities grouped by model
    stock_value_query = (
        db.query(
            func.sum(
                func.coalesce(StockLedger.quantity, 0) * func.coalesce(Model.price, 0.00)
            )
        )
        .select_from(Model)
        .outerjoin(StockLedger, Model.id == StockLedger.model_id)
        .scalar()
    )
    stock_value = stock_value_query or 0.00
    
    # Pending purchase orders
    pending_purchases = (
        db.query(func.count(PurchaseInward.id))
        .filter(PurchaseInward.status == PurchaseStatus.DRAFT)
        .scalar()
    )
    
    # Pending sales orders
    pending_sales = (
        db.query(func.count(SalesOutward.id))
        .filter(SalesOutward.status == SalesStatus.DRAFT)
        .scalar()
    )
    
    # Overdue demos
    overdue_demos = (
        db.query(func.count(SerialNumber.id))
        .filter(
            SerialNumber.status.in_(["DEMO_WITH_CUSTOMER", "DEMO_FROM_SUPPLIER"])
        )
        .scalar()
    )
    
    # --- FIXED: Low stock items count (< 5 units) ---
    # Leverages a subquery to correctly filter aggregate counts without the model column
    low_stock_subquery = (
        db.query(Model.id)
        .outerjoin(StockLedger, Model.id == StockLedger.model_id)
        .group_by(Model.id)
        .having(
            func.coalesce(func.sum(StockLedger.quantity), 0) < 5,
            func.coalesce(func.sum(StockLedger.quantity), 0) >= 0
        )
        .subquery()
    )
    low_stock = db.query(func.count(low_stock_subquery.c.id)).scalar()
    
    # Total units sold this month
    units_sold = (
        db.query(func.coalesce(func.sum(StockLedger.quantity), 0))
        .filter(
            StockLedger.movement_type == MovementType.OUTWARD,
            StockLedger.reference_type == ReferenceType.SALES,
            StockLedger.created_at >= month_start
        )
        .scalar()
    )
    
    # Total units purchased this month
    units_purchased = (
        db.query(func.coalesce(func.sum(StockLedger.quantity), 0))
        .filter(
            StockLedger.movement_type == MovementType.INWARD,
            StockLedger.reference_type == ReferenceType.PURCHASE,
            StockLedger.created_at >= month_start
        )
        .scalar()
    )
    
    return {
        "monthly_purchases": float(monthly_purchases),
        "monthly_sales": float(monthly_sales),
        "stock_value": float(stock_value),
        "pending_purchases": pending_purchases,
        "pending_sales": pending_sales,
        "overdue_demos": overdue_demos,
        "low_stock_items": low_stock,
        "units_sold": int(units_sold),
        "units_purchased": int(units_purchased),
    }


def get_monthly_trend(db: Session, months: int = 6):
    """Get monthly purchase vs sales trend for charts"""
    today = datetime.utcnow()
    data = []
    
    for i in range(months - 1, -1, -1):
        month_date = today.replace(day=1) - timedelta(days=i * 30)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0)
        
        # Last day of month
        if month_date.month == 12:
            month_end = month_date.replace(year=month_date.year + 1, month=1, day=1)
        else:
            month_end = month_date.replace(month=month_date.month + 1, day=1)
        
        purchases = (
            db.query(func.coalesce(func.sum(PurchaseInward.grand_total), 0))
            .filter(
                PurchaseInward.status == PurchaseStatus.POSTED,
                PurchaseInward.created_at >= month_start,
                PurchaseInward.created_at < month_end
            )
            .scalar()
        )
        
        sales = (
            db.query(func.coalesce(func.sum(SalesOutward.grand_total), 0))
            .filter(
                SalesOutward.status == SalesStatus.POSTED,
                SalesOutward.created_at >= month_start,
                SalesOutward.created_at < month_end
            )
            .scalar()
        )
        
        data.append({
            "month": month_date.strftime("%b"),
            "year": month_date.year,
            "purchases": float(purchases),
            "sales": float(sales),
        })
    
    return data


def get_sales_by_type(db: Session):
    """Get sales distribution by type (for pie chart)"""
    results = (
        db.query(
            SalesOutward.sales_type,
            func.count(SalesOutward.id).label("count"),
            func.coalesce(func.sum(SalesOutward.grand_total), 0).label("total")
        )
        .filter(SalesOutward.status == SalesStatus.POSTED)
        .group_by(SalesOutward.sales_type)
        .all()
    )
    
    return [
        {
            "type": r.sales_type.value if hasattr(r.sales_type, 'value') else str(r.sales_type),
            "count": r.count,
            "total": float(r.total)
        }
        for r in results
    ]


def get_top_products(db: Session, limit: int = 10):
    """Get top selling products and compute their current stock reliably"""
    today = datetime.utcnow()
    month_start = today.replace(day=1, hour=0, minute=0, second=0)
    
    # 1. Pull total units sold this month for models
    top_selling_results = (
        db.query(
            StockLedger.model_id,
            func.sum(StockLedger.quantity).label("units_sold")
        )
        .filter(
            StockLedger.movement_type == MovementType.OUTWARD,
            StockLedger.reference_type == ReferenceType.SALES,
            StockLedger.created_at >= month_start
        )
        .group_by(StockLedger.model_id)
        .order_by(func.sum(StockLedger.quantity).desc())
        .limit(limit)
        .all()
    )
    
    if not top_selling_results:
        return []
        
    # Extract IDs of the top moving items
    top_model_ids = [r.model_id for r in top_selling_results]
    units_sold_map = {r.model_id: r.units_sold for r in top_selling_results}
    
    # 2. Fetch those specific models alongside their full historical ledger stock sum
    models_with_stock = (
        db.query(
            Model.id,
            Model.model_no,
            Model.description,
            func.coalesce(func.sum(StockLedger.quantity), 0).label("current_stock")
        )
        .outerjoin(StockLedger, Model.id == StockLedger.model_id)
        .filter(Model.id.in_(top_model_ids))
        .group_by(Model.id, Model.model_no, Model.description)
        .all()
    )
    
    # 3. Combine both measurements back together into the expected frontend payload
    data = []
    for m in models_with_stock:
        data.append({
            "model_id": m.id,
            "model_no": m.model_no,
            "description": m.description,
            "units_sold": int(units_sold_map.get(m.id, 0)),
            "current_stock": int(m.current_stock),
        })
        
    # Sort the final array back to descending sales order
    data.sort(key=lambda x: x["units_sold"], reverse=True)
    return data

def get_low_stock_alerts(db: Session, threshold: int = 5):
    """Get items with low stock computed directly inside the database"""
    results = (
        db.query(
            Model.id,
            Model.model_no,
            Model.price,
            func.coalesce(func.sum(StockLedger.quantity), 0).label("current_stock")
        )
        .outerjoin(StockLedger, Model.id == StockLedger.model_id)
        .group_by(Model.id)
        .having(
            func.coalesce(func.sum(StockLedger.quantity), 0) < threshold,
            func.coalesce(func.sum(StockLedger.quantity), 0) >= 0
        )
        .order_by("current_stock")
        .all()
    )
    
    return [
        {
            "model_id": r.id,
            "model_no": r.model_no,
            "current_stock": int(r.current_stock),
            "price": float(r.price or 0),
        }
        for r in results
    ]
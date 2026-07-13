from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud.analytics import (
    get_dashboard_stats,
    get_monthly_trend,
    get_sales_by_type,
    get_top_products,
    get_low_stock_alerts,
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    """Get overall dashboard statistics"""
    return get_dashboard_stats(db)


@router.get("/monthly-trend")
def monthly_trend(months: int = Query(6, ge=1, le=12), db: Session = Depends(get_db)):
    """Get monthly purchase vs sales trend"""
    return get_monthly_trend(db, months)


@router.get("/sales-by-type")
def sales_by_type(db: Session = Depends(get_db)):
    """Get sales distribution by type"""
    return get_sales_by_type(db)


@router.get("/top-products")
def top_products(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    """Get top selling products"""
    return get_top_products(db, limit)


@router.get("/low-stock")
def low_stock_alerts(threshold: int = Query(5, ge=1), db: Session = Depends(get_db)):
    """Get low stock alerts"""
    return get_low_stock_alerts(db, threshold)
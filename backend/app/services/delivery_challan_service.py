# services/delivery_challan_service.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.delivery_challan import (
    DeliveryChallan, 
    DeliveryChallanItem, 
    DeliveryChallanCounter,
    DeliveryStatus
)
from app.models.models import InventoryMovement, MovementType
from app.models.audit_log import AuditLog


class DeliveryChallanService:
    
    @staticmethod
    def generate_challan_number(db: Session, financial_year: str) -> str:
        """Generate unique challan number"""
        counter = db.query(DeliveryChallanCounter).filter(
            DeliveryChallanCounter.financial_year == financial_year
        ).first()
        
        if not counter:
            # Create new counter for financial year
            counter = DeliveryChallanCounter(
                financial_year=financial_year,
                prefix="PR/DC",
                current_number=1
            )
            db.add(counter)
            db.flush()
        else:
            counter.current_number += 1
        
        challan_no = counter.get_next_number()
        return challan_no
    
    @staticmethod
    def create_challan(
        db: Session, 
        client_id: int, 
        delivery_date: Optional[date] = None,
        remarks: Optional[str] = None,
        items: Optional[List[dict]] = None
    ) -> DeliveryChallan:
        """Create new delivery challan"""
        current_year = f"{datetime.now().year % 100:02d}-{(datetime.now().year + 1) % 100:02d}"
        
        challan = DeliveryChallan(
            challan_no=DeliveryChallanService.generate_challan_number(db, current_year),
            revision_no=0,
            client_id=client_id,
            status=DeliveryStatus.DRAFT,
            delivery_date=delivery_date,
            remarks=remarks
        )
        
        db.add(challan)
        db.flush()
        
        # Add items if provided
        if items:
            for item in items:
                challan_item = DeliveryChallanItem(
                    challan_id=challan.id,
                    model_id=item['model_id'],
                    description=item['description'],
                    hsn_code=item.get('hsn_code'),
                    quantity_requested=item['quantity_requested'],
                    quantity_delivered=0,  # Start with 0 delivered
                    unit_price=item.get('unit_price', 0.0),
                    remarks=item.get('remarks')
                )
                db.add(challan_item)
        
        # Audit log
        AuditLog.create_log(
            db=db,
            action="CREATE",
            entity_type="DELIVERY_CHALLAN",
            entity_id=challan.id,
            details=f"Challan {challan.challan_no} created"
        )
        
        db.commit()
        db.refresh(challan)
        return challan
    
    @staticmethod
    def update_challan_items(
        db: Session,
        challan_id: int,
        items: List[dict],
        current_user_id: Optional[int] = None
    ) -> DeliveryChallan:
        """Update delivery quantities and optionally create revision"""
        challan = db.query(DeliveryChallan).filter(
            DeliveryChallan.id == challan_id,
            DeliveryChallan.is_active == True
        ).first()
        
        if not challan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery challan not found"
            )
        
        if challan.status != DeliveryStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft challans can be modified"
            )
        
        # Check if we need revision
        create_revision = False
        
        # Update item quantities
        for item_data in items:
            item = db.query(DeliveryChallanItem).filter(
                DeliveryChallanItem.id == item_data['id'],
                DeliveryChallanItem.challan_id == challan_id
            ).first()
            
            if item:
                old_qty = item.quantity_delivered
                item.quantity_delivered = item_data['quantity_delivered']
                item.quantity_requested = item_data.get('quantity_requested', item.quantity_requested)
                
                if old_qty != item.quantity_delivered:
                    create_revision = True
        
        if create_revision:
            challan.revision_no += 1
        
        challan.updated_at = datetime.now()
        
        AuditLog.create_log(
            db=db,
            action="UPDATE",
            entity_type="DELIVERY_CHALLAN",
            entity_id=challan.id,
            user_id=current_user_id,
            details=f"Challan {challan.challan_no} updated (Revision {challan.revision_no})"
        )
        
        db.commit()
        db.refresh(challan)
        return challan
    
    @staticmethod
    def confirm_challan(
        db: Session,
        challan_id: int,
        user_id: Optional[int] = None
    ) -> DeliveryChallan:
        """Confirm delivery and update inventory"""
        challan = db.query(DeliveryChallan).filter(
            DeliveryChallan.id == challan_id,
            DeliveryChallan.is_active == True
        ).first()
        
        if not challan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery challan not found"
            )
        
        if challan.status != DeliveryStatus.PRINTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only printed challans can be confirmed"
            )
        
        # Process inventory movements
        for item in challan.items:
            if item.quantity_delivered > 0:
                # Create OUTWARD movement
                InventoryMovement.create_movement(
                    db=db,
                    model_id=item.model_id,
                    movement_type=MovementType.OUTWARD,
                    quantity=item.quantity_delivered,
                    reference_type="DELIVERY_CHALLAN",
                    reference_id=challan.id,
                    reference_no=challan.challan_no,
                    notes=f"Delivery from challan {challan.challan_no}"
                )
        
        # Update challan status
        challan.status = DeliveryStatus.CONFIRMED
        challan.confirmed_at = datetime.now()
        challan.confirmed_by = user_id
        
        AuditLog.create_log(
            db=db,
            action="CONFIRM",
            entity_type="DELIVERY_CHALLAN",
            entity_id=challan.id,
            user_id=user_id,
            details=f"Challan {challan.challan_no} confirmed, inventory updated"
        )
        
        db.commit()
        db.refresh(challan)
        return challan
    
    @staticmethod
    def cancel_challan(
        db: Session,
        challan_id: int,
        user_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> DeliveryChallan:
        """Cancel delivery and restore inventory"""
        challan = db.query(DeliveryChallan).filter(
            DeliveryChallan.id == challan_id,
            DeliveryChallan.is_active == True
        ).first()
        
        if not challan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery challan not found"
            )
        
        if challan.status == DeliveryStatus.CONFIRMED:
            # Restore inventory
            for item in challan.items:
                if item.quantity_delivered > 0:
                    InventoryMovement.create_movement(
                        db=db,
                        model_id=item.model_id,
                        movement_type=MovementType.INWARD,
                        quantity=item.quantity_delivered,
                        reference_type="DELIVERY_CHALLAN_CANCEL",
                        reference_id=challan.id,
                        reference_no=challan.challan_no,
                        notes=f"Cancellation of challan {challan.challan_no}. Reason: {reason or 'Not specified'}"
                    )
        
        challan.status = DeliveryStatus.CANCELLED
        challan.cancelled_at = datetime.now()
        challan.cancelled_by = user_id
        
        AuditLog.create_log(
            db=db,
            action="CANCEL",
            entity_type="DELIVERY_CHALLAN",
            entity_id=challan.id,
            user_id=user_id,
            details=f"Challan {challan.challan_no} cancelled. Reason: {reason or 'Not specified'}"
        )
        
        db.commit()
        db.refresh(challan)
        return challan
    
    @staticmethod
    def print_challan(
        db: Session,
        challan_id: int,
        user_id: Optional[int] = None
    ) -> DeliveryChallan:
        """Mark challan as printed"""
        challan = db.query(DeliveryChallan).filter(
            DeliveryChallan.id == challan_id,
            DeliveryChallan.is_active == True
        ).first()
        
        if not challan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delivery challan not found"
            )
        
        if challan.status != DeliveryStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft challans can be marked as printed"
            )
        
        challan.status = DeliveryStatus.PRINTED
        challan.printed_at = datetime.now()
        challan.printed_by = user_id
        
        db.commit()
        db.refresh(challan)
        return challan
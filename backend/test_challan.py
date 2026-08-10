# test_challan.py
from app.db.session import SessionLocal
from app.models.delivery_challan import DeliveryChallan, DeliveryChallanCounter, DeliveryStatus
from datetime import date

db = SessionLocal()

try:
    # Test 1: Create counter
    counter = DeliveryChallanCounter(
        financial_year="",
        prefix="PR/DC",
        current_number=1
    )
    db.add(counter)
    db.commit()
    print(f"✅ Counter created: {counter.get_next_number()}")
    
    # Test 2: Create draft challan
    challan = DeliveryChallan(
        challan_no="PR/DC-001/26-27",
        client_id=14,  # Make sure client ID 1 exists
        status=DeliveryStatus.DRAFT,
        delivery_date=date.today()
    )
    db.add(challan)
    db.commit()
    print(f"✅ Challan created: {challan.challan_no} (Status: {challan.status})")
    
    # Test 3: Status flow
    challan.status = DeliveryStatus.PRINTED
    db.commit()
    print(f"✅ Status updated: {challan.status}")
    
    print("\n🎉 Migration successful! All tests passed.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
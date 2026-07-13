import requests
# Make sure BOTH are imported so SQLAlchemy registers them
from app.models.models import Model 
from app.models.purchase import PurchaseItem  # <-- Adjust this path to wherever PurchaseItem lives
BASE_URL = "http://127.0.0.1:8002/api/v1"

def test_create_draft():
    print("\n📝 TEST: Create DRAFT Purchase")
    payload = {
        "supplier_id": 1,
        "supplier_invoice_no": "INV-TEST-001",
        "purchase_type": "NORMAL_PURCHASE",
        "payment_status": "UNPAID",
        "items": [
            {
                "model_id": 1,
                "model_no": "IGNORED",
                "quantity": 2,
                "unit_cost": 1500.00,
                "serial_numbers": [
                    {"serial_number": "AUTO-TEST-001"},
                    {"serial_number": "AUTO-TEST-002"}
                ]
            }
        ]
    }
    r = requests.post(f"{BASE_URL}/purchases/", json=payload)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json().get('status')}, ID: {r.json().get('id')}")
    return r.json().get('id')

def test_get_purchase(purchase_id):
    print(f"\n📝 TEST: Get Purchase {purchase_id}")
    r = requests.get(f"{BASE_URL}/purchases/{purchase_id}")
    print(f"Status: {r.status_code}")
    print(f"Status: {r.json().get('status')}")

def test_post_purchase(purchase_id):
    print(f"\n📝 TEST: Post Purchase {purchase_id}")
    r = requests.post(f"{BASE_URL}/purchases/{purchase_id}/post")
    print(f"Status: {r.status_code}")
    print(f"New Status: {r.json().get('status')}")

def test_update_posted(purchase_id):
    print(f"\n📝 TEST: Update POSTED Purchase (Should Fail)")
    r = requests.put(f"{BASE_URL}/purchases/{purchase_id}", json={"remarks": "test"})
    print(f"Status: {r.status_code}")
    print(f"Detail: {r.json().get('detail')}")

def test_validation():
    print(f"\n📝 TEST: Validation - Empty Items")
    r = requests.post(f"{BASE_URL}/purchases/", json={
        "supplier_id": 1,
        "purchase_type": "NORMAL_PURCHASE",
        "items": []
    })
    print(f"Status: {r.status_code}")
    print(f"Detail: {r.json().get('detail')}")

if __name__ == "__main__":
    print("🚀 STARTING PURCHASE MODULE TESTS")
    
    # Test validation
    test_validation()
    
    # Test create
    purchase_id = test_create_draft()
    
    if purchase_id:
        # Test get
        test_get_purchase(purchase_id)
        
        # Test post
        test_post_purchase(purchase_id)
        
        # Test update posted (should fail)
        test_update_posted(purchase_id)
    
    print("\n✅ TESTS COMPLETE")
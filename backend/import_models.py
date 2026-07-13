import pandas as pd
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from datetime import datetime
# ============================================================
# CONFIGURATION
# ============================================================
DATABASE_URL = "postgresql://postgres:password@localhost:5432/pr_automation"
EXCEL_FILE = "book2.xlsx"  # Change to your file name

# ============================================================
# CONNECT TO DATABASE
# ============================================================
engine = create_engine(DATABASE_URL)
session = Session(bind=engine)

# ============================================================
# READ EXCEL
# ============================================================
print(f"🚀 Starting Model Import...")
print(f"📁 Excel file: {EXCEL_FILE}")

# Confirm
confirm = input("\n⚠️  This will import models into your database. Continue? (yes/no): ")
if confirm.lower() != "yes":
    print("❌ Import cancelled.")
    sys.exit()

print(f"\n📂 Reading Excel file: {EXCEL_FILE}")
df = pd.read_excel(EXCEL_FILE)

# Clean column names
df.columns = df.columns.str.strip()

print(f"📊 Found {len(df)} rows")
print(f"📋 Columns: {df.columns.tolist()}")

# ============================================================
# VALIDATE COLUMNS
# ============================================================
required_cols = ['Product Name']
if not all(col in df.columns for col in required_cols):
    print(f"❌ Missing required column: 'Product Name'")
    sys.exit()
# ✅ REPLACE WITH RAW SQL:
from sqlalchemy import text

# Create DEFAULT manufacturer using raw SQL
result = session.execute(text("SELECT id FROM manufacturer WHERE name = 'DEFAULT'")).first()
if result:
    default_mfr_id = result[0]
else:
    result = session.execute(
        text("INSERT INTO manufacturer (name) VALUES ('DEFAULT') RETURNING id")
    ).first()
    default_mfr_id = result[0]
    session.commit()
    print("✅ Created DEFAULT manufacturer")

# Create Uncategorized product group using raw SQL
result = session.execute(
    text("SELECT id FROM product_group WHERE name = 'Uncategorized' AND manufacturer_id = :mfr_id"),
    {"mfr_id": default_mfr_id}
).first()
if result:
    DEFAULT_GROUP_ID = result[0]
else:
    result = session.execute(
        text("INSERT INTO product_group (name, manufacturer_id) VALUES ('Uncategorized', :mfr_id) RETURNING id"),
        {"mfr_id": default_mfr_id}
    ).first()
    DEFAULT_GROUP_ID = result[0]
    session.commit()
    print("✅ Created Uncategorized product group")

print(f"📂 Default Group ID: {DEFAULT_GROUP_ID}")
# ============================================================
# IMPORT
# ============================================================
from app.models.models import Model  # ⭐ Capital M
from app.models.models import StockLedger, MovementType, OrderStatus, ReferenceType
from app.crud.models import get_or_create_manufacturer, get_or_create_product_group

imported = 0
errors = 0
stock_created = 0

for index, row in df.iterrows():
    try:
        model_no = str(row['Product Name']).strip()
        if not model_no or model_no == 'nan':
            continue
        
        make_name = str(row.get('Make', '')).strip()
        group_name = str(row.get('Group', '')).strip()
        current_stock = int(row.get('Stock on hand', 0)) if pd.notna(row.get('Stock on hand', 0)) else 0
        
        # Get or create manufacturer
        manufacturer_id = None
        if make_name and make_name != 'nan':
            manufacturer_id = get_or_create_manufacturer(session, make_name)
        
        # Get or create product group
        product_group_id = None
        if group_name and group_name != 'nan' and manufacturer_id:
            product_group_id = get_or_create_product_group(session, group_name, manufacturer_id)
        
        # Check if model already exists
        existing = session.query(Model).filter(Model.model_no == model_no).first()
        if existing:
            print(f"⏭️  Skipping (already exists): {model_no}")
            continue
        
        # Create model
        new_model = Model(
            model_no=model_no,
            description=None,
            price=0.00,
            product_group_id=product_group_id or DEFAULT_GROUP_ID,
        )
        session.add(new_model)
        session.flush()
        
        # Create stock ledger entry if stock > 0
        if current_stock > 0:
            session.execute(text("""
                INSERT INTO stock_ledger 
                (model_id, quantity, movement_type, status, reference_type, 
                reference_id, reference_doc_no, delivery_by, created_at)
                VALUES (:model_id, :qty, 'INWARD', 'STANDARD', 'ADJUSTMENT', 
                        'IMPORT', :doc_no, 'System Import', :now)
            """), {
                "model_id": new_model.id,
                "qty": current_stock,
                "doc_no": f"IMPORT-{model_no}",
                "now": datetime.utcnow()
            })
            stock_created += 1

        session.commit()
        
        
        imported += 1
        print(f"✅ Imported: {model_no} | Stock: {current_stock} | Make: {make_name} | Group: {group_name}")
        
    except Exception as e:
        errors += 1
        session.rollback()
        print(f"❌ Error on row {index + 1}: {str(e)}")
# ============================================================
# SUMMARY
# ============================================================
print(f"\n{'='*60}")
print(f"📊 IMPORT SUMMARY")
print(f"{'='*60}")
print(f"✅ Models imported: {imported}")
print(f"📦 Stock entries created: {stock_created}")
print(f"❌ Errors: {errors}")
print(f"📁 Total rows processed: {len(df)}")
print(f"{'='*60}")

session.close()
print("✅ Import complete!")
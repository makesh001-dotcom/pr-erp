import pandas as pd
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# ============================================================
# CONFIGURATION
# ============================================================
DATABASE_URL = "postgresql://postgres:password@localhost:5432/pr_erp"
EXCEL_FILE = "book1.xlsx"

# ============================================================
# CONNECT TO DATABASE
# ============================================================
engine = create_engine(DATABASE_URL)
session = Session(bind=engine)

# ============================================================
# READ EXCEL
# ============================================================
print("🚀 Starting Model Import (Safe SQL Execution Mode)...")
print(f"📁 Excel file: {EXCEL_FILE}")

confirm = input("\n⚠️ This will import models into your database. Continue? (yes/no): ")
if confirm.lower() != "yes":
    print("❌ Import cancelled.")
    sys.exit()

print(f"\n📂 Reading Excel file: {EXCEL_FILE}")
try:
    df = pd.read_excel(EXCEL_FILE)
except Exception as e:
    print(f"❌ Failed to read Excel file: {e}")
    sys.exit()

df.columns = df.columns.str.strip()
print(f"📊 Found {len(df)} rows")

if "Product Name" not in df.columns:
    print("❌ Missing required column: Product Name")
    sys.exit()

# ============================================================
# INITIALIZE DEFAULT RECORDS (RAW SQL)
# ============================================================
try:
    # 1. Get/Create DEFAULT manufacturer
    result = session.execute(text("SELECT id FROM manufacturer WHERE name = 'DEFAULT'")).first()
    default_mfr_id = result[0] if result else session.execute(
        text("INSERT INTO manufacturer (name) VALUES ('DEFAULT') RETURNING id")
    ).first()[0]

    # 2. Get/Create Uncategorized product group
    result = session.execute(
        text("SELECT id FROM product_group WHERE name = 'Uncategorized' AND manufacturer_id = :mfr_id"),
        {"mfr_id": default_mfr_id}
    ).first()
    
    DEFAULT_GROUP_ID = result[0] if result else session.execute(
        text("INSERT INTO product_group (name, manufacturer_id) VALUES ('Uncategorized', :mfr_id) RETURNING id"),
        {"mfr_id": default_mfr_id}
    ).first()[0]

    session.commit()
    print("✅ System defaults verified/created via Raw SQL.")
    print(f"📂 Default Group ID: {DEFAULT_GROUP_ID}")

except Exception as e:
    session.rollback()
    print(f"❌ Critical error setting up system defaults: {e}")
    sys.exit()

# ============================================================
# IMPORT LOOP (PURE EXECUTIONS)
# ============================================================
imported = 0
errors = 0
stock_created = 0

def raw_get_or_create_manufacturer(sess, name):
    res = sess.execute(text("SELECT id FROM manufacturer WHERE name = :name"), {"name": name}).first()
    if res: 
        return res[0]
    return sess.execute(text("INSERT INTO manufacturer (name) VALUES (:name) RETURNING id"), {"name": name}).first()[0]

def raw_get_or_create_product_group(sess, name, mfr_id):
    res = sess.execute(text("SELECT id FROM product_group WHERE name = :name AND manufacturer_id = :mfr_id"), {"name": name, "mfr_id": mfr_id}).first()
    if res: 
        return res[0]
    return sess.execute(text("INSERT INTO product_group (name, manufacturer_id) VALUES (:name, :mfr_id) RETURNING id"), {"name": name, "mfr_id": mfr_id}).first()[0]

for index, row in df.iterrows():
    try:
        model_no = str(row["Product Name"]).strip()
        if not model_no or model_no == "nan" or pd.isna(row["Product Name"]):
            continue

        make_name = str(row.get("Make", "")).strip()
        group_name = str(row.get("Group", "")).strip()
        
        raw_stock = row.get("Stock on hand", 0)
        current_stock = int(raw_stock) if pd.notna(raw_stock) and str(raw_stock).strip().isdigit() else 0

        # 1. Resolve manufacturer
        manufacturer_id = None
        if make_name and make_name != "nan":
            manufacturer_id = raw_get_or_create_manufacturer(session, make_name)

        # 2. Resolve product group
        product_group_id = None
        if group_name and group_name != "nan" and manufacturer_id:
            product_group_id = raw_get_or_create_product_group(session, group_name, manufacturer_id)

        # 3. Check duplicate model using Raw SQL
        existing = session.execute(
            text("SELECT id FROM model WHERE model_no = :model_no"), 
            {"model_no": model_no}
        ).first()
        
        if existing:
            print(f"⏭️ Skipping (already exists): {model_no}")
            continue

        # 4. Insert new Model using Raw SQL
        final_group_id = product_group_id or DEFAULT_GROUP_ID
        new_model_result = session.execute(
            text("""
                INSERT INTO model (model_no, description, price, product_group_id) 
                VALUES (:model_no, NULL, 0.00, :group_id) 
                RETURNING id
            """),
            {"model_no": model_no, "group_id": final_group_id}
        ).first()
        new_model_id = new_model_result[0]

        # 5. Insert Stock Ledger Entry using Raw SQL
        if current_stock > 0:
            session.execute(
                text("""
                    INSERT INTO stock_ledger 
                    (model_id, quantity, movement_type, status, reference_type, reference_doc_no, delivery_by, created_at) 
                    VALUES 
                    (:model_id, :qty, 'INWARD', 'STANDARD', 'ADJUSTMENT', :doc_no, 'System Import', :now)
                """),
                {
                    "model_id": new_model_id,
                    "qty": current_stock,
                    "doc_no": f"IMPORT-{model_no}",
                    "now": datetime.utcnow()
                }
            )
            stock_created += 1

        # Commit row block to database safely
        session.commit()
        imported += 1
        print(f"✅ Imported: {model_no} | Stock: {current_stock} | Make: {make_name} | Group: {group_name}")

    except Exception as e:
        errors += 1
        session.rollback()  # Clears transaction state if database hits a duplicate/type error
        print(f"❌ Error on row {index + 1}: {str(e)}")

# ============================================================
# SUMMARY
# ============================================================
print(f"\n{'=' * 60}")
print("📊 IMPORT SUMMARY")
print(f"{'=' * 60}")
print(f"✅ Models imported: {imported}")
print(f"📦 Stock entries created: {stock_created}")
print(f"❌ Errors: {errors}")
print(f"📁 Total rows processed: {len(df)}")
print(f"{'=' * 60}")

session.close()
print("✅ Import complete!")

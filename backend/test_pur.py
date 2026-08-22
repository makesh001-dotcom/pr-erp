import pandas as pd
import re

file_path = "stock-26-27-new-07-07-26 - Copy (3).xlsx"  # Replace with your actual file path
column_name = "Product Name"

# Read sheet without header to locate where data begins
raw_df = pd.read_excel(file_path, header=None)

# Find row containing 'Product Name'
header_row_idx = None
for idx, row in raw_df.iterrows():
    row_values = row.astype(str).str.strip().str.lower().values
    if column_name.lower() in row_values:
        header_row_idx = idx
        break

if header_row_idx is not None:
    df = pd.read_excel(file_path, header=header_row_idx)
    df.columns = df.columns.astype(str).str.strip()
    
    # Drop empty rows in the product name column
    df = df.dropna(subset=[column_name]).copy()

    # REGEX NORMALIZATION:
    # 1. Convert to lower case
    # 2. Strip out hyphens (-), periods (.), underscores (_), and spaces
    df['clean_name'] = (
        df[column_name]
        .astype(str)
        .str.lower()
        .str.replace(r'[\.\-\_\s]+', '', regex=True)
    )

    # Keep all occurrences of names that share the same normalized key
    duplicate_rows = df[df.duplicated(subset=['clean_name'], keep=False)]

    if not duplicate_rows.empty:
        print(f"Header found on row {header_row_idx + 1}!\n")
        print("Duplicate Matches Found (grouped by similarity):\n")
        
        # Group duplicates together to show variations (e.g., Item-A vs Item.A)
        grouped = duplicate_rows.groupby('clean_name')[column_name].unique()
        for clean, variations in grouped.items():
            print(f"Group: {list(variations)}")
    else:
        print("No duplicate product names found.")
else:
    print(f"Could not find '{column_name}' in any row of the sheet.")
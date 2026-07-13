# Import the Base from your session file
from app.db.session import Base 

# Import EVERY model so Base "sees" them
from app.models.users import User
from app.models.manufacturer import Manufacturer
from app.models.product_group import ProductGroup
from app.models.models import Model
from app.models.QuotationCounter import QuotationCounter
from app.models.supplier import Supplier
from app.models.quotation import (
    Quotation,
    QuotationLineItem,
)
from app.models.supplier_counter import SupplierCounter
from app.models.purchase import (
    PurchaseCounter,
    PurchaseInward,
    PurchaseItem,
    PurchaseItemSerial,
)
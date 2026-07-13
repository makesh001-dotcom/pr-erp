from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    auth,
    clients,
    manufacturer,
    product_group,
    models,
    quotation_number,
    quotation,
    supplier,
)

from app.api.routes.purchase import router as purchase_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.sales import router as sales_router
from app.api.routes.demo_tracking import router as demo_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.audit_log import router as audit_router

app = FastAPI(title="Inventory Management API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Base Health Check
@app.get("/")
def home():
    return {"status": "Server is running!", "version": "1.0.0"}

# 3. Routes Registration
# Auth & Clients
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(clients.router, tags=["Clients"])

# The 3-Tier Relational Routes
app.include_router(manufacturer.router,  tags=["Manufacturers"])
app.include_router(product_group.router, tags=["Product Groups"])
app.include_router(models.router, tags=["Models"])
app.include_router(quotation_number.router, prefix="/quotations", tags=["Quotation Utilities"])
app.include_router(inventory_router, prefix="/api/v1/inventory", tags=["Inventory Management"])

app.include_router(quotation.router,tags=["Quotaition"])

app.include_router(
    supplier.router,
    prefix="/api/v1"
)
app.include_router(
    purchase_router,
    prefix="/api/v1",
    tags=["Purchases"]
)

app.include_router(
    sales_router,
    tags=["Sales"]
)

app.include_router(demo_router, prefix="/api/v1", tags=["Demo Tracking"])
app.include_router(analytics_router, prefix="/api/v1", tags=["Analytics"])
app.include_router(audit_router, prefix="/api/v1", tags=["Audit Logs"])
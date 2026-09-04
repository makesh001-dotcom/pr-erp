import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

# FIX: Added admin to your routes import
from app.api.routes import (
    admin,
    auth,
    clients,
    manufacturer,
    models,
    product_group,
    quotation,
    quotation_number,
    supplier,
)
from app.api.routes.analytics import router as analytics_router
from app.api.routes.audit_log import router as audit_router
from app.api.routes.delivery_challan import router as delivery_router
from app.api.routes.demo_tracking import router as demo_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.purchase import router as purchase_router
from app.api.routes.sales import router as sales_router

app = FastAPI(title="Inventory Management API")
print("========================================")
print("🔥🔥🔥 THIS IS MY CURRENT BACKEND 🔥🔥🔥")
print(f"🔥 MAIN FILE: {__file__}")
print("========================================")



origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://192.168.0.110:5173",
    "http://192.168.0.110:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def redirect_to_login():
    return RedirectResponse(url="/login")


# Routes Registration
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

# FIX: Registered Admin Router under /api/v1 (Routes will map to /api/v1/admin/...)
app.include_router(admin.router, prefix="/api/v1")

app.include_router(clients.router, tags=["Clients"])
app.include_router(manufacturer.router, tags=["Manufacturers"])
app.include_router(product_group.router, tags=["Product Groups"])
app.include_router(models.router, tags=["Models"])
app.include_router(
    quotation_number.router,
    prefix="/quotations",
    tags=["Quotation Utilities"],
)
app.include_router(
    inventory_router,
    tags=["Inventory Management"],
)
for route in app.routes:
    print(
        getattr(route, "methods", None),
        getattr(route, "path", None)
    )
app.include_router(quotation.router, tags=["Quotation"])
app.include_router(supplier.router, prefix="/api/v1")
app.include_router(purchase_router, prefix="/api/v1", tags=["Purchases"])
app.include_router(sales_router, tags=["Sales"])
app.include_router(demo_router, prefix="/api/v1", tags=["Demo Tracking"])
app.include_router(analytics_router, prefix="/api/v1", tags=["Analytics"])
app.include_router(audit_router, prefix="/api/v1", tags=["Audit Logs"])
app.include_router(
    delivery_router, prefix="/api/v1", tags=["Delivery Challans"]
)


# Static Files & SPA Catch-all (Keep at bottom)
DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")

if os.path.exists(DIST_DIR):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(DIST_DIR, "assets")),
        name="assets",
    )

    @app.get("/{catchall:path}")
    def serve_frontend(catchall: str):
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
else:
    print(
        f"WARNING: Frontend folder not found at {DIST_DIR}. Run 'npm run build' first."
    )
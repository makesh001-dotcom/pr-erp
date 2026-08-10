"""
Master Permission Registry

This file is the single source of truth for all permissions in the ERP.
The seed script, backend authorization, and frontend can all rely on it.
"""

PERMISSION_REGISTRY = {
    "Clients": [
        "clients.view",
        "clients.create",
        "clients.update",
        "clients.delete",
    ],

    "Suppliers": [
        "suppliers.view",
        "suppliers.create",
        "suppliers.update",
        "suppliers.delete",
    ],

    "Manufacturers": [
        "manufacturers.view",
        "manufacturers.create",
        "manufacturers.update",
        "manufacturers.delete",
    ],

    "Product Groups": [
        "product_groups.view",
        "product_groups.create",
        "product_groups.update",
        "product_groups.delete",
    ],

    "Models": [
        "models.view",
        "models.create",
        "models.update",
        "models.delete",
    ],

    "Purchases": [
        "purchase.view",
        "purchase.create",
        "purchase.update",
        "purchase.delete",
    ],

    "Sales": [
        "sales.view",
        "sales.create",
        "sales.update",
        "sales.delete",
    ],

    "Inventory": [
        "inventory.view",
        "inventory.create",
        "inventory.update",
        "inventory.delete",
        "inventory.adjust",
    ],

    "Quotations": [
        "quotation.view",
        "quotation.create",
        "quotation.update",
        "quotation.delete",
        "quotation.print",
    ],

    "Demo Tracking": [
        "demo.view",
        "demo.create",
        "demo.update",
        "demo.delete",
    ],

    "Analytics": [
        "analytics.view",
    ],

    "Audit Logs": [
        "audit.view",
    ],

    "User Management": [
        "users.view",
        "users.create",
        "users.update",
        "users.delete",
    ],

    "Profile": [
        "profile.change_password",
    ],

    "delivery":[
    "delivery.view",
    "delivery.create",
    "delivery.update",
    "delivery.delete",
    "delivery.print",
    ],
}

STAFF_PERMISSIONS = {
    # Clients
    "clients.view",
    "clients.create",
    "clients.update",
    "clients.delete",

    # Suppliers
    "suppliers.view",
    "suppliers.create",
    "suppliers.update",
    "suppliers.delete",

    # Manufacturers
    "manufacturers.view",
    "manufacturers.create",
    "manufacturers.update",
    "manufacturers.delete",

    # Product Groups
    "product_groups.view",
    "product_groups.create",
    "product_groups.update",
    "product_groups.delete",

    # Models
    "models.view",
    "models.create",
    "models.update",
    "models.delete",

    # Purchases
    "purchase.view",
    "purchase.create",
    "purchase.update",

    # Sales
    "sales.view",
    "sales.create",
    "sales.update",

    # Inventory
    "inventory.view",
    "inventory.create",
    "inventory.update",

    # Quotations
    "quotation.view",
    "quotation.create",
    "quotation.update",

    # Demo
    "demo.view",
    "demo.create",
    "demo.update",

    # Everyone can change their own password
    "profile.change_password",

    "delivery.view",
    "delivery.create",
    "delivery.update",
    "delivery.delete",
    "delivery.print",
}

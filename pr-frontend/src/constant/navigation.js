import {
  PURCHASE_VIEW,
  SALES_VIEW,
  SUPPLIER_VIEW,
  MANUFACTURER_VIEW,
  INVENTORY_VIEW,
  QUOTATION_VIEW,
  DEMO_VIEW,
  ANALYTICS_VIEW,
  AUDIT_VIEW,
  DELIVERY_VIEW,
} from "./permissions";

export const navigation = [
  // Dashboard
  {
    section: "Main",
    label: "Dashboard",
    path: "/dashboard",
    icon: "📊",
    permission: null,
  },

  // Transactions
  {
    section: "Transactions",
    label: "Purchases",
    path: "/purchases",
    icon: "📥",
    permission: PURCHASE_VIEW,
  },
  {
    section: "Transactions",
    label: "Sales",
    path: "/sales",
    icon: "📤",
    permission: SALES_VIEW,
  },
  
  {
    section: "Transactions",
    label: "Demo Tracking",
    path: "/demo-tracking",
    icon: "🔍",
    permission: DEMO_VIEW,
  },
  

  //challans 
{
    section: "Challans",
    label: "Quotations",
    path: "/quotation",
    icon: "🧾",
    permission: QUOTATION_VIEW,
  },
  {
    section: "Challans",
    label: "Delivery Challan",
    path: "/delivery",
    icon: "📤",
    permission: SALES_VIEW,
  },

  // Master
  {
    section: "Master",
    label: "Suppliers",
    path: "/suppliers",
    icon: "🏢",
    permission: SUPPLIER_VIEW,
  },
  {
    section: "Master",
    label: "Manufacturers",
    path: "/manufacturers",
    icon: "🏭",
    permission: MANUFACTURER_VIEW,
  },

  //challans


  // Stock
  {
    section: "Stock",
    label: "Inventory",
    path: "/inventory",
    icon: "🏪",
    permission: INVENTORY_VIEW,
  },
  {
    section: "Stock",
    label: "Model",
    path: "/model",
    icon: "🏪",
    permission: INVENTORY_VIEW,
  },


  // Administration
  {
    section: "Administration",
    label: "Analytics",
    path: "/analytics",
    icon: "📈",
    permission: ANALYTICS_VIEW,
  },
  {
    section: "Administration",
    label: "Audit Logs",
    path: "/AuditLogPage",
    icon: "📝",
    permission: AUDIT_VIEW,
  },
];
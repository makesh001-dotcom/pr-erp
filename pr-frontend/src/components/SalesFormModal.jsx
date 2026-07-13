import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  getSale,
  createSale,
  updateSale,
  postSale,
} from "../api/salesAPI";
import API, { getProductGroups } from "../api/product_group";
import ModelSearchSelect from "./ModelSearchSelect"

// ================================
// CONSTANTS
// ================================
const STATUS_STYLES = {
  DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-300",
  POSTED: "bg-green-100 text-green-800 border-green-300",
  CANCELLED: "bg-red-100 text-red-800 border-red-300",
};

const TYPE_STYLES = {
  NORMAL_SALE: "border-l-4 border-l-blue-500",
  DEMO_TO_CUSTOMER: "border-l-4 border-l-purple-500",
  DEMO_RETURN_TO_SUPPLIER: "border-l-4 border-l-amber-500",
  FREE_OF_COST: "border-l-4 border-l-gray-500",
};

// ================================
// TOAST HELPER
// ================================
const showNotice = (type, message) => {
  if (type === "error") {
    alert(`❌ ${message}`);
  } else if (type === "warning") {
    alert(`⚠ ${message}`);
  } else {
    alert(`✅ ${message}`);
  }
};

// ================================
// CONFIRMATION MODAL
// ================================
function ConfirmModal({ isOpen, title, message, details, onConfirm, onCancel, loading }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">{message}</p>
        {details && (
          <ul className="text-xs text-gray-500 space-y-1 mb-4 bg-gray-50 p-3 rounded-lg">
            {details.map((d, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-green-500">✓</span> {d}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================
// MAIN COMPONENT
// ================================
export default function SalesFormModal({
  isOpen,
  onClose,
  saleId,
  onSaveSuccess,
}) {
  // ================================
  // STATE
  // ================================
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [productGroups, setProductGroups] = useState([]);
  const [selectedProductGroup, setSelectedProductGroup] = useState("");
  const [saleStatus, setSaleStatus] = useState("DRAFT");
  const [isDirty, setIsDirty] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: "" });
  const [modelSearch, setModelSearch] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // Sales Header
  const [formData, setFormData] = useState({
    client_id: "",
    supplier_id: "",
    invoice_no: "",
    invoice_date: "",
    sales_type: "NORMAL_SALE",
    courier_name: "",
    delivered_by: "",
    remarks: "",
  });

  // Sales Items
  const [items, setItems] = useState([]);
   const [selectedModelObject, setSelectedModelObject] = useState(null);
  // Add Item Form
  const [newItem, setNewItem] = useState({
    model_id: "",
    quantity: 1,
    unit_price: 0,
    remarks: "",
    serial_numbers: [],
  });

  // Serial Modal
  const [serialModal, setSerialModal] = useState({
    open: false,
    itemIndex: null,
    tempSerials: [],
    duplicateError: null,
  });

  // Errors
  const [errors, setErrors] = useState({});

  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchSuppliers();
      fetchProductGroups();
      fetchModels();
      if (!saleId) {
        resetForm();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (saleId && isOpen) {
      fetchSale(saleId);
    }
  }, [saleId, isOpen]);

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const res = await API.get("/clients/?limit=200&is_active=true");
      setClients(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to fetch clients", err);
      showNotice("error", "Failed to load clients");
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setSuppliersLoading(true);
      const res = await API.get("/api/v1/suppliers/?limit=200&is_active=true");
      setSuppliers(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
      showNotice("error", "Failed to load suppliers");
    } finally {
      setSuppliersLoading(false);
    }
  };

  const fetchProductGroups = async () => {
    try {
      const res = await getProductGroups();
      const data = res.data;
      if (Array.isArray(data)) {
        setProductGroups(data);
      } else if (data?.data) {
        setProductGroups(data.data);
      } else {
        setProductGroups([]);
      }
    } catch (err) {
      console.error("Failed to fetch product groups", err);
    }
  };

  const fetchModels = async (groupId = "") => {
    try {
      setModelsLoading(true);
      const url = groupId
        ? `/api/v1/inventory/inventory-summary?product_group_id=${groupId}`
        : "/api/v1/inventory/inventory-summary";
      const res = await API.get(url);
      setModels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch models", err);
      showNotice("error", "Failed to load models");
    } finally {
      setModelsLoading(false);
    }
  };

  const fetchSale = async (id) => {
    try {
      setLoading(true);
      const res = await getSale(id);
      const sale = res.data;
      setSaleStatus(sale.status);
      setFormData({
        client_id: sale.client_id || "",
        supplier_id: sale.supplier_id || "",
        invoice_no: sale.invoice_no || "",
        invoice_date: sale.invoice_date?.split("T")[0] || "",
        sales_type: sale.sales_type || "NORMAL_SALE",
        courier_name: sale.courier_name || "",
        delivered_by: sale.delivered_by || "",
        remarks: sale.remarks || "",
      });
      setItems(
        sale.items?.map((item) => ({
          ...item,
          serial_numbers: item.serial_numbers || [],
        })) || []
      );
    } catch (err) {
      console.error("Failed to fetch sale", err);
      showNotice("error", "Failed to load sale");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: "",
      supplier_id: "",
      invoice_no: "",
      invoice_date: "",
      sales_type: "NORMAL_SALE",
      courier_name: "",
      delivered_by: "",
      remarks: "",
    });
    setItems([]);
    setSaleStatus("DRAFT");
    setErrors({});
    setIsDirty(false);
  };

  // ================================
  // HANDLERS
  // ================================
  const markDirty = useCallback(() => {
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  const handleHeaderChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
    markDirty();
  };

  const handleAddItem = () => {
    const newErrors = {};
    if (!newItem.model_id) newErrors.model = "Please select a model";
    if (newItem.quantity < 1) newErrors.quantity = "Quantity must be at least 1";
    if (newItem.unit_price < 0) newErrors.unit_price = "Price cannot be negative";

    if (Object.keys(newErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    let model = selectedModelObject;
    const existingIndex = items.findIndex((item) => item.model_id === modelId);

    if (existingIndex >= 0) {
      const newQty = items[existingIndex].quantity + newItem.quantity;
      handleItemChange(existingIndex, "quantity", newQty);
      showNotice("success", `Merged with existing. New quantity: ${newQty}`);
      setNewItem((prev) => ({ ...prev, quantity: 1, unit_price: 0, remarks: "", serial_numbers: [] }));
      return;
    }

    const modelId = model.id;
    if (!model) {
      setErrors((prev) => ({ ...prev, model: "Model not found" }));
      return;
    }

    setItems((prev) => [
      ...prev,
      {
        model_id: model.id,
        model_no: model.model_no,
        description: model.description || "",
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        total_price: newItem.quantity * newItem.unit_price,
        remarks: newItem.remarks,
        serial_numbers: newItem.serial_numbers,
      },
    ]);

    setNewItem((prev) => ({ ...prev, quantity: 1, unit_price: 0, remarks: "", serial_numbers: [] }));
    setErrors({});
    markDirty();
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    markDirty();
  };

  const handleItemChange = (index, field, value) => {
  setItems((prev) => {
    const updated = [...prev];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      updated[index].total_price = updated[index].quantity * updated[index].unit_price;
    }
    if (field === "quantity") {
      // Clear serials if quantity changes
      updated[index].serial_numbers = [];
    }
    return updated;
  });
  markDirty();
};

 

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === parseInt(formData.client_id)),
    [clients, formData.client_id]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === parseInt(formData.supplier_id)),
    [suppliers, formData.supplier_id]
  );

  // Serial Modal
  const openSerialModal = (itemIndex) => {
    const item = items[itemIndex];
    const existingSerials = item.serial_numbers || [];
    const temp = Array.from({ length: item.quantity }).map(
      (_, i) => existingSerials[i]?.serial_number || ""
    );
    setSerialModal({ open: true, itemIndex, tempSerials: temp, duplicateError: null });
  };

  const handleSerialChange = (index, value) => {
    setSerialModal((prev) => {
      const updated = [...prev.tempSerials];
      updated[index] = value.toUpperCase();
      return { ...prev, tempSerials: updated, duplicateError: null };
    });
  };

  const saveSerials = () => {
    const { itemIndex, tempSerials } = serialModal;
    const nonEmpty = tempSerials.filter((s) => s.trim() !== "");

    const unique = new Set(nonEmpty);
    if (unique.size !== nonEmpty.length) {
      setSerialModal((prev) => ({
        ...prev,
        duplicateError: "Duplicate serial numbers found! Each serial must be unique.",
      }));
      return;
    }

    const allOtherSerials = items.flatMap((item, idx) =>
      idx === itemIndex ? [] : (item.serial_numbers || []).map((s) => s.serial_number)
    );
    const crossDuplicates = nonEmpty.filter((s) => allOtherSerials.includes(s));
    if (crossDuplicates.length > 0) {
      setSerialModal((prev) => ({
        ...prev,
        duplicateError: `Serial(s) already used in another item: ${crossDuplicates.join(", ")}`,
      }));
      return;
    }

    setItems((prev) => {
      const updated = [...prev];
      updated[itemIndex].serial_numbers = nonEmpty.map((s) => ({ serial_number: s }));
      return updated;
    });
    setSerialModal({ open: false, itemIndex: null, tempSerials: [], duplicateError: null });
    markDirty();
  };

  // ================================
  // VALIDATION
  // ================================
  const validateAllSerialsUnique = useCallback(() => {
    const allSerials = items.flatMap((item) =>
      (item.serial_numbers || []).map((s) => s.serial_number)
    );
    const unique = new Set(allSerials);
    if (unique.size !== allSerials.length) {
      const seen = {};
      const duplicates = [];
      allSerials.forEach((s) => {
        if (seen[s]) duplicates.push(s);
        seen[s] = true;
      });
      return [...new Set(duplicates)];
    }
    return [];
  }, [items]);

  const validateForm = () => {
    const errs = {};
    
    // Validate based on sales type
    if (formData.sales_type === "DEMO_RETURN_TO_SUPPLIER") {
      if (!formData.supplier_id) errs.supplier = "Supplier is required for Demo Return";
    } else {
      if (!formData.client_id) errs.client = "Client is required";
    }
    
    if (items.length === 0) errs.items = "At least one product is required";
    
    const duplicateSerials = validateAllSerialsUnique();
    if (duplicateSerials.length > 0) {
      errs.serials = `Duplicate serial numbers across items: ${duplicateSerials.join(", ")}`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ================================
  // CLOSE HANDLER
  // ================================
  const handleClose = () => {
    if (isDirty) {
      setConfirmModal({
        open: true,
        type: "discard",
        title: "Discard unsaved changes?",
        message: "You have unsaved changes. Are you sure you want to close?",
        details: null,
        onConfirm: () => {
          setConfirmModal({ open: false, type: "" });
          setIsDirty(false);
          onClose();
        },
      });
    } else {
      onClose();
    }
  };

  // ================================
  // SUBMISSIONS
  // ================================
  const handleSaveDraft = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = {
        ...formData,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        invoice_date: formData.invoice_date || null,
        items: items.map((item) => ({
          model_id: item.model_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          remarks: item.remarks || null,
          serial_numbers: item.serial_numbers || [],
        })),
      };

      let response;
      if (saleId) {
        response = await updateSale(saleId, payload);
        showNotice("success", "Sale updated successfully");
      } else {
        response = await createSale(payload);
        showNotice("success", "Sale saved as draft");
      }

      setIsDirty(false);
      onSaveSuccess?.(response.data);
      onClose();
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Failed to save sale");
    } finally {
      setSaving(false);
    }
  };

  const handlePostClick = () => {
    const missingSerials = items.filter(
      (item) =>
        item.serial_numbers &&
        item.serial_numbers.length > 0 &&
        item.serial_numbers.length !== item.quantity
    );

    if (missingSerials.length > 0) {
      const names = missingSerials.map((m) => m.model_no).join(", ");
      showNotice("error", `Serial count mismatch for: ${names}`);
      return;
    }

    const duplicateSerials = validateAllSerialsUnique();
    if (duplicateSerials.length > 0) {
      showNotice("error", `Duplicate serial numbers: ${duplicateSerials.join(", ")}`);
      return;
    }

    setConfirmModal({
      open: true,
      type: "post",
      title: "Post Sale?",
      message: "This action cannot be undone.",
      details: [
        "Reduce stock from inventory",
        "Create stock ledger entries",
        "Update serial number status",
        "Sale becomes immutable",
      ],
      onConfirm: handlePostSale,
    });
  };

  const handlePostSale = async () => {
    if (!saleId) {
      showNotice("error", "Please save as draft first");
      setConfirmModal({ open: false, type: "" });
      return;
    }

    try {
      setPosting(true);
      const response = await postSale(saleId);
      showNotice("success", "Sale posted successfully! Stock updated.");
      setIsDirty(false);
      onSaveSuccess?.(response.data);
      setConfirmModal({ open: false, type: "" });
      onClose();
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Failed to post sale");
      setConfirmModal({ open: false, type: "" });
    } finally {
      setPosting(false);
    }
  };

  // ================================
  // COMPUTED VALUES
  // ================================
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.total_price || 0), 0), [items]);
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + (item.quantity || 0), 0), [items]);
  const totalSerials = useMemo(() => items.reduce((sum, item) => sum + (item.serial_numbers?.length || 0), 0), [items]);
  const serialManaged = items.filter((i) => i.serial_numbers?.length > 0).length;
  const allSerialsDone = totalSerials === totalQuantity && totalQuantity > 0;

  const isFreeOfCost = formData.sales_type === "FREE_OF_COST";
  const isEditable = saleStatus === "DRAFT";
  const isProcessing = saving || posting;
  // Replace the existing filteredModels useEffect:
const filteredModels = useMemo(() => {
    if (!modelSearch.trim()) return models.slice(0, 50); // Show first 50 when no search
    const query = modelSearch.toLowerCase();
    return models.filter(m => 
        m.model_no?.toLowerCase().includes(query) ||
        m.sku?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
    ).slice(0, 50); // Limit to 50 results
}, [models, modelSearch]);


const modelDropdownRef = useRef(null);

useEffect(() => {
    const handleClickOutside = (e) => {
        if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
            setShowModelDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


const handleModelSelect = (modelId) => {
  const model = models.find((m) => m.id === parseInt(modelId));
  if (model) {
    setNewItem((prev) => ({
      ...prev,
      model_id: modelId,
      unit_price: model?.price || prev.unit_price,
    }));
    setModelSearch(model.model_no); // Show the selected model name
    setErrors((prev) => ({ ...prev, model: null }));
    setShowModelDropdown(false);
  }
};
  // ================================
  // RENDER
  // ================================
  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sale...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex justify-center items-start overflow-y-auto z-50 p-6">
        <div className={`bg-white rounded-xl shadow-xl w-full max-w-7xl ${TYPE_STYLES[formData.sales_type] || ""}`}>
          {/* Header */}
          <div className="flex justify-between items-center border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                {saleId ? "Edit Sale" : "New Sale"}
              </h2>
              {saleId && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[saleStatus] || ""}`}>
                  {saleStatus}
                </span>
              )}
              {isFreeOfCost && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">
                  FREE OF COST
                </span>
              )}
              {isDirty && (
                <span className="text-xs text-amber-600 font-medium">● Unsaved changes</span>
              )}
            </div>
            <button onClick={handleClose} disabled={isProcessing} className="text-gray-500 hover:text-red-600 text-xl font-bold disabled:opacity-50">
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Sale Details */}
            <div className={`border rounded-lg p-5 ${isFreeOfCost ? "bg-gray-50/30 border-gray-300" : ""}`}>
              <h3 className="font-semibold text-lg mb-4">
                Sale Information
                {isFreeOfCost && <span className="text-gray-600 text-sm ml-2">⚠ Free of Cost - No billing</span>}
              </h3>

              {/* Grid for all fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Client - Shown for Normal Sale, Demo to Customer, FOC */}
                {(formData.sales_type === "NORMAL_SALE" || 
                  formData.sales_type === "DEMO_TO_CUSTOMER" || 
                  formData.sales_type === "FREE_OF_COST") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => handleHeaderChange("client_id", e.target.value)}
                      className={`w-full border rounded p-2 ${errors.client ? "border-red-500" : ""}`}
                      disabled={!isEditable || isProcessing}
                    >
                      <option value="">{clientsLoading ? "Loading..." : "Select Client"}</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                    {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}
                  </div>
                )}

                {/* Supplier - Shown for Demo Return to Supplier */}
                {formData.sales_type === "DEMO_RETURN_TO_SUPPLIER" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.supplier_id}
                      onChange={(e) => handleHeaderChange("supplier_id", e.target.value)}
                      className={`w-full border rounded p-2 ${errors.supplier ? "border-red-500" : ""}`}
                      disabled={!isEditable || isProcessing}
                    >
                      <option value="">{suppliersLoading ? "Loading..." : "Select Supplier"}</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.company_name}</option>
                      ))}
                    </select>
                    {errors.supplier && <p className="text-red-500 text-xs mt-1">{errors.supplier}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Sales Type</label>
                  <select
                    value={formData.sales_type}
                    onChange={(e) => handleHeaderChange("sales_type", e.target.value)}
                    className="w-full border rounded p-2"
                    disabled={!isEditable || isProcessing}
                  >
                    <option value="NORMAL_SALE">🔵 Normal Sale</option>
                    <option value="DEMO_TO_CUSTOMER">🟣 Demo to Customer</option>
                    <option value="DEMO_RETURN_TO_SUPPLIER">🟡 Demo Return to Supplier</option>
                    <option value="FREE_OF_COST">⬜ Free of Cost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Invoice No</label>
                  <input
                    value={formData.invoice_no}
                    onChange={(e) => handleHeaderChange("invoice_no", e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="Invoice Number"
                    disabled={!isEditable || isProcessing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleHeaderChange("invoice_date", e.target.value)}
                    className="w-full border rounded p-2"
                    disabled={!isEditable || isProcessing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Courier</label>
                  <input
                    value={formData.courier_name}
                    onChange={(e) => handleHeaderChange("courier_name", e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="Courier"
                    disabled={!isEditable || isProcessing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Delivered By</label>
                  <input
                    value={formData.delivered_by}
                    onChange={(e) => handleHeaderChange("delivered_by", e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="Delivered By"
                    disabled={!isEditable || isProcessing}
                  />
                </div>
              </div> {/* End of grid */}

              {/* Remarks - outside the grid, full width */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => handleHeaderChange("remarks", e.target.value)}
                  className="w-full border rounded p-2"
                  disabled={!isEditable || isProcessing}
                />
              </div>

              {errors.serials && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">
                  ⚠ {errors.serials}
                </div>
              )}
            </div>

            

{/* Add Product */}
{isEditable && (
  <div className="border rounded-lg p-5">
    <div className="grid grid-cols-12 gap-3 items-end">
      {/* Model Search */}
      <div className="col-span-6 relative" ref={modelDropdownRef}>
        <label className="block text-xs font-medium mb-1">Model *</label>
        <ModelSearchSelect
                  value={newItem.model_id}
                  onChange={(modelId, model) => {
                    setNewItem(prev => ({
                      ...prev,
                      model_id: modelId,
                      unit_price: model?.price || prev.unit_price,
                    }));
                    setSelectedModelObject(model);  // ⭐ ADD THIS
                    setErrors(prev => ({ ...prev, model: null }));
                  }}
                  productGroupId={selectedProductGroup || undefined}
                  disabled={isProcessing}
                  error={errors.model}
                  placeholder="Search model by name or SKU..."
                />
        
         
        
        </div>

      {/* Quantity */}
      <div className="col-span-2">
        <label className="block text-xs font-medium mb-1">Qty</label>
        <input
          type="number"
          min="1"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
          className="w-full border rounded p-2 text-sm"
          disabled={isProcessing}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddItem(); } }}
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-2">
        <label className="block text-xs font-medium mb-1">Unit Price</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={newItem.unit_price}
          onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
          className="w-full border rounded p-2 text-sm"
          disabled={isProcessing || isFreeOfCost}
        />
      </div>

      {/* Add Button */}
      <div className="col-span-2">
        <button
          onClick={handleAddItem}
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          + Add
        </button>
      </div>
    </div>
  </div>
)}

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left">Model</th>
                    <th className="border p-2 text-left">Description</th>
                    <th className="border p-2 text-center w-20">Qty</th>
                    <th className="border p-2 text-right w-28">Unit Price</th>
                    <th className="border p-2 text-right w-28">Total</th>
                    <th className="border p-2 text-center w-32">Serials</th>
                    <th className="border p-2 text-left">Remarks</th>
                    {isEditable && <th className="border p-2 text-center w-16">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={isEditable ? 8 : 7} className="text-center py-8 text-gray-500">
                        No Products Added
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const serialCount = item.serial_numbers?.length || 0;
                      const isSerialComplete = serialCount === item.quantity;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border p-2 font-medium">{item.model_no}</td>
                          <td className="border p-2 text-gray-600 text-xs">{item.description}</td>
                          <td className="border p-2 text-center">
                            {isEditable ? (
                              <input
                                type="number" min="1"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                                className="w-16 text-center border rounded p-1"
                                disabled={isProcessing}
                              />
                            ) : item.quantity}
                          </td>
                          <td className="border p-2">
                            {isEditable && !isFreeOfCost ? (
                              <input
                                type="number" min="0" step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                                className="w-24 text-right border rounded p-1"
                                disabled={isProcessing}
                              />
                            ) : (
                              <span className="block text-right">{isFreeOfCost ? "FOC" : `₹${item.unit_price?.toFixed(2)}`}</span>
                            )}
                          </td>
                          <td className="border p-2 text-right font-medium">
                            {isFreeOfCost ? "—" : `₹${item.total_price?.toFixed(2)}`}
                          </td>
                          <td className="border p-2 text-center">
                            {isEditable ? (
                              <button
                                onClick={() => openSerialModal(index)}
                                disabled={isProcessing}
                                className={`px-2 py-1 rounded text-xs font-bold transition disabled:opacity-50 ${
                                  isSerialComplete ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                }`}
                              >
                                {serialCount}/{item.quantity}
                              </button>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${isSerialComplete ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                                {serialCount}/{item.quantity}
                              </span>
                            )}
                          </td>
                          <td className="border p-2">
                            {isEditable ? (
                              <input
                                value={item.remarks || ""}
                                onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                                className="w-full border rounded p-1 text-xs"
                                disabled={isProcessing}
                              />
                            ) : (
                              <span className="text-xs text-gray-500">{item.remarks || "-"}</span>
                            )}
                          </td>
                          {isEditable && (
                            <td className="border p-2 text-center">
                              <button onClick={() => handleRemoveItem(index)} disabled={isProcessing} className="text-red-500 hover:text-red-700 font-bold disabled:opacity-50">✕</button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary + Totals */}
            <div className="flex justify-between items-start gap-4">
              <div className="border rounded-lg p-4 flex-1 max-w-md">
                <h4 className="font-semibold text-sm mb-3">Sale Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-500">Products</div>
                  <div className="font-bold text-right">{items.length}</div>
                  <div className="text-gray-500">Total Quantity</div>
                  <div className="font-bold text-right">{totalQuantity}</div>
                  <div className="text-gray-500">Serial Managed</div>
                  <div className="font-bold text-right">{serialManaged}</div>
                  <div className="text-gray-500">Serials Captured</div>
                  <div className={`font-bold text-right ${allSerialsDone ? "text-green-600" : "text-amber-600"}`}>
                    {totalSerials}/{totalQuantity}
                    {allSerialsDone && totalQuantity > 0 && <span className="ml-1">✅</span>}
                  </div>
                  <div className="text-gray-500">Type</div>
                  <div className="font-bold text-right">{formData.sales_type?.replace(/_/g, " ")}</div>
                  {selectedClient && (
                    <>
                      <div className="text-gray-500">Client</div>
                      <div className="font-bold text-right truncate">{selectedClient.company_name || selectedClient.name}</div>
                    </>
                  )}
                  {selectedSupplier && (
                    <>
                      <div className="text-gray-500">Supplier</div>
                      <div className="font-bold text-right truncate">{selectedSupplier.company_name}</div>
                    </>
                  )}
                </div>
                {allSerialsDone && totalQuantity > 0 && isEditable && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700 font-medium text-center">
                    ✅ Ready to Post
                  </div>
                )}
              </div>

              <div className="w-80 border rounded-lg p-4">
                <div className="flex justify-between mb-2 text-sm">
                  <span>Subtotal</span>
                  <span>{isFreeOfCost ? "FOC" : `₹${subtotal.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between mb-2 text-sm text-gray-400">
                  <span>Tax</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span>{isFreeOfCost ? "FOC" : `₹${subtotal.toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <button onClick={handleClose} disabled={isProcessing} className="px-5 py-2 rounded border text-sm hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            {isEditable && (
              <button onClick={handleSaveDraft} disabled={isProcessing} className="px-5 py-2 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-700 disabled:opacity-50 transition">
                {saving ? "Saving..." : "Save Draft"}
              </button>
            )}
            {saleId && saleStatus === "DRAFT" && (
              <button onClick={handlePostClick} disabled={isProcessing} className="px-5 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 transition">
                {posting ? "Posting..." : "Post Sale"}
              </button>
            )}
          </div>
        </div>

        {/* Serial Number Modal */}
        {serialModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-lg mb-1">Enter Serial Numbers</h3>
              <div className="text-xs text-gray-500 mb-1">
                Model: <span className="font-bold text-gray-700">{items[serialModal.itemIndex]?.model_no}</span>
                {" | "}Required: <span className="font-bold">{items[serialModal.itemIndex]?.quantity}</span>
                {" | "}Entered: <span className="font-bold text-blue-600">{serialModal.tempSerials.filter((s) => s.trim() !== "").length}</span>
                /{items[serialModal.itemIndex]?.quantity}
              </div>
              <p className="text-xs text-gray-400 mb-4">Scan barcode or type manually. Press Enter to jump to next slot.</p>

              {serialModal.duplicateError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs mb-3">⚠ {serialModal.duplicateError}</div>
              )}

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {serialModal.tempSerials.map((serial, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-10 text-right">#{i + 1}</span>
                    <input
                      value={serial}
                      onChange={(e) => handleSerialChange(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const next = document.querySelector(`[data-serial-index="${i + 1}"]`);
                          if (next) next.focus();
                          else saveSerials();
                        }
                      }}
                      data-serial-index={i}
                      placeholder="Scan or type serial..."
                      className="flex-1 border rounded p-2 text-sm uppercase font-mono"
                      autoFocus={i === 0}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setSerialModal({ open: false, itemIndex: null, tempSerials: [], duplicateError: null })} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={saveSerials} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save Serials</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false, type: "" })}
        loading={posting}
      />
    </>
  );
}
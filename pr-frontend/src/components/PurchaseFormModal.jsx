import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  getPurchase,
  createPurchase,
  updatePurchase,
  postPurchase,
} from "../api/purchaseAPI";
import API, { getProductGroups } from "../api/product_group";
import {
  getClients,
  createClient,
  updateClient,
  deactivateClient,
  reactivateClient,
} from "../api/client";
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
  NORMAL_PURCHASE: "border-l-4 border-l-green-500",
  DEMO_FROM_SUPPLIER: "border-l-4 border-l-amber-500",
  DEMO_RETURN_FROM_CUSTOMER: "border-l-4 border-l-blue-500",
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
      <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">{message}</p>
        {details && (
          <ul className="text-xs text-muted-foreground space-y-1 mb-4 bg-muted p-3 rounded-lg">
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
            className="px-4 py-2 border rounded text-sm hover:bg-muted disabled:opacity-50"
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
export default function PurchaseFormModal({
  isOpen,
  onClose,
  purchaseId,
  onSaveSuccess,
}) {
  // ================================
  // STATE
  // ================================
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [productGroups, setProductGroups] = useState([]);
  const [selectedProductGroup, setSelectedProductGroup] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState("DRAFT");
  const [isDirty, setIsDirty] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, type: "" });
  
  // Client state
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef(null);
  const [modelSearch, setModelSearch] = useState("");
  // Purchase Header
  const [formData, setFormData] = useState({
    supplier_id: "",
    client_id: "",
    supplier_invoice_no: "",
    supplier_invoice_date: "",
    purchase_type: "NORMAL_PURCHASE",
    payment_status: "UNPAID",
    courier_name: "",
    delivered_by: "",
    remarks: "",
    expected_return_date: "",
  });

  // Purchase Items
  const [items, setItems] = useState([]);

  // Add Item Form
  const [newItem, setNewItem] = useState({
    model_id: "",
    quantity: 1,
    unit_cost: 0,
    remarks: "",
    return_due_date: "",
    serial_numbers: [],
  });
  const [selectedModelObject, setSelectedModelObject] = useState(null);
  // Serial Modal
  const [serialModal, setSerialModal] = useState({
    open: false,
    itemIndex: null,
    tempSerials: [],
    duplicateError: null,
  });

  // Errors
  const [errors, setErrors] = useState({});

  // Refs
  const supplierSelectRef = useRef(null);
  
  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchSuppliers();
      fetchProductGroups();
      fetchModels();
      if (!purchaseId) {
        resetForm();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (purchaseId && isOpen) {
      fetchPurchase(purchaseId);
    }
  }, [purchaseId, isOpen]);

  // Sync clientSearch with selected client
  useEffect(() => {
    if (formData.client_id && clients.length > 0) {
      const selected = clients.find(c => c.id === parseInt(formData.client_id));
      if (selected) {
        setClientSearch(selected.company_name || selected.name || "");
      }
    } else if (!formData.client_id && !document.activeElement?.closest('.client-search-container')) {
      setClientSearch("");
    }
  }, [formData.client_id, clients]);

  // Click outside handler for client dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuppliers = async () => {
    try {
      setSuppliersLoading(true);
      const res = await API.get("/api/v1/suppliers/?limit=200&is_active=true");
      setSuppliers(res.data?.data || []);
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

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const res = await API.get("/clients/?limit=100&is_active=true");
      let clientData = res.data?.data || res.data || [];
      if (!Array.isArray(clientData)) {
        clientData = [];
      }
      setClients(clientData);
    } catch (err) {
      console.error("Failed to fetch clients", err);
      showNotice("error", "Failed to load clients");
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchPurchase = async (id) => {
    try {
      setLoading(true);
      const res = await getPurchase(id);
      const purchase = res.data;
      setPurchaseStatus(purchase.status);
      setFormData({
        supplier_id: purchase.supplier_id || "",
        client_id: purchase.client_id || "",
        supplier_invoice_no: purchase.supplier_invoice_no || "",
        supplier_invoice_date: purchase.supplier_invoice_date?.split("T")[0] || "",
        purchase_type: purchase.purchase_type || "NORMAL_PURCHASE",
        payment_status: purchase.payment_status || "UNPAID",
        courier_name: purchase.courier_name || "",
        delivered_by: purchase.delivered_by || "",
        remarks: purchase.remarks || "",
        expected_return_date: purchase.expected_return_date?.split("T")[0] || "",
      });
      setItems(
        purchase.items?.map((item) => ({
          ...item,
          serial_numbers: item.serial_numbers || [],
        })) || []
      );
    } catch (err) {
      console.error("Failed to fetch purchase", err);
      showNotice("error", "Failed to load purchase");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      client_id: "",
      supplier_invoice_no: "",
      supplier_invoice_date: "",
      purchase_type: "NORMAL_PURCHASE",
      payment_status: "UNPAID",
      courier_name: "",
      delivered_by: "",
      remarks: "",
      expected_return_date: "",
    });
    setItems([]);
    setPurchaseStatus("DRAFT");
    setErrors({});
    setIsDirty(false);
    setClientSearch("");
  };

  // ================================
  // HANDLERS
  // ================================
  const markDirty = useCallback(() => {
    if (!isDirty) setIsDirty(true);
  }, [isDirty]);

  const handleHeaderChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "purchase_type" && value !== "DEMO_FROM_SUPPLIER") {
        updated.expected_return_date = "";
      }
      
      return updated;
    });
    
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

    // Get model - try selectedModelObject first, then search models array
    let model = selectedModelObject;
    if (!model) {
        model = models.find((m) => m.id === parseInt(newItem.model_id));
    }

    if (!model) {
        setErrors((prev) => ({ ...prev, model: "Model not found. Please reselect." }));
        return;
    }

    const modelId = model.id;

    // Check if item already exists
    const existingIndex = items.findIndex((item) => item.model_id === modelId);

    if (existingIndex >= 0) {
        const newQty = items[existingIndex].quantity + newItem.quantity;
        handleItemChange(existingIndex, "quantity", newQty);
        showNotice("success", `Merged with existing. New quantity: ${newQty}`);
        setNewItem((prev) => ({
            ...prev,
            quantity: 1,
            unit_cost: 0,
            remarks: "",
            serial_numbers: [],
        }));
        setSelectedModelObject(null);  // ⭐ Reset
        return;
    }

    // Add new item
    setItems((prev) => [
        ...prev,
        {
            model_id: model.id,
            model_no: model.model_no,
            description: model.description || "",
            quantity: newItem.quantity,
            unit_cost: newItem.unit_cost,
            total_cost: newItem.quantity * newItem.unit_cost,
            remarks: newItem.remarks,
            return_due_date: newItem.return_due_date,
            serial_numbers: newItem.serial_numbers || [],
        },
    ]);

    // Reset form
    setNewItem((prev) => ({
        ...prev,
        quantity: 1,
        unit_cost: 0,
        remarks: "",
        serial_numbers: [],
    }));
    setSelectedModelObject(null);  // ⭐ Reset
    setModelSearch("");            // ⭐ Clear search input
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
      if (field === "quantity" || field === "unit_cost") {
        updated[index].total_cost = updated[index].quantity * updated[index].unit_cost;
      }
      if (field === "quantity") {
        updated[index].serial_numbers = [];
      }
      return updated;
    });
    markDirty();
  };

  const handleModelSelect = (modelId) => {
    const model = models.find((m) => m.id === parseInt(modelId));
    setNewItem((prev) => ({
      ...prev,
      model_id: modelId,
      unit_cost: model?.price || prev.unit_cost,
    }));
    setErrors((prev) => ({ ...prev, model: null }));
  };

  // Computed values
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === parseInt(formData.supplier_id)),
    [suppliers, formData.supplier_id]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === parseInt(formData.client_id)),
    [clients, formData.client_id]
  );

  // Filter clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const searchTerm = clientSearch.toLowerCase().trim();
    return clients.filter(c => {
      const name = (c.company_name || c.name || "").toLowerCase();
      return name.includes(searchTerm);
    });
  }, [clients, clientSearch]);

  // Serial Modal
  const openSerialModal = (itemIndex) => {
    const item = items[itemIndex];
    const existingSerials = item.serial_numbers || [];
    const temp = Array.from({ length: item.quantity }).map(
      (_, i) => existingSerials[i]?.serial_number || ""
    );
    setSerialModal({
      open: true,
      itemIndex,
      tempSerials: temp,
      duplicateError: null,
    });
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
      idx === itemIndex
        ? []
        : (item.serial_numbers || []).map((s) => s.serial_number)
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
      updated[itemIndex].serial_numbers = nonEmpty.map((s) => ({
        serial_number: s,
      }));
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

    if (!formData.supplier_id) errs.supplier = "Supplier is required";
    if (items.length === 0) errs.items = "At least one product is required";
    if (formData.purchase_type === "DEMO_FROM_SUPPLIER" && !formData.expected_return_date) {
      errs.expected_return_date = "Return date is required for demo purchases";
    }

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
        supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        expected_return_date: formData.expected_return_date || null,
        supplier_invoice_date: formData.supplier_invoice_date || null,
        items: items.map((item) => ({
          model_id: item.model_id,
          model_no: item.model_no,
          description: item.description,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          remarks: item.remarks || null,
          return_due_date: item.return_due_date || null,
          serial_numbers: item.serial_numbers || [],
        })),
      };

      let response;
      if (purchaseId) {
        response = await updatePurchase(purchaseId, payload);
        showNotice("success", "Purchase updated successfully");
      } else {
        response = await createPurchase(payload);
        showNotice("success", "Purchase saved as draft");
      }

      setIsDirty(false);
      onSaveSuccess?.(response.data);
      onClose();
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Failed to save purchase");
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
      showNotice(
        "error",
        `Serial count mismatch for: ${names}. Please enter exactly the required number of serials before posting.`
      );
      return;
    }

    const duplicateSerials = validateAllSerialsUnique();
    if (duplicateSerials.length > 0) {
      showNotice(
        "error",
        `Duplicate serial numbers found across items: ${duplicateSerials.join(", ")}`
      );
      return;
    }

    setConfirmModal({
      open: true,
      type: "post",
      title: "Post Purchase?",
      message: "This action cannot be undone.",
      details: [
        "Add stock to inventory",
        "Create stock ledger entries",
        "Activate serial numbers",
        "Purchase becomes immutable",
      ],
      onConfirm: handlePostPurchase,
    });
  };

  const handlePostPurchase = async () => {
    if (!purchaseId) {
      showNotice("error", "Please save as draft first");
      setConfirmModal({ open: false, type: "" });
      return;
    }

    try {
      setPosting(true);
      const response = await postPurchase(purchaseId);
      showNotice("success", "Purchase posted successfully! Stock updated.");
      setIsDirty(false);
      onSaveSuccess?.(response.data);
      setConfirmModal({ open: false, type: "" });
      onClose();
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Failed to post purchase");
      setConfirmModal({ open: false, type: "" });
    } finally {
      setPosting(false);
    }
  };

  // ================================
  // COMPUTED VALUES
  // ================================
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.total_cost || 0), 0),
    [items]
  );
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [items]
  );
  const totalSerials = useMemo(
    () => items.reduce((sum, item) => sum + (item.serial_numbers?.length || 0), 0),
    [items]
  );
  const serialManaged = items.filter((i) => i.serial_numbers?.length > 0).length;
  const allSerialsDone = totalSerials === totalQuantity && totalQuantity > 0;

  const isDemoPurchase = formData.purchase_type === "DEMO_FROM_SUPPLIER";
  const isEditable = purchaseStatus === "DRAFT";
  const isProcessing = saving || posting;

  // ================================
  // RENDER
  // ================================
  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-card p-8 rounded-xl shadow-xl text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchase...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex justify-center items-start overflow-y-auto z-50 p-6">
        <div
          className={`bg-card rounded-xl shadow-xl w-full max-w-7xl ${
            TYPE_STYLES[formData.purchase_type] || ""
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-center border-b px-6 py-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                {purchaseId ? "Edit Purchase" : "New Purchase"}
              </h2>
              {purchaseId && (
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    STATUS_STYLES[purchaseStatus] || ""
                  }`}
                >
                  {purchaseStatus}
                </span>
              )}
              {isDemoPurchase && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  DEMO UNIT
                </span>
              )}
              {isDirty && (
                <span className="text-xs text-amber-600 font-medium">● Unsaved changes</span>
              )}
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-red-600 text-xl font-bold disabled:opacity-50"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Purchase Details */}
            <div
              className={`border rounded-lg p-5 ${
                isDemoPurchase ? "bg-amber-50/30 border-amber-200" : ""
              }`}
            >
              <h3 className="font-semibold text-lg mb-4">
                Purchase Information
                {isDemoPurchase && (
                  <span className="text-amber-600 text-sm ml-2">⚠ Demo - Return Date Required</span>
                )}
              </h3>

              {/* Grid for all fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier - Shown for Normal Purchase & Demo from Supplier */}
                {(formData.purchase_type === "NORMAL_PURCHASE" || 
                  formData.purchase_type === "DEMO_FROM") && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={supplierSelectRef}
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

                {/* Client - Shown for Demo from Supplier & Demo Return from Customer */}
                {(formData.purchase_type === "DEMO_FROM_SUPPLIER" || 
                  formData.purchase_type === "DEMO_RETURN_FROM_CUSTOMER") && (
                  <div className="client-search-container" ref={clientDropdownRef}>
                    <label className="block text-sm font-medium mb-1">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                          if (e.target.value === "") {
                            handleHeaderChange("client_id", "");
                          }
                        }}
                        onFocus={() => {
                          setShowClientDropdown(true);
                          if (!clientSearch && formData.client_id) {
                            const selected = clients.find(c => c.id === parseInt(formData.client_id));
                            if (selected) {
                              setClientSearch(selected.company_name || selected.name || "");
                            }
                          }
                        }}
                        placeholder="Type to search client..."
                        className={`w-full border rounded p-2 ${errors.client ? "border-red-500" : ""}`}
                        disabled={!isEditable || isProcessing}
                      />
                      
                      {showClientDropdown && filteredClients.length > 0 && (
                        <div className="absolute z-50 w-full bg-card border rounded-xl shadow-lg max-h-40 overflow-y-auto mt-1">
                          {clientsLoading ? (
                            <div className="px-3 py-2 text-muted-foreground text-sm">Loading clients...</div>
                          ) : (
                            filteredClients.map((c) => (
                              <div
                                key={c.id}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleHeaderChange("client_id", c.id);
                                  setClientSearch(c.company_name || c.name || "");
                                  setShowClientDropdown(false);
                                }}
                              >
                                <span>{c.company_name || c.name}</span>
                                {c.gstin && (
                                  <span className="text-xs text-gray-400">GST: {c.gstin}</span>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      
                      {showClientDropdown && clientSearch && filteredClients.length === 0 && !clientsLoading && (
                        <div className="absolute z-50 w-full bg-card border rounded-xl shadow-lg mt-1 p-3 text-sm text-gray-400 text-center">
                          No clients found
                        </div>
                      )}
                    </div>
                    {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}
                  </div>
                )}

                {/* Supplier GST/State - Only when supplier selected */}
                {selectedSupplier && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-400">GSTIN</label>
                      <input 
                        value={selectedSupplier.gstin || "N/A"} 
                        className="w-full border rounded p-2 bg-muted text-gray-600" 
                        disabled 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-400">State</label>
                      <input 
                        value={selectedSupplier.state || "N/A"} 
                        className="w-full border rounded p-2 bg-muted text-gray-600" 
                        disabled 
                      />
                    </div>
                  </>
                )}

                {/* Client GST/State - Only when client selected */}
                {selectedClient && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-400">Client GSTIN</label>
                      <input 
                        value={selectedClient.gstin || "N/A"} 
                        className="w-full border rounded p-2 bg-muted text-gray-600" 
                        disabled 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-400">Client State</label>
                      <input 
                        value={selectedClient.state || "N/A"} 
                        className="w-full border rounded p-2 bg-muted text-gray-600" 
                        disabled 
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Type</label>
                  <select
                    value={formData.purchase_type}
                    onChange={(e) => handleHeaderChange("purchase_type", e.target.value)}
                    className="w-full border rounded p-2"
                    disabled={!isEditable || isProcessing}
                  >
                    <option value="NORMAL_PURCHASE">🟢 Normal Purchase</option>
                    <option value="DEMO_FROM_SUPPLIER">🟡 Demo from Supplier</option>
                    <option value="DEMO_RETURN_FROM_CUSTOMER">🔵 Demo Return from Customer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Supplier Invoice No</label>
                  <input
                    value={formData.supplier_invoice_no}
                    onChange={(e) => handleHeaderChange("supplier_invoice_no", e.target.value)}
                    className="w-full border rounded p-2"
                    placeholder="Invoice Number"
                    disabled={!isEditable || isProcessing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={formData.supplier_invoice_date}
                    onChange={(e) => handleHeaderChange("supplier_invoice_date", e.target.value)}
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

                {isDemoPurchase && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Expected Return Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expected_return_date}
                      onChange={(e) => handleHeaderChange("expected_return_date", e.target.value)}
                      className={`w-full border rounded p-2 bg-amber-50 ${
                        errors.expected_return_date ? "border-red-500" : ""
                      }`}
                      disabled={!isEditable || isProcessing}
                    />
                    {errors.expected_return_date && (
                      <p className="text-red-500 text-xs mt-1">{errors.expected_return_date}</p>
                    )}
                  </div>
                )}
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
    <h3 className="font-semibold text-lg mb-4">Add Product</h3>
    <div className="grid grid-cols-5 gap-3 items-end">
      
      {/* Model Search */}
      <div className="col-span-2">
        <label className="block text-xs font-medium mb-1">
          Model <span className="text-red-500">*</span>
        </label>
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
      <div>
        <label className="block text-xs font-medium mb-1">Qty</label>
        <input
          type="number"
          min="1"
          value={newItem.quantity}
          onChange={(e) =>
            setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })
          }
          className="w-full border rounded p-2 text-sm"
          disabled={isProcessing}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddItem();
            }
          }}
        />
      </div>

      {/* Unit Cost */}
      <div>
        <label className="block text-xs font-medium mb-1">Unit Cost</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={newItem.unit_cost}
          onChange={(e) =>
            setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })
          }
          className="w-full border rounded p-2 text-sm"
          disabled={isProcessing}
        />
      </div>

      {/* Add Button */}
      <div>
        <button
          onClick={handleAddItem}
          disabled={isProcessing}
          className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          + Add Product
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
                    <th className="border p-2 text-right w-28">Unit Cost</th>
                    <th className="border p-2 text-right w-28">Total</th>
                    <th className="border p-2 text-center w-32">Serials</th>
                    <th className="border p-2 text-left">Remarks</th>
                    {isEditable && <th className="border p-2 text-center w-16">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={isEditable ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        No Products Added
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const serialCount = item.serial_numbers?.length || 0;
                      const isSerialComplete = serialCount === item.quantity;
                      return (
                        <tr key={index} className="hover:bg-muted">
                          <td className="border p-2 font-medium">{item.model_no}</td>
                          <td className="border p-2 text-gray-600 text-xs">{item.description}</td>
                          <td className="border p-2 text-center">
                            {isEditable ? (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(index, "quantity", parseInt(e.target.value) || 1)
                                }
                                className="w-16 text-center border rounded p-1"
                                disabled={isProcessing}
                              />
                            ) : (
                              item.quantity
                            )}
                          </td>
                          <td className="border p-2">
                            {isEditable ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) =>
                                  handleItemChange(index, "unit_cost", parseFloat(e.target.value) || 0)
                                }
                                className="w-24 text-right border rounded p-1"
                                disabled={isProcessing}
                              />
                            ) : (
                              <span className="block text-right">₹{item.unit_cost?.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="border p-2 text-right font-medium">
                            ₹{item.total_cost?.toFixed(2)}
                          </td>
                          <td className="border p-2 text-center">
                            {isEditable ? (
                              <button
                                onClick={() => openSerialModal(index)}
                                disabled={isProcessing}
                                className={`px-2 py-1 rounded text-xs font-bold transition disabled:opacity-50 ${
                                  isSerialComplete
                                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                }`}
                              >
                                {serialCount}/{item.quantity}
                              </button>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  isSerialComplete
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
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
                              <span className="text-xs text-muted-foreground">{item.remarks || "-"}</span>
                            )}
                          </td>
                          {isEditable && (
                            <td className="border p-2 text-center">
                              <button
                                onClick={() => handleRemoveItem(index)}
                                disabled={isProcessing}
                                className="text-red-500 hover:text-red-700 font-bold disabled:opacity-50"
                              >
                                ✕
                              </button>
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
                <h4 className="font-semibold text-sm mb-3">Purchase Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Products</div>
                  <div className="font-bold text-right">{items.length}</div>
                  <div className="text-muted-foreground">Total Quantity</div>
                  <div className="font-bold text-right">{totalQuantity}</div>
                  <div className="text-muted-foreground">Serial Managed</div>
                  <div className="font-bold text-right">{serialManaged}</div>
                  <div className="text-muted-foreground">Serials Captured</div>
                  <div className={`font-bold text-right ${allSerialsDone ? "text-green-600" : "text-amber-600"}`}>
                    {totalSerials}/{totalQuantity}
                    {allSerialsDone && totalQuantity > 0 && <span className="ml-1">✅</span>}
                  </div>
                  <div className="text-muted-foreground">Type</div>
                  <div className="font-bold text-right">{formData.purchase_type.replace(/_/g, " ")}</div>
                  {selectedSupplier && (
                    <>
                      <div className="text-muted-foreground">Supplier</div>
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
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2 text-sm text-gray-400">
                  <span>Tax</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isProcessing}
              className="px-5 py-2 rounded border text-sm hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            {isEditable && (
              <button
                onClick={handleSaveDraft}
                disabled={isProcessing}
                className="px-5 py-2 rounded bg-yellow-600 text-white text-sm hover:bg-yellow-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            )}

            {purchaseId && purchaseStatus === "DRAFT" && (
              <button
                onClick={handlePostClick}
                disabled={isProcessing}
                className="px-5 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 transition"
              >
                {posting ? "Posting..." : "Post Purchase"}
              </button>
            )}
          </div>
        </div>

        {/* Serial Number Modal */}
        {serialModal.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-lg mb-1">Enter Serial Numbers</h3>
              <div className="text-xs text-muted-foreground mb-1">
                Model: <span className="font-bold text-gray-700">{items[serialModal.itemIndex]?.model_no}</span>
                {" | "}Required: <span className="font-bold">{items[serialModal.itemIndex]?.quantity}</span>
                {" | "}Entered:{" "}
                <span className="font-bold text-blue-600">
                  {serialModal.tempSerials.filter((s) => s.trim() !== "").length}
                </span>
                /{items[serialModal.itemIndex]?.quantity}
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Scan barcode or type manually. Press Enter to jump to next slot.
              </p>

              {serialModal.duplicateError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded text-xs mb-3">
                  ⚠ {serialModal.duplicateError}
                </div>
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
                          if (next) {
                            next.focus();
                          } else {
                            saveSerials();
                          }
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
                <button
                  onClick={() =>
                    setSerialModal({ open: false, itemIndex: null, tempSerials: [], duplicateError: null })
                  }
                  className="px-4 py-2 border rounded text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSerials}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Save Serials
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
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
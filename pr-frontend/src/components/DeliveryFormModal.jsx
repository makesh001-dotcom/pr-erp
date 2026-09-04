// src/components/delivery/DeliveryFormModal.jsx
// src/components/delivery/DeliveryFormModal.jsx

import React, { useState, useEffect, useRef } from "react";
import API from "../api/client";
import ModelSearchSelect from "./ModelSearchSelect";
import DeliveryPrint from "./DeliveryPrint";

// DC Type options
const DC_TYPE_OPTIONS = [
  { value: "WITH_BILL_INWARD", label: "📥 Purchase Inward (Billed)" },
  { value: "WITH_BILL_OUTWARD", label: "📤 Sales Outward (Billed)" },
  { value: "WITHOUT_BILL_INWARD", label: "📥 Demo Inward (From Supplier / Customer Return)" },
  { value: "WITHOUT_BILL_OUTWARD", label: "📤 Demo Outward (To Customer / Return to Supplier)" },
];

export default function DeliveryFormModal({ isOpen, onClose, initialData, onSaveSuccess }) {
  // ================================
  // STATE
  // ================================
  const [clients, setClients] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayType, setDisplayType] = useState("");

  // Client
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Challan Details
  const [dcType, setDcType] = useState("WITHOUT_BILL_OUTWARD");
  const [orderNo, setOrderNo] = useState("");
  const [via, setVia] = useState("Direct");
  const [destination, setDestination] = useState("");
  const [remarks, setRemarks] = useState("");

  // Delivery & Return Dates
  const [deliveryDate, setDeliveryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  // Line Items
  const [lineItems, setLineItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const clientDropdownRef = useRef(null);

  // ================================
// POPULATE FORM WITH INITIAL DATA
// ================================
const populateInitialData = (data, clientsList, modelsList) => {
  console.log("📝 Populating form with data:", data);

  let client = data.client || null;

  if (!client && data.client_id) {
    client = clientsList.find(c => c.id === parseInt(data.client_id));
  }

  if (client && !client.address && data.client_id) {
    const fullClient = clientsList.find(c => c.id === parseInt(data.client_id));
    if (fullClient) client = fullClient;
  }

  setSelectedClient(client || null);
  setClientSearch(client?.company_name || data.client?.company_name || "");

  setDcType(data.dc_type || data.challan_type || "WITHOUT_BILL_OUTWARD");
  setOrderNo(data.order_no || data.reference_no || "");
  setVia(data.via || "Direct");
  setDestination(data.destination || client?.state || "");
  setDeliveryDate(data.delivery_date?.split("T")[0] || new Date().toISOString().split("T")[0]);
  setExpectedReturnDate(data.expected_return_date || "");
  setRemarks(data.remarks || "");
  setDisplayType(data.display_type || "");

  const mappedLines = (data.items || []).map((item) => {
    const fullModel = modelsList.find(m => m.id === parseInt(item.model_id));
    return {
      id: item.id || Date.now() + Math.random(),
      model_id: item.model_id,
      model_no: item.model?.model_no || fullModel?.model_no || "",
      description: item.description || fullModel?.description || "",
      hsn_code: item.hsn_code || fullModel?.hsn_code || "",
      quantity_sent: item.quantity_sent || item.quantity_delivered || item.quantity || 1,
      quantity_returned: item.quantity_returned || 0,
      model: item.model || fullModel || null,
    };
  });

  setLineItems(mappedLines);
  console.log("✅ Form populated with items:", mappedLines.length);
};
  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [clientRes, modelRes] = await Promise.all([
          API.get("/clients/", { params: { limit: 100, is_active: true } }),
          API.get("/models/", { params: { limit: 100 } }),
        ]);
        
        const clientsData = clientRes.data?.items || clientRes.data?.data || clientRes.data || [];
        const modelsData = modelRes.data?.items || modelRes.data?.data || modelRes.data || [];
        console.log("Looking for client_id", initialData?.client_id, "in", clientsData.map(c => c.id));
        setClients(clientsData);
        setAllModels(modelsData);

        if (initialData) {
          populateInitialData(initialData, clientsData, modelsData); // ⬅ use local vars, not state
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, initialData]); // ⚠️ Removed initialData from dependencies to prevent re-fetching

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSelectedClient(null);
      setClientSearch("");
      setLineItems([]);
      setErrors({});
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  // ================================
  // HELPERS
  // ================================
  const addModelToChallan = (targetModel) => {
    if (!targetModel) return;

    const existingIndex = lineItems.findIndex((item) => item.model_id === targetModel.id);

    if (existingIndex > -1) {
      const updated = [...lineItems];
      updated[existingIndex].quantity_sent += 1;
      setLineItems(updated);
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          model_id: targetModel.id,
          model_no: targetModel.model_no || targetModel.name || "—",
          description: targetModel.description || "",
          hsn_code: targetModel.hsn_code || "",
          quantity_sent: 1,
          quantity_returned: 0,
          model: targetModel,
          make: targetModel.make || targetModel.product_group?.manufacturer?.name,
          manufacturer: targetModel.product_group?.manufacturer || { name: targetModel.make || "" }
        },
      ]);
    }
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index][field] = value;
    setLineItems(updated);
    setErrors({});
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setClientSearch(client.company_name);
    setShowClientDropdown(false);
    setErrors((prev) => ({ ...prev, client: null }));

    if (client.state && !destination) {
      setDestination(client.state);
    }
  };

  // Helper check for returnable types
  const isReturnable = dcType === "WITHOUT_BILL_INWARD" || dcType === "WITHOUT_BILL_OUTWARD";

  // ================================
  // VALIDATION
  // ================================
  const validateForm = () => {
    const errs = {};
    if (!selectedClient) errs.client = "Please select a customer";
    if (lineItems.length === 0) errs.items = "Add at least one product";
    if (isReturnable && !expectedReturnDate) {
      errs.returnDate = "Expected return date is required for returnable DC";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ================================
  // SUBMISSION
  // ================================
  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const payload = {
      client_id: selectedClient.id,
      reference_no: orderNo || null,
      dc_type: dcType,
      display_type: displayType || null,
      challan_type: dcType,
      delivery_date: deliveryDate,
      expected_return_date: expectedReturnDate || null,
      remarks: remarks || null,
      via: via || null,
      destination: destination || null,
      items: lineItems.map((item) => ({
        model_id: item.model_id,
        description: item.description,
        hsn_code: item.hsn_code || null,
        quantity_sent: Number(item.quantity_sent),
        quantity_returned: Number(item.quantity_returned || 0),
        quantity_delivered: Number(item.quantity_sent),
        quantity_requested: Number(item.quantity_sent),
        unit_price: 0,
        remarks: null,
      })),
    };

    try {
      if (initialData?.id) {
        await API.put(`/api/v1/delivery/${initialData.id}`, payload);
        console.log("✅ DC updated successfully");
      } else {
        await API.post("/api/v1/delivery/", payload);
        console.log("✅ DC created successfully");
      }
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error("❌ Failed to save DC:", err);
      alert(err.response?.data?.detail || "Failed to save delivery challan.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const isEditing = !!initialData;
  const canEdit = !initialData || initialData.status === "DRAFT";

  // Build preview data for live print
  const previewItems = lineItems.map((item) => ({
    ...item,
    quantity_delivered: item.quantity_sent,
    quantity_requested: item.quantity_sent,
  }));

  const dcTypeLabel = DC_TYPE_OPTIONS.find((opt) => opt.value === dcType)?.label || dcType;

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-[1600px] h-[95vh] overflow-hidden border  border-border flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b  border-border px-6 py-3 flex-shrink-0 bg-card rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEditing ? `Edit: ${initialData.challan_no}` : "New Delivery Challan"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isEditing ? "Update details" : "Fill form — preview updates live on the right"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition text-lg"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground text-sm">Loading form data...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: FORM PANEL */}
            <div className="w-1/2 border-r  border-border overflow-y-auto">
              <form onSubmit={handleFormSubmission} className="p-5 space-y-4">
                
                {/* Status Banner */}
                {isEditing && (
                  <div className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                    initialData.status === "DRAFT" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
                    initialData.status === "CONFIRMED" ? "bg-green-50 text-green-700 border border-green-200" :
                    initialData.status === "COMPLETED" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                    "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    Status: {initialData.status}
                    {!canEdit && " (Read-only)"}
                    {initialData.is_overdue && (
                      <span className="ml-2 text-red-600">⚠ Overdue by {initialData.days_overdue} days</span>
                    )}
                    {initialData.is_long_pending && (
                      <span className="ml-2 text-amber-600">⏳ Long pending</span>
                    )}
                  </div>
                )}

                {/* DC TYPE SELECTION */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    DC Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={dcType}
                    onChange={(e) => setDcType(e.target.value)}
                    className="w-full border  border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-card"
                    disabled={!canEdit}
                  >
                    {DC_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Type — for print label only */}
<div>
  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
    Display Label (appears on DC)
  </label>
  <select
    value={displayType}
    onChange={(e) => setDisplayType(e.target.value)}
    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
    disabled={!canEdit}
  >
    <option value="">— Select —</option>
    <option value="RETURN">Return</option>
    <option value="NON_RETURN">Non-Return</option>
    <option value="DEMO">Demo</option>
    <option value="FREE_OF_COST">Free of Cost</option>
  </select>
</div>

                {/* CLIENT SELECTION */}
                <div className="relative" ref={clientDropdownRef}>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Client Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition ${
                      errors.client ? "border-red-400" : " border-border focus:border-blue-400"
                    }`}
                    placeholder="Search customer..."
                    value={clientSearch}
                    onFocus={() => setShowClientDropdown(true)}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
                    disabled={!canEdit}
                  />
                  {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}

                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute left-0 right-0 bg-card border shadow-lg rounded-lg mt-1 max-h-40 overflow-y-auto z-50">
                      {filteredClients.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                          onClick={() => handleClientSelect(c)}
                        >
                          <div className="font-medium">{c.company_name}</div>
                          {c.state && <div className="text-xs text-gray-400">{c.state}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedClient && (
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <div className="text-muted-foreground">Address:</div>
                      <div className="font-medium">{selectedClient.address || "—"}</div>
                      <div className="text-muted-foreground mt-1">City / Pincode:</div>
                      <div className="font-medium">
                        {selectedClient.state || "—"}{selectedClient.pincode ? ` - ${selectedClient.pincode}` : ""}
                      </div>
                    </div>
                  )}
                </div>

                {/* CHALLAN DETAILS GRID */}
                <div className="bg-muted rounded-xl p-4 border  border-border space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase">Challan Details</div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">DC Number</label>
                      <input
                        type="text"
                        className="w-full border  border-border rounded-lg px-3 py-2 text-sm bg-gray-100 text-muted-foreground"
                        value={initialData?.challan_no || "Auto-generated"}
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">DC Date</label>
                      <input
                        type="date"
                        className="w-full border  border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Order Ref / PO</label>
                      <input
                        type="text"
                        className="w-full border  border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="Order or PO number"
                        value={orderNo}
                        onChange={(e) => setOrderNo(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Dispatch Via</label>
                      <input
                        type="text"
                        className="w-full border  border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="Direct / Courier"
                        value={via}
                        onChange={(e) => setVia(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Destination</label>
                      <input
                        type="text"
                        className="w-full border  border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="City"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>
                    {isReturnable && (
                      <div>
                        <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                          Expected Return Date <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="date"
                          className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400 ${
                            errors.returnDate ? "border-red-400" : " border-border"
                          }`}
                          value={expectedReturnDate}
                          onChange={(e) => {
                            setExpectedReturnDate(e.target.value);
                            setErrors((prev) => ({ ...prev, returnDate: null }));
                          }}
                          disabled={!canEdit}
                        />
                        {errors.returnDate && (
                          <p className="text-red-500 text-xs mt-1">{errors.returnDate}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ADD MODEL */}
                {canEdit && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Add Product</label>
                    <ModelSearchSelect
                      value=""
                      onChange={(modelId, model) => addModelToChallan(model)}
                    />
                  </div>
                )}

                {errors.items && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
                    ⚠ {errors.items}
                  </div>
                )}

                {/* ITEMS TABLE */}
                {lineItems.length > 0 && (
                  <div className="border  border-border rounded-lg overflow-hidden">
                    <div className="bg-muted px-3 py-2 border-b  border-border text-xs font-semibold text-gray-600">
                      Items Entry ({lineItems.length} products)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                            <th className="px-2 py-2 w-20">HSN Code</th>
                            <th className="px-2 py-2">Description</th>
                            <th className="px-2 py-2 w-20">Make</th>
                            <th className="px-2 py-2 w-16 text-center">Qty Sent</th>
                            {isEditing && (
                              <th className="px-2 py-2 w-16 text-center">Returned</th>
                            )}
                            <th className="px-2 py-2 w-8 text-center">✕</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-muted/50">
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  className="w-full border  border-border rounded p-1.5 text-xs text-center outline-none focus:border-blue-400"
                                  value={item.hsn_code || ""}
                                  onChange={(e) => updateLineItem(idx, "hsn_code", e.target.value)}
                                  disabled={!canEdit}
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="font-semibold text-foreground">{item.model_no}</div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                  {item.description}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 text-center text-gray-600 text-[10px]">
                                {item.model?.manufacturer?.name || item.model?.make || "—"}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  className="w-14 text-center border  border-border rounded p-1.5 text-xs font-medium outline-none focus:border-blue-400"
                                  value={item.quantity_sent}
                                  onChange={(e) => updateLineItem(idx, "quantity_sent", Math.max(1, Number(e.target.value)))}
                                  disabled={!canEdit}
                                />
                              </td>
                              {isEditing && (
                                <td className="px-2 py-1.5 text-center">
                                  <span className={`font-medium ${
                                    item.quantity_returned >= item.quantity_sent 
                                      ? "text-green-600" 
                                      : "text-amber-600"
                                  }`}>
                                    {item.quantity_returned || 0}
                                  </span>
                                </td>
                              )}
                              <td className="px-2 py-1.5 text-center">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineItem(idx)}
                                    className="text-red-400 hover:text-red-600 font-bold"
                                  >
                                    ✕
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* REMARKS */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Remarks</label>
                  <input
                    type="text"
                    className="w-full border  border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                    placeholder="Any special instructions..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>

                {/* FOOTER BUTTONS */}
                <div className="flex justify-end gap-3 pt-3 border-t  border-border">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border  border-border rounded-lg text-sm font-medium text-gray-600 hover:bg-muted"
                  >
                    Cancel
                  </button>
                  {canEdit && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                          Saving...
                        </>
                      ) : (
                        "Save Draft"
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* RIGHT: LIVE PREVIEW PANEL */}
            <div className="w-1/2 bg-gray-100 overflow-y-auto p-3">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
              </div>
              <div className="w-full overflow-hidden">
                <div className="scale-[0.80] origin-top-left w-[125%] pointer-events-none select-none">
                  <DeliveryPrint
                    challan={{ challan_no: initialData?.challan_no || "PR/DC-___/26-27" }}
                    selectedClient={selectedClient || {}}
                    lineItems={previewItems}
                    deliveryDate={deliveryDate}
                    displayType={displayType}
                    challanType={dcTypeLabel}
                    orderNo={orderNo}
                    via={via}
                    destination={destination || selectedClient?.state || ""}
                    remarks={remarks}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
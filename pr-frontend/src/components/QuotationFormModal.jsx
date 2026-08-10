// src/components/QuotationFormModal.jsx — Updated with Live Preview

import React, { useState, useEffect, useRef } from "react";
import API from "../api/client";
import ModelSearchSelect from "./ModelSearchSelect";
import QuotationPrint from "./QuotationPrint";

export default function QuotationFormModal({ isOpen, onClose, initialData, onSaveSuccess }) {
  // ================================
  // STATE
  // ================================
  const [clients, setClients] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [lineItems, setLineItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedStaff, setSelectedStaff] = useState("");
  const [loadingNumber, setLoadingNumber] = useState(false);
  const [quotationNumber, setQuotationNumber] = useState("");

  const clientDropdownRef = useRef(null);
  const staffMembers = [
    { label: "S1 - Rajkumar", value: "S1" },
    { label: "S2 - Jothi", value: "S2" },
    { label: "S3 - Sales", value: "S3" },
    { label: "S4 - Marketing", value: "S4" },
  ];

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
        setClients(clientRes.data?.data || []);
        setAllModels(modelRes.data?.data || modelRes.data || []);

        if (initialData) {
          populateInitialData(initialData);
        }
      } catch (err) {
        console.error("Failed to load form data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, initialData]);

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
  const populateInitialData = (data) => {
    setClientSearch(data.company_name || "");
    setSelectedClient({
      id: data.client_id,
      company_name: data.company_name,
      person1_name: data.person1_name,
      person1_email: data.person1_email,
      person2_name: data.person2_name,
      person2_email: data.person2_email,
      address: data.client?.address || "",
      state: data.client?.state || "",
      pincode: data.client?.pincode || "",
      gstin: data.client?.gstin || data.client_gstin || "",
    });
    setDiscount(data.discount_rate || 0);
    setTaxRate(data.tax_rate || 18);
    setQuotationNumber(data.quotation_number || data.quotation_no || "");
    const mappedLines = (data.items || []).map((line) => ({
      id: line.id || Date.now(),
      model_id: line.model_id,
      model_no: line.model_no,
      description: line.description,
      quantity: line.quantity,
      overridePrice: line.unit_price,
      model: line.model || {
        model_no: line.model_no,
        description: line.description,
      },
      hsn_code: line.hsn_code || "8538",
      delivery_type: line.delivery_type || "",
    }));
    setLineItems(mappedLines);
  };

  const addModelToQuote = (targetModel) => {
    if (!targetModel) return;
    const existingIndex = lineItems.findIndex((item) => item.model_id === targetModel.id);
    if (existingIndex > -1) {
      const updated = [...lineItems];
      updated[existingIndex].quantity += 1;
      setLineItems(updated);
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          model_id: targetModel.id,
          model_no: targetModel.model_no,
          description: targetModel.description,
          quantity: 1,
          overridePrice: targetModel.price || targetModel.unit_price || 0,
          model: targetModel,
          hsn_code: targetModel.hsn_code || "8538",
          delivery_type: "",
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

  const validateForm = () => {
    const errs = {};
    if (!selectedClient) errs.client = "Please select a customer";
    if (lineItems.length === 0) errs.items = "Add at least one product";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStaffSelection = async (e) => {
    const staffPrefix = e.target.value;
    setSelectedStaff(staffPrefix);
    if (!staffPrefix) {
      setQuotationNumber("");
      return;
    }
    setLoadingNumber(true);
    try {
      const response = await API.post("/quotations/generate-number", {
        person_prefix: staffPrefix,
      });
      setQuotationNumber(response.data.quotation_number);
    } catch (err) {
      console.error(err);
      alert("Failed to generate quotation number");
    } finally {
      setLoadingNumber(false);
    }
  };

  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    const payload = {
      client_name: selectedClient.person1_name || selectedClient.person2_name || "Authorized Buyer",
      client_email: selectedClient.person1_email || selectedClient.person2_email || "",
      company_name: selectedClient.company_name,
      tax_rate: Number(taxRate),
      discount_rate: Number(discount),
      status: "DRAFT",
      quotation_no: quotationNumber,
      items: lineItems.map((item) => ({
        model_id: item.model_id,
        model_no: item.model_no,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.overridePrice),
        hsn_code: item.hsn_code,
        delivery_type: item.delivery_type,
      })),
    };
    try {
      if (initialData?.quotation_no) {
        await API.put(`/quotations/revision/${initialData.quotation_no}`, payload);
      } else {
        await API.post("/quotations/", payload);
      }
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      alert(err.response?.data?.detail || "Failed to save quotation.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ================================
  // COMPUTED VALUES FOR PREVIEW
  // ================================
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.overridePrice, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxableValue = subtotal - discountAmount;
  const gstAmount = (taxableValue * taxRate) / 100;
  const totalBeforeRound = taxableValue + gstAmount;
  const roundedTotal = Math.round(totalBeforeRound);
  const roundOff = roundedTotal - totalBeforeRound;

  // Build preview client object matching QuotationPrint expectations
  const previewClient = {
    ...selectedClient,
    quotation_number: quotationNumber || "QT-___",
    client_name: selectedClient?.person1_name || selectedClient?.person2_name || "",
  };

  // Build preview line items with unit_price mapped
  const previewLineItems = lineItems.map((item) => ({
    ...item,
    unit_price: item.overridePrice,
  }));

  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-2">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-[1600px] h-[95vh] overflow-hidden border  border-border flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center border-b  border-border px-6 py-3 flex-shrink-0 bg-card rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isEditing ? `Revise: ${initialData.quotation_no}` : "Create New Quotation"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isEditing ? "Create a revised version" : "Fill form — preview updates live on the right"}
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

            {/* ============================================ */}
            {/* LEFT: FORM PANEL */}
            {/* ============================================ */}
            <div className="w-1/2 border-r  border-border overflow-y-auto">
              <form onSubmit={handleFormSubmission} className="p-5 space-y-4">

                {/* Client Search */}
                <div className="relative" ref={clientDropdownRef}>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Customer <span className="text-red-400">*</span>
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
                  />
                  {errors.client && <p className="text-red-500 text-xs mt-1">{errors.client}</p>}

                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute left-0 right-0 bg-card border shadow-lg rounded-lg mt-1 max-h-40 overflow-y-auto z-50">
                      {filteredClients.map((c) => (
                        <div
                          key={c.id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setSelectedClient(c);
                            setClientSearch(c.company_name);
                            setShowClientDropdown(false);
                            setErrors((prev) => ({ ...prev, client: null }));
                          }}
                        >
                          <div className="font-medium">{c.company_name}</div>
                          {c.state && <div className="text-xs text-gray-400">{c.state}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedClient && (
                    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-blue-700 font-semibold">✅ {selectedClient.company_name}</span>
                      <button type="button" onClick={() => { setSelectedClient(null); setClientSearch(""); }}
                        className="text-blue-400 hover:text-red-500">✕</button>
                    </div>
                  )}
                </div>

                {/* Add Model */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model</label>
                  <ModelSearchSelect
                    value=""
                    onChange={(modelId, model) => addModelToQuote(model)}
                  />
                </div>

                {/* Staff Code & Quotation Number */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Code</label>
                  <select
                    value={selectedStaff}
                    onChange={handleStaffSelection}
                    disabled={!selectedClient}
                    className="w-full border  border-border rounded-lg px-3 py-2 text-sm bg-card disabled:bg-gray-100"
                  >
                    <option value="">Select Staff</option>
                    {staffMembers.map((staff) => (
                      <option key={staff.value} value={staff.value}>{staff.label}</option>
                    ))}
                  </select>
                  {selectedStaff && (
                    <div className="mt-2 text-xs">
                      {loadingNumber ? (
                        <span className="text-muted-foreground">Generating...</span>
                      ) : (
                        <span className="font-semibold text-blue-600">Quotation No: {quotationNumber}</span>
                      )}
                    </div>
                  )}
                </div>

                {errors.items && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">⚠ {errors.items}</div>
                )}

                {/* Line Items Table */}
                {lineItems.length > 0 && (
                  <div className="border  border-border rounded-lg overflow-hidden">
                    <div className="bg-muted px-3 py-2 border-b  border-border text-xs font-semibold text-gray-600">
                      Quotation Lines ({lineItems.length} items)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-left text-[10px] font-semibold text-muted-foreground uppercase">
                            <th className="px-2 py-2">Model</th>
                            <th className="px-2 py-2 w-16 text-center">Qty</th>
                            <th className="px-2 py-2 w-24 text-right">Unit Price</th>
                            <th className="px-2 py-2 w-20 text-right">Total</th>
                            <th className="px-2 py-2 w-16">HSN</th>
                            <th className="px-2 py-2 w-20">Delivery</th>
                            <th className="px-2 py-2 w-8 text-center">✕</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineItems.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-muted/50">
                              <td className="px-2 py-1.5">
                                <div className="font-semibold text-foreground">{item.model_no}</div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[120px]">{item.description}</div>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <input type="number" min="1"
                                  className="w-14 text-center border  border-border rounded p-1.5 text-xs"
                                  value={item.quantity}
                                  onChange={(e) => updateLineItem(idx, "quantity", Math.max(1, Number(e.target.value)))} />
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <input type="number" step="0.01"
                                  className="w-20 text-right border  border-border rounded p-1.5 text-xs"
                                  value={item.overridePrice}
                                  onChange={(e) => updateLineItem(idx, "overridePrice", Number(e.target.value))} />
                              </td>
                              <td className="px-2 py-1.5 text-right font-medium text-xs">
                                ₹{(item.quantity * item.overridePrice).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="text"
                                  className="w-14 border  border-border rounded p-1.5 text-xs text-center"
                                  value={item.hsn_code || ""}
                                  onChange={(e) => updateLineItem(idx, "hsn_code", e.target.value)} />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="text"
                                  className="w-16 border  border-border rounded p-1.5 text-xs"
                                  value={item.delivery_type || ""}
                                  onChange={(e) => updateLineItem(idx, "delivery_type", e.target.value)}
                                  placeholder="Immediate" />
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <button type="button" onClick={() => removeLineItem(idx)}
                                  className="text-red-400 hover:text-red-600 font-bold">✕</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Discount & Tax */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted border-t  border-border">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Discount (%)</label>
                        <input type="number" min="0" max="100"
                          className="w-full border  border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400"
                          value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Tax Rate (%)</label>
                        <input type="number" min="0" max="100"
                          className="w-full border  border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-400"
                          value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t  border-border">
                  <button type="button" onClick={onClose}
                    className="px-4 py-2 border  border-border rounded-lg text-sm font-medium text-gray-600 hover:bg-muted">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {isSaving ? "Saving..." : isEditing ? "Save Revision" : "Save Quotation"}
                  </button>
                </div>
              </form>
            </div>

            {/* ============================================ */}
            {/* RIGHT: LIVE PREVIEW PANEL */}
            {/* ============================================ */}
            <div className="w-1/2 bg-gray-100 overflow-y-auto p-3">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</span>
              </div>
              <div className="scale-[0.80] origin-top-left w-[125%]">
                <QuotationPrint
                  selectedClient={previewClient}
                  lineItems={previewLineItems}
                  subtotal={subtotal}
                  discount={discount}
                  discountAmount={discountAmount}
                  gstAmount={gstAmount}
                  taxableValue={taxableValue}
                  totalBeforeRound={totalBeforeRound}
                  roundOff={roundOff}
                  finalPrice={roundedTotal}
                  taxRate={taxRate}
                  deliveryType="Immediate"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
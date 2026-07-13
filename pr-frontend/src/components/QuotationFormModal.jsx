import React, { useState, useEffect, useRef } from "react";
import API from "../api/client";
import ModelSearchSelect from "./ModelSearchSelect";

export default function QuotationFormModal({ isOpen, onClose, initialData, onSaveSuccess }) {
  // ================================
  // STATE (Moved to the very top!)
  // ================================
  const [clients, setClients] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [allModels, setAllModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState("");
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
 
  const [selectedModelId, setSelectedModelId] = useState("");
  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    // Only run the actual data fetching if the modal is open
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [clientRes, groupRes, modelRes] = await Promise.all([
          API.get("/clients/", { params: { limit: 200, is_active: true } }),
          API.get("/product-groups/", { params: { limit: 100 } }),
          // FIX: Reduced limit from 500 down to 100 to stop the 422 validation error
          API.get("/models/", { params: { limit: 100 } }), 
        ]);

        setClients(clientRes.data?.data || []);
        setProductGroups(groupRes.data?.data || groupRes.data || []);
        setAllModels(modelRes.data?.data || modelRes.data || []);

        // Populate form if editing
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
  }, [isOpen, initialData]); // Added isOpen to the dependency array

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

  // Filter models by selected group
  useEffect(() => {
    if (selectedGroup) {
      setFilteredModels(
        allModels.filter((m) => m.product_group_id === parseInt(selectedGroup))
      );
    } else {
      setFilteredModels([]);
    }
  }, [selectedGroup, allModels]);

  // ================================
  // EARLY RETURN (Moved safely below all Hooks)
  // ================================
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
    });
    setDiscount(data.discount_rate || 0);
    setTaxRate(data.tax_rate || 18);
    setQuotationNumber(data.quotation_number || "");
    const mappedLines = (data.items || []).map((line) => ({
      id: line.id || Date.now(),
      model_id: line.model_id,
      model_no: line.model_no,
      description: line.description,
      quantity: line.quantity,
      overridePrice: line.unit_price,
      model: {
        model_no: line.model_no,
        description: line.description,
      },
      hsn_code: line.hsn_code || "8538",
      delivery_type: line.delivery_type || "",
      
    }));
    setLineItems(mappedLines);
  };

  // ================================
  // HANDLERS
  // ================================
const addModelToQuote = (targetModel) => {
    if (!targetModel) return;

    const existingIndex = lineItems.findIndex(
        item => item.model_id === targetModel.id
    );

    if (existingIndex > -1) {
        const updated = [...lineItems];
        updated[existingIndex].quantity += 1;
        setLineItems(updated);
    } else {
        setLineItems(prev => [
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

  // ================================
  // VALIDATION
  // ================================
  const validateForm = () => {
    const errs = {};
    if (!selectedClient) errs.client = "Please select a customer";
    if (lineItems.length === 0) errs.items = "Add at least one product";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const handleSelect = (model) => {
    

    setSelectedLabel(model.model_no);
    setSearch("");
    setShowDropdown(false);

    onChange(model.id, model);
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
        const response = await API.post(
    "/quotations/generate-number",
    {
        person_prefix: staffPrefix,
    }
);

    setQuotationNumber(response.data.quotation_number);
    } catch (err) {
        console.error(err);
        alert("Failed to generate quotation number");
    } finally {
        setLoadingNumber(false);
    }
};
  // ================================
  // SUBMISSION
  // ================================
  const handleFormSubmission = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    const payload = {
      client_name:
        selectedClient.person1_name ||
        selectedClient.person2_name ||
        "Authorized Buyer",
      client_email:
        selectedClient.person1_email || selectedClient.person2_email || "",
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

  // Filter clients for dropdown
  const filteredClients = clients.filter((c) =>
    c.company_name?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ================================
  // RENDER
  // ================================
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {initialData
                ? `Revise Quotation: ${initialData.quotation_no}`
                : "Create New Quotation"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {initialData ? "Create a revised version" : "Fill in details to generate quotation"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading form data...</p>
          </div>
        ) : (
          <form onSubmit={handleFormSubmission} className="p-6 space-y-6">
            {/* Top Row: Client + Group + Model */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Client Search */}
              <div className="relative" ref={clientDropdownRef}>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Customer <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition ${
                    errors.client
                      ? "border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                  }`}
                  placeholder="Search customer..."
                  value={clientSearch}
                  onFocus={() => setShowClientDropdown(true)}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                />
                {errors.client && (
                  <p className="text-red-500 text-xs mt-1">{errors.client}</p>
                )}

                {/* Client Dropdown */}
                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-xl mt-1 max-h-48 overflow-y-auto z-50">
                    {filteredClients.map((c) => (
                      <div
                        key={c.id}
                        className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0 transition"
                        onClick={() => {
                          setSelectedClient(c);
                          setClientSearch(c.company_name);
                          setShowClientDropdown(false);
                          setErrors((prev) => ({ ...prev, client: null }));
                        }}
                      >
                        <div>{c.company_name}</div>
                        {c.state && (
                          <div className="text-xs text-gray-400">{c.state}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Client Badge */}
                {selectedClient && (
                  <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="text-blue-700 font-semibold">
                      ✅ {selectedClient.company_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClient(null);
                        setClientSearch("");
                      }}
                      className="text-blue-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Product Group */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Model
                </label>
                <ModelSearchSelect
    value={selectedModelId}
    onChange={(modelId, model) => {
        addModelToQuote(model);
        setSelectedModelId("");
    }}
/>
              </div>

             
            </div>
            <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
        Staff Code
    </label>

    <select
        value={selectedStaff}
        onChange={handleStaffSelection}
        disabled={!selectedClient}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white disabled:bg-gray-100"
    >
        <option value="">Select Staff</option>

        {staffMembers.map(staff => (
            <option key={staff.value} value={staff.value}>
                {staff.label}
            </option>
        ))}
    </select>

    {selectedStaff && (
        <div className="mt-2 text-xs">
            {loadingNumber ? (
                <span className="text-gray-500">Generating...</span>
            ) : (
                <span className="font-semibold text-blue-600">
                    Quotation No: {quotationNumber}
                </span>
            )}
        </div>
    )}
</div>

            {/* Validation Error */}
            {errors.items && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                ⚠ {errors.items}
              </div>
            )}

            {/* Line Items Table */}
            {lineItems.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-bold text-sm text-gray-700">
                    Quotation Lines ({lineItems.length} items)
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-3 py-2">Model</th>
                        <th className="px-3 py-2 w-20 text-center">Qty</th>
                        <th className="px-3 py-2 w-32 text-right">Unit Price</th>
                        <th className="px-3 py-2 w-28 text-right">Total</th>
                        <th className="px-3 py-2 w-24">HSN</th>
                        <th className="px-3 py-2 w-28">Delivery</th>
                        <th className="px-3 py-2 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-3 py-2">
                            <div className="font-semibold text-gray-900">{item.model_no}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[200px]">
                              {item.description}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="1"
                              className="w-16 text-center border border-gray-200 rounded-lg p-1.5 text-sm"
                              value={item.quantity}
                              onChange={(e) =>
                                updateLineItem(idx, "quantity", Math.max(1, Number(e.target.value)))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              className="w-28 text-right border border-gray-200 rounded-lg p-1.5 text-sm"
                              value={item.overridePrice}
                              onChange={(e) =>
                                updateLineItem(idx, "overridePrice", Number(e.target.value))
                              }
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            ₹{(item.quantity * item.overridePrice).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              className="w-20 border border-gray-200 rounded-lg p-1.5 text-sm text-center"
                              value={item.hsn_code || ""}
                              onChange={(e) => updateLineItem(idx, "hsn_code", e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              className="w-24 border border-gray-200 rounded-lg p-1.5 text-sm"
                              value={item.delivery_type || ""}
                              onChange={(e) => updateLineItem(idx, "delivery_type", e.target.value)}
                              placeholder="Immediate"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(idx)}
                              className="text-red-400 hover:text-red-600 font-bold text-lg"
                              title="Remove"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Discount & Tax */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border-t border-gray-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Discount Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Saving...
                  </span>
                ) : initialData ? (
                  "Save Revision"
                ) : (
                  "Save Quotation"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import axios from "axios";

const InventoryContainer = () => {
  const [activeTab, setActiveTab] = useState("SHOWMODELS");
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Slide-over Panel
  const [selectedModel, setSelectedModel] = useState(null);
  const [modalTab, setModalTab] = useState("CATALOG");

  const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
  });
  

  // Edit Form
  const [editForm, setEditForm] = useState({
    description: "",
    price: 0,
    delivery_by: "",
    courier_name: "",
  });

  // Quick Adjust Form
  const [quickAdjust, setQuickAdjust] = useState({
    quantity: "",
    movement_type: "ADJUSTMENT",
    reference_id: "INLINE-AUDIT",
  });

  // Search
  const [inventorySearch, setInventorySearch] = useState("");
// Add pagination state
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [limit] = useState(50);
const totalPages = Math.ceil(total / limit);

// Update fetch function
const fetchInventorySummary = async () => {
    setLoading(true);
    try {
        const response = await API.get("/api/v1/inventory/inventory-summary", {
            params: {
                skip: (page - 1) * limit,
                limit: limit,
                search: inventorySearch || undefined,
            }
        });
        
        setModels(response.data?.data || []);
        setTotal(response.data?.total || 0);
    } catch (error) {
        showNotice("error", "Failed to retrieve stock data.");
    } finally {
        setLoading(false);
    }
};

// Refetch on page change
useEffect(() => {
    if (activeTab === "SHOWMODELS" || activeTab === "PRE_ORDERS") {
        fetchInventorySummary();
    }
}, [activeTab, page, inventorySearch]);

  useEffect(() => {
    if (activeTab === "SHOWMODELS" || activeTab === "PRE_ORDERS") {
      fetchInventorySummary();
    }
  }, [activeTab]);

  // ================================
  // HELPERS
  // ================================
  const showNotice = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const getStockBadge = (stock) => {
    if (stock > 10) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (stock > 0) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  // ================================
  // HANDLERS
  // ================================
  const handleRowClick = (model) => {
    setSelectedModel(model);
    setModalTab("CATALOG");
    setEditForm({
      description: model.description || "",
      price: model.price || 0,
      delivery_by: model.delivery_by || "",
      courier_name: model.courier_name || "",
    });
    setQuickAdjust({
      quantity: "",
      movement_type: "ADJUSTMENT",
      reference_id: "INLINE-AUDIT",
    });
  };

  const handleSaveCatalogDetails = async (e) => {
    e.preventDefault();
    try {
      const response = await API.put(
        `/api/v1/inventory/model/${selectedModel.id}`,
        editForm
      );
      showNotice("success", `Updated ${selectedModel.model_no}`);
      setModels((prev) =>
        prev.map((m) => (m.id === selectedModel.id ? { ...m, ...response.data } : m))
      );
      setSelectedModel(null);
    } catch (error) {
      showNotice("error", error.response?.data?.detail || "Update failed.");
    }
  };

  const handleQuickAdjustmentSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      sku: selectedModel.sku || null,
      model_no: selectedModel.model_no,
      quantity: parseInt(quickAdjust.quantity, 10) || 0,
      movement_type: quickAdjust.movement_type,
      reference_id: quickAdjust.reference_id.trim() || "INLINE-AUDIT",
      delivery_by: selectedModel.delivery_by || null,
      courier_name: selectedModel.courier_name || null,
    };

    try {
      await API.post("/api/v1/inventory/movement", payload);
      showNotice("success", `Stock adjusted for ${selectedModel.model_no}`);
      fetchInventorySummary();
      setSelectedModel(null);
    } catch (error) {
      showNotice("error", error.response?.data?.detail || "Adjustment failed.");
    }
  };

  // ================================
  // COMPUTED
  // ================================
  const preOrderModels = models.filter((m) => m.current_stock < 0);

  const filteredInventory = models.filter((item) => {
    const query = inventorySearch.toLowerCase().trim();
    if (!query) return true;
    return (
      item.model_no?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.product_group?.name?.toLowerCase().includes(query)
    );
  });
 
  // ================================
  // RENDER
  // ================================
  return (
    <div className="relative flex min-h-[70vh] w-full text-left">
      {/* MAIN CONTENT */}
      <div
        className={`flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 ${
          selectedModel ? "pr-4 mr-[420px]" : ""
        }`}
      >
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-100 pb-5 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              Inventory Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              View stock levels, manage catalog details, and perform quick adjustments.
            </p>
          </div>

          {/* TABS */}
          <div className="flex bg-gray-100 p-1 rounded-xl self-start">
            <button
              onClick={() => setActiveTab("SHOWMODELS")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "SHOWMODELS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 Live Stock
            </button>
            <button
              onClick={() => setActiveTab("PRE_ORDERS")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition relative cursor-pointer ${
                activeTab === "PRE_ORDERS"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⚠️ Pre-Orders
              {preOrderModels.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center font-bold animate-pulse">
                  {preOrderModels.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* MESSAGE */}
        {message.text && (
          <div
            className={`p-4 mb-6 rounded-xl text-xs font-medium border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : message.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* TAB 1: STOCK TABLE */}
        {activeTab === "SHOWMODELS" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Model No, SKU, description..."
                  value={inventorySearch}
                  onChange={(e) => {
    setInventorySearch(e.target.value);
    setPage(1);  // ← Reset to first page on new search
}}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {inventorySearch && (
                  <button
                    onClick={() => setInventorySearch("")}
                    className="absolute inset-y-0 right-3 text-gray-400 hover:text-black text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500">
    Showing{" "}
    <span className="font-bold text-black">{models.length}</span>{" "}
    of <span className="font-bold text-black">{total}</span> items
</div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 rounded-xl bg-white shadow-xl overflow-hidden">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-12">Loading inventory...</p>
              ) : (
                <table className="w-full text-left text-xs font-medium">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 font-bold text-gray-700 uppercase text-[10px]">
                      <th className="p-3">Model Details</th>
                      <th className="p-3">Product_Group</th>
                      <th className="p-3">MAKE</th>
                      <th className="p-3">Pdirice</th>
                      <th className="p-3 text-center w-36">Stock Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInventory.length > 0 ? (
                      filteredInventory.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => handleRowClick(item)}
                          className="hover:bg-slate-50 transition cursor-pointer group"
                        >
                          <td className="p-3">
                            <p className="font-bold text-indigo-900 group-hover:text-indigo-600 transition">
                              {item.model_no}
                            </p>
                            <p className="text-gray-600 text-[11px] mt-1">
                              {item.description || "No description"}
                            </p>
                          </td>
                          <td className="p-3 font-mono text-gray-500">
                            {item.product_group || "—"}
                          </td>
                          <td className="p-3 font-mono text-gray-500">
                            {item.manufacturer || "—"}
                          </td>
                          <td className="p-3 font-semibold">₹{item.price}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-3 py-1 rounded-full font-mono text-xs font-bold border ${getStockBadge(
                                item.current_stock
                              )}`}
                            >
                              {item.current_stock} units
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-400">
                          No items match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {/* Pagination */}
{totalPages > 1 && (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-400">
            Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
            <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
                ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = page > 3 ? page - 3 + i + 1 : i + 1;
                if (p > totalPages) return null;
                return (
                    <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs rounded-lg ${
                            p === page
                                ? "bg-indigo-600 text-white"
                                : "border hover:bg-gray-50"
                        }`}
                    >
                        {p}
                    </button>
                );
            })}
            <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-30 hover:bg-gray-50"
            >
                Next →
            </button>
        </div>
    </div>
)}
          </div>
        )}

        {/* TAB 2: PRE-ORDERS */}
        {activeTab === "PRE_ORDERS" && (
          <div>
            {preOrderModels.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-bold text-gray-700 mt-3">All stock levels are positive!</p>
                <p className="text-xs text-gray-500 mt-1">No backorders to fulfill.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-rose-50 text-rose-800 text-[11px] uppercase border-b border-rose-100">
                    <th className="py-3 px-4 font-semibold">Model</th>
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-4 font-semibold text-center">Shortage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs text-gray-700">
                  {preOrderModels.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-rose-50/30 transition cursor-pointer"
                    >
                      <td className="py-4 px-4 font-bold text-gray-900">{item.model_no}</td>
                      <td className="py-4 px-4 font-mono text-gray-500">{item.sku || "—"}</td>
                      <td className="py-4 px-4 text-center font-bold text-rose-600">
                        {Math.abs(item.current_stock)} units needed
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* SLIDE-OVER PANEL */}
      {selectedModel && (
        <aside className="fixed top-16 right-0 h-[calc(100vh-64px)] w-[400px] bg-white border-l border-gray-200 shadow-2xl z-30 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-600">
                Model Details
              </span>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">{selectedModel.model_no}</h3>
            </div>
            <button
              onClick={() => setSelectedModel(null)}
              className="text-gray-400 hover:text-gray-700 bg-white border rounded-lg w-7 h-7 flex items-center justify-center font-bold text-sm"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 text-xs font-semibold">
            <button
              onClick={() => setModalTab("CATALOG")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                modalTab === "CATALOG"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              📦 Catalog
            </button>
            <button
              onClick={() => setModalTab("QUICK_ADJUST")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                modalTab === "QUICK_ADJUST"
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              🔧 Adjust
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {modalTab === "CATALOG" && (
              <form onSubmit={handleSaveCatalogDetails} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="Product description..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-xl text-[11px] text-gray-500 font-mono space-y-1">
                  <p>🆔 ID: <span className="text-gray-900 font-bold">{selectedModel.id}</span></p>
                  <p>🏷️ SKU: <span className="text-gray-900 font-bold">{selectedModel.sku || "N/A"}</span></p>
                  <p>📦 Stock: <span className="text-gray-900 font-bold">{selectedModel.current_stock} units</span></p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition"
                >
                  Save Changes
                </button>
              </form>
            )}

            {modalTab === "QUICK_ADJUST" && (
              <form onSubmit={handleQuickAdjustmentSubmit} className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[11px] text-amber-800 font-medium">
                  💡 Adjustments are audited. Current stock:{" "}
                  <span className="font-bold">{selectedModel.current_stock} units</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quickAdjust.quantity}
                    onChange={(e) =>
                      setQuickAdjust({ ...quickAdjust, quantity: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., 5"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={quickAdjust.movement_type}
                    onChange={(e) =>
                      setQuickAdjust({ ...quickAdjust, movement_type: e.target.value })
                    }
                    className="w-full border bg-white rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {/*<option value="ADJUSTMENT">🔧 Adjustment (Audit)</option>*/}
                    <option value="INWARD">📥 Inward</option>
                    <option value="OUTWARD">📤 Outward</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                    Reference
                  </label>
                  <input
                    type="text"
                    value={quickAdjust.reference_id}
                    onChange={(e) =>
                      setQuickAdjust({ ...quickAdjust, reference_id: e.target.value })
                    }
                    className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition"
                >
                  Commit Adjustment
                </button>
              </form>
            )}
          </div>
        </aside>
      )}
    </div>
  );
};

export default InventoryContainer;
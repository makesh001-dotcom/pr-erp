import React, { useState, useEffect } from "react";
import axios from "axios";
import API from "../api/client";
import PermissionGate from "../components/PermissionGate"; // Ensure path is correct
import SerialNumberModal from "../components/SerialNumberModal";

const InventoryContainer = () => {
  const [activeTab, setActiveTab] = useState("SHOWMODELS");
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Slide-over Panel
  const [selectedModel, setSelectedModel] = useState(null);
  const [modalTab, setModalTab] = useState("CATALOG");

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

  // Search & Pagination
  const [inventorySearch, setInventorySearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const totalPages = Math.ceil(total / limit);

  // Serial Modal State
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [selectedModelForSerial, setSelectedModelForSerial] = useState(null);

  // Handler for Initial Data button
  const handleInitialDataClick = (model) => {
    setSelectedModelForSerial(model);
    setShowSerialModal(true);
  };

  // Success handler
  const handleSerialSuccess = (modelNo, count) => {
    showNotice("success", `✅ ${count} serial numbers saved for ${modelNo}`);
    fetchInventorySummary();
  };

  // Update fetch function
  const fetchInventorySummary = async () => {
    setLoading(true);
    try {
      const response = await API.get("/api/v1/inventory/inventory-summary", {
        params: {
          skip: (page - 1) * limit,
          limit: limit,
          search: inventorySearch.trim() || undefined,
        },
      });

      setModels(response.data?.data || []);
      setTotal(response.data?.total || 0);
    } catch (error) {
      showNotice("error", "Failed to retrieve stock data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "SHOWMODELS" || activeTab === "PRE_ORDERS") {
      fetchInventorySummary();
    }
  }, [activeTab, page, inventorySearch]);

  const preOrderModels = models.filter((m) => m.current_stock < 0);

  // HELPERS
  const showNotice = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  const getStockBadge = (stock) => {
    if (stock > 10) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (stock > 0) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-red-50 text-red-700 border-red-200";
  };

  // HANDLERS
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
      movement_type: "INWARD",
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
    const parsedQty = parseInt(quickAdjust.quantity, 10) || 0;

    const payload = {
      model_id: selectedModel.id,
      sku: selectedModel.sku || null,
      model_no: selectedModel.model_no,
      quantity: parsedQty,
      movement_type: quickAdjust.movement_type,
      reference_id: quickAdjust.reference_id.trim() || "INLINE-AUDIT",
      delivery_by: selectedModel.delivery_by || null,
      courier_name: selectedModel.courier_name || null,
    };

    try {
      await API.post("/api/v1/inventory/movement", payload);
      showNotice("success", `Stock adjusted for ${selectedModel.model_no}`);

      setModels((prevModels) =>
        prevModels.map((m) => {
          if (m.id === selectedModel.id) {
            const modifier = payload.movement_type === "INWARD" ? parsedQty : -parsedQty;
            return {
              ...m,
              current_stock: (m.current_stock || 0) + modifier,
            };
          }
          return m;
        })
      );

      setSelectedModel(null);
    } catch (error) {
      showNotice("error", error.response?.data?.detail || "Adjustment failed.");
    }
  };

  return (
    <div className="relative flex flex-col xl:flex-row min-h-[70vh] w-full text-left">
      {/* MAIN CONTENT */}
      <div
        className={`flex-1 bg-card p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 ${
          selectedModel ? "xl:mr-[420px]" : ""
        }`}
      >
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-5 mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight">
              Inventory Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              View stock levels, manage catalog details, and perform quick adjustments.
            </p>
          </div>

          {/* TABS */}
          <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("SHOWMODELS")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === "SHOWMODELS"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-foreground"
              }`}
            >
              📊 Live Stock
            </button>
            <button
              onClick={() => setActiveTab("PRE_ORDERS")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition relative cursor-pointer ${
                activeTab === "PRE_ORDERS"
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-foreground"
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
            className={`p-3 sm:p-4 mb-6 rounded-xl text-xs font-medium border ${
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
            <div className="bg-card p-3 sm:p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 w-full md:max-w-md">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by Model No, SKU, description..."
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                {inventorySearch && (
                  <button
                    onClick={() => {
                      setInventorySearch("");
                      setPage(1);
                    }}
                    className="absolute inset-y-0 right-3 text-gray-400 hover:text-black text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-xs text-muted-foreground self-end md:self-auto">
                Showing <span className="font-bold text-black">{models.length}</span> of{" "}
                <span className="font-bold text-black">{total}</span> items
              </div>
            </div>

            {/* Table wrapper with smooth touch scrolling for mobile */}
            <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto min-w-full">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Loading inventory...
                  </p>
                ) : (
                  <table className="w-full min-w-[650px] text-left text-xs font-medium">
                    <thead>
                      <tr className="bg-gray-100 border-b border-border font-bold text-gray-700 uppercase text-[10px]">
                        <th className="p-3">Model Details</th>
                        <th className="p-3">Product Group</th>
                        <th className="p-3">MAKE</th>
                        <th className="p-3">Price</th>
                        <th className="p-3 text-center w-32">Stock Balance</th>
                        <th className="p-3 text-center">Serial Numbers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {models.length > 0 ? (
                        models.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => handleRowClick(item)}
                            className="hover:bg-slate-50 transition cursor-pointer group"
                          >
                            <td className="p-3">
                              <p className="font-bold text-indigo-900 group-hover:text-primary-600 transition">
                                {item.model_no}
                              </p>
                              <p className="text-gray-600 text-[11px] mt-1 line-clamp-2">
                                {item.description || "No description"}
                              </p>
                            </td>
                            <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                              {item.product_group?.name || item.product_group || "—"}
                            </td>
                            <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                              {item.manufacturer || "—"}
                            </td>
                            <td className="p-3 font-semibold whitespace-nowrap">₹{item.price}</td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border inline-block ${getStockBadge(
                                  item.current_stock
                                )}`}
                              >
                                {item.current_stock} units
                              </span>
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitialDataClick(item);
                                }}
                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition shadow-sm active:scale-95"
                              >
                                📥 Serial
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-400">
                            No items match your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-1.5 sm:gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-30 hover:bg-muted"
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
                          p === page ? "bg-primary-600 text-white" : "border hover:bg-muted"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-30 hover:bg-muted"
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
          <div className="overflow-x-auto">
            {preOrderModels.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
                <span className="text-4xl">🎉</span>
                <p className="text-sm font-bold text-gray-700 mt-3">All stock levels are positive!</p>
                <p className="text-xs text-muted-foreground mt-1">No backorders to fulfill.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px]">
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
                      <td className="py-4 px-4 font-bold text-foreground">{item.model_no}</td>
                      <td className="py-4 px-4 font-mono text-muted-foreground">{item.sku || "—"}</td>
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

      {/* SLIDE-OVER PANEL / MOBILE BOTTOM SHEET OVERLAY */}
      {selectedModel && (
        <>
          {/* Mobile backdrop shadow */}
          <div
            className="fixed inset-0 bg-black/40 z-30 xl:hidden"
            onClick={() => setSelectedModel(null)}
          />

          <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[400px] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-muted flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-primary-600">
                  Model Details
                </span>
                <h3 className="text-lg font-black text-foreground mt-0.5">{selectedModel.model_no}</h3>
              </div>
              <button
                onClick={() => setSelectedModel(null)}
                className="text-gray-400 hover:text-gray-700 bg-card border rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Sub-Tabs within Panel */}
            <div className="flex border-b border-gray-100 text-xs font-semibold">
              <button
                onClick={() => setModalTab("CATALOG")}
                className={`flex-1 py-3 text-center border-b-2 transition ${
                  modalTab === "CATALOG"
                    ? "border-primary-600 text-primary-600 bg-primary-50/30"
                    : "border-transparent text-muted-foreground hover:text-gray-800"
                }`}
              >
                📦 Catalog
              </button>

              <PermissionGate permission="inventory.adjust">
                <button
                  onClick={() => setModalTab("QUICK_ADJUST")}
                  className={`flex-1 py-3 text-center border-b-2 transition ${
                    modalTab === "QUICK_ADJUST"
                      ? "border-primary-600 text-primary-600 bg-primary-50/30"
                      : "border-transparent text-muted-foreground hover:text-gray-800"
                  }`}
                >
                  🔧 Adjust
                </button>
              </PermissionGate>
            </div>

            {/* Panel Body Content View */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {modalTab === "CATALOG" && (
                <form onSubmit={handleSaveCatalogDetails} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                      placeholder="Product description..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
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
                      className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="bg-muted p-3 rounded-xl text-[11px] text-muted-foreground font-mono space-y-1">
                    <p>🆔 ID: <span className="text-foreground font-bold">{selectedModel.id}</span></p>
                    <p>🏷️ SKU: <span className="text-foreground font-bold">{selectedModel.sku || "N/A"}</span></p>
                    <p>📦 Stock: <span className="text-foreground font-bold">{selectedModel.current_stock} units</span></p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition active:scale-98"
                  >
                    Save Changes
                  </button>
                </form>
              )}

              {modalTab === "QUICK_ADJUST" && (
                <PermissionGate permission="inventory.adjust">
                  <form onSubmit={handleQuickAdjustmentSubmit} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[11px] text-amber-800 font-medium">
                      💡 Adjustments are audited. Current stock:{" "}
                      <span className="font-bold">{selectedModel.current_stock} units</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
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
                        className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                        placeholder="e.g., 5"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                        Type
                      </label>
                      <select
                        value={quickAdjust.movement_type}
                        onChange={(e) =>
                          setQuickAdjust({ ...quickAdjust, movement_type: e.target.value })
                        }
                        className="w-full border bg-card rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500 font-semibold"
                      >
                        <option value="INWARD">📥 Inward</option>
                        <option value="OUTWARD">📤 Outward</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
                        Reference
                      </label>
                      <input
                        type="text"
                        value={quickAdjust.reference_id}
                        onChange={(e) =>
                          setQuickAdjust({ ...quickAdjust, reference_id: e.target.value })
                        }
                        className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3 rounded-xl shadow-md transition active:scale-98"
                    >
                      Commit Adjustment
                    </button>
                  </form>
                </PermissionGate>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Serial Number Modal */}
      <SerialNumberModal
        isOpen={showSerialModal}
        model={selectedModelForSerial}
        onClose={() => {
          setShowSerialModal(false);
          setSelectedModelForSerial(null);
        }}
        onSuccess={handleSerialSuccess}
      />
    </div>
  );
};

export default InventoryContainer;
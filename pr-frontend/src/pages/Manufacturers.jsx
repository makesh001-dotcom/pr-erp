import React, { useState, useEffect } from "react";
import API from "../api/client";

// ================================
// STAT CARD COMPONENT
// ================================
const StatCard = ({ icon, label, value, color }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colorMap[color] || colorMap.indigo} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
};

// ================================
// ACTION MODAL COMPONENT
// ================================
const ActionModal = ({ isOpen, onClose, type, refreshData, initialData }) => {
  const [formData, setFormData] = useState({});
  const [parentOptions, setParentOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          product_group_id: initialData.product_group_id || initialData.product_group?.id || "",
          manufacturer_id: initialData.manufacturer_id || initialData.manufacturer?.id || "",
        });
      } else {
        setFormData({
          model_no: "",
          sku: "",
          description: "",
          price: 0.0,
          product_group_id: "",
          name: "",
          manufacturer_id: "",
        });
      }
      fetchRequiredOptions();
    }
  }, [isOpen, type, initialData]);

  const fetchRequiredOptions = async () => {
    if (type === "manufacturer") return;
    setLoadingOptions(true);
    try {
      const endpoint = type === "product_group" ? "/manufacturers/" : "/product-groups/";
      const res = await API.get(endpoint);
      const responseData = res.data?.data ? res.data.data : res.data;
      setParentOptions(Array.isArray(responseData) ? responseData : []);
    } catch (err) {
      console.error("Error fetching options:", err);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const baseEndpoint =
        type === "manufacturer"
          ? "/manufacturers/"
          : type === "product_group"
          ? "/product-groups/"
          : "/models/";

      let payload = {};

      if (type === "model") {
        if (isEdit) {
          payload = {
            description: formData.description || "",
            price: parseFloat(formData.price) || 0.0,
            sku: formData.sku?.trim() !== "" ? formData.sku : null,
          };
        } else {
          payload = {
            model_no: formData.model_no,
            sku: formData.sku?.trim() !== "" ? formData.sku : null,
            description: formData.description || "",
            price: parseFloat(formData.price) || 0.0,
            product_group_id: parseInt(formData.product_group_id),
          };
        }
      } else if (type === "product_group") {
        payload = {
          name: formData.name,
          description: formData.description || "",
          manufacturer_id: parseInt(formData.manufacturer_id),
        };
      } else {
        payload = {
          name: formData.name,
          description: formData.description || "",
        };
      }

      if (isEdit) {
        await API.put(`${baseEndpoint}${initialData.id}`, payload);
      } else {
        await API.post(baseEndpoint, payload);
      }

      refreshData();
      onClose();
    } catch (err) {
      console.error("Save error:", err.response?.data);
      alert(err.response?.data?.detail || "Error saving item.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const primaryInputValue = type === "model" ? formData.model_no || "" : formData.name || "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit" : "Add New"} {type.replace("_", " ")}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              {type === "model" ? "Model Number" : "Name"} <span className="text-red-400">*</span>
            </label>
            <input
              required
              disabled={isEdit && type === "model"}
              value={primaryInputValue}
              className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition ${
                isEdit && type === "model"
                  ? "bg-gray-100 cursor-not-allowed text-gray-500"
                  : "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              }`}
              onChange={(e) => {
                const key = type === "model" ? "model_no" : "name";
                setFormData({ ...formData, [key]: e.target.value });
              }}
            />
          </div>

          {type === "model" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">SKU / Barcode</label>
                <input
                  value={formData.sku || ""}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Barcode identifier..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                  Unit Price (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price ?? 0.0}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 font-medium"
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </>
          )}

          {type !== "manufacturer" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                {type === "model" ? "Product Group" : "Manufacturer"} <span className="text-red-400">*</span>
              </label>
              <select
                required
                disabled={isEdit && type === "model"}
                value={type === "model" ? formData.product_group_id || "" : formData.manufacturer_id || ""}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ${
                  isEdit && type === "model" ? "bg-gray-100 cursor-not-allowed" : "focus:border-indigo-400"
                }`}
                onChange={(e) => {
                  const key = type === "model" ? "product_group_id" : "manufacturer_id";
                  setFormData({ ...formData, [key]: e.target.value });
                }}
              >
                <option value="">{loadingOptions ? "Loading..." : "Select..."}</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description</label>
            <textarea
              value={formData.description || ""}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm h-20 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50"
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition">
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================
// MAIN PAGE COMPONENT
// ================================
const ManufacturersPage = () => {
  const [dataTree, setDataTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMfr, setSelectedMfr] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [models, setModels] = useState([]);
  const [modelSearch, setModelSearch] = useState("");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: "", initialData: null });

  // ================================
  // DATA FETCHING
  // ================================
  const fetchDataTree = async () => {
    setLoading(true);
    try {
      const res = await API.get("/manufacturers/tree/");
      const tree = res.data?.data ? res.data.data : res.data;
      setDataTree(tree);
      if (selectedMfr) {
        const updatedMfr = tree.find((m) => m.id === selectedMfr.id);
        setSelectedMfr(updatedMfr || null);
      }
    } catch (err) {
      console.error("Failed to load tree:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async (groupId) => {
    try {
      const res = await API.get(`/models/?group_id=${groupId}`);
      setModels(res.data?.data ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch models:", err);
    }
  };

  useEffect(() => {
    fetchDataTree();
  }, []);

  useEffect(() => {
    if (selectedGroup?.id) {
      fetchModels(selectedGroup.id);
    } else {
      setModels([]);
    }
  }, [selectedGroup]);

  // ================================
  // HANDLERS
  // ================================
  const handleDelete = async (id, type) => {
    if (!window.confirm(`Delete this ${type.replace("_", " ")}?`)) return;
    try {
      const endpoint =
        type === "model" ? "/models/" : type === "product_group" ? "/product-groups/" : "/manufacturers/";
      await API.delete(`${endpoint}${id}`);
      if (type === "model" && selectedGroup) {
        fetchModels(selectedGroup.id);
      } else {
        fetchDataTree();
        if (type === "product_group" && selectedGroup?.id === id) setSelectedGroup(null);
      }
    } catch (err) {
      alert("Failed to delete.");
    }
  };

  const openModal = (type, initialData = null) => {
    setModalConfig({ isOpen: true, type, initialData });
  };

  // ================================
  // COMPUTED VALUES
  // ================================
  const totalGroups = dataTree.reduce((sum, m) => sum + (m.groups?.length || 0), 0);
  const totalModels = dataTree.reduce(
    (sum, m) => sum + (m.groups?.reduce((s, g) => s + (g.models_count || 0), 0) || 0),
    0
  );

  const filteredModels = models.filter((m) => {
    if (!modelSearch) return true;
    const q = modelSearch.toLowerCase();
    return (
      m.model_no?.toLowerCase().includes(q) ||
      m.sku?.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q)
    );
  });

  // ================================
  // RENDER
  // ================================
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Hierarchy</h1>
          <p className="text-sm text-gray-500 mt-1">Manage manufacturers, product groups, and models</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal("manufacturer")} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            + Manufacturer
          </button>
          <button onClick={() => openModal("product_group")} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            + Product Group
          </button>
          <button onClick={() => openModal("model")} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
            + Add Model
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏭" label="Manufacturers" value={dataTree.length} color="indigo" />
        <StatCard icon="📂" label="Product Groups" value={totalGroups} color="blue" />
        <StatCard icon="📦" label="Total Models" value={totalModels} color="emerald" />
        <StatCard icon="📋" label="In Group" value={models.length} color="amber" />
      </div>

      {/* Breadcrumb */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 text-sm flex-wrap">
        <span className="text-gray-400">📍</span>
        <button onClick={() => { setSelectedMfr(null); setSelectedGroup(null); }} className="font-medium text-gray-500 hover:text-indigo-600 transition">
          All Manufacturers
        </button>
        {selectedMfr && (
          <>
            <span className="text-gray-300">/</span>
            <button onClick={() => setSelectedGroup(null)} className="font-semibold text-gray-700 hover:text-indigo-600 transition">
              {selectedMfr.name}
            </button>
          </>
        )}
        {selectedGroup && (
          <>
            <span className="text-gray-300">/</span>
            <span className="font-bold text-indigo-600">{selectedGroup.name}</span>
            <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
              {models.length} models
            </span>
          </>
        )}
      </div>

      {/* Main Content: Sidebar + Table */}
      <div className="grid grid-cols-12 gap-6">
        {/* Manufacturers Sidebar */}
        <div className="col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Manufacturers</h3>
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-8">Loading...</p>
          ) : dataTree.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No manufacturers yet</p>
          ) : (
            dataTree.map((mfr) => (
              <button
                key={mfr.id}
                onClick={() => { setSelectedMfr(mfr); setSelectedGroup(null); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition flex justify-between items-center ${
                  selectedMfr?.id === mfr.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="truncate">{mfr.name}</span>
                <span className={`text-xs ml-2 ${selectedMfr?.id === mfr.id ? "text-indigo-200" : "text-gray-400"}`}>
                  {mfr.groups?.length || 0}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Product Groups Sidebar */}
        <div className="col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Product Groups</h3>
          {!selectedMfr ? (
            <p className="text-xs text-gray-400 text-center py-8">← Select a manufacturer</p>
          ) : !selectedMfr.groups?.length ? (
            <p className="text-xs text-gray-400 text-center py-8">No groups</p>
          ) : (
            selectedMfr.groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition ${
                  selectedGroup?.id === group.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {group.name}
              </button>
            ))
          )}
        </div>

        {/* Models Table */}
        <div className="col-span-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          {!selectedGroup ? (
            <div className="h-[400px] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl mb-4">📂</div>
              <h3 className="text-lg font-bold text-gray-700">No Group Selected</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-xs">
                Select a manufacturer and product group to view models
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">{selectedGroup.name} Models</h3>
                <input
                  type="text"
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="w-48 px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      <th className="pb-3 px-2">Model No</th>
                      <th className="pb-3 px-2">SKU</th>
                      <th className="pb-3 px-2">Price</th>
                      <th className="pb-3 px-2">Stock</th>
                      <th className="pb-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredModels.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 text-xs">
                          {modelSearch ? "No models match your search" : "No models in this group"}
                        </td>
                      </tr>
                    ) : (
                      filteredModels.map((model) => (
                        <tr key={model.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-2 font-semibold text-gray-900">{model.model_no}</td>
                          <td className="py-3 px-2 font-mono text-xs text-gray-500">{model.sku || "—"}</td>
                          <td className="py-3 px-2 font-medium">₹{(model.price || 0).toFixed(2)}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                (model.current_stock ?? 0) > 10
                                  ? "bg-emerald-50 text-emerald-700"
                                  : (model.current_stock ?? 0) > 0
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  (model.current_stock ?? 0) > 10
                                    ? "bg-emerald-500"
                                    : (model.current_stock ?? 0) > 0
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                              ></span>
                              {model.current_stock ?? 0}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => openModal("model", model)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 transition"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(model.id, "model")}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Modal */}
      <ActionModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        initialData={modalConfig.initialData}
        refreshData={() => {
          fetchDataTree();
          if (selectedGroup?.id) fetchModels(selectedGroup.id);
        }}
        onClose={() => setModalConfig({ isOpen: false, type: "", initialData: null })}
      />
    </div>
  );
};

export default ManufacturersPage;
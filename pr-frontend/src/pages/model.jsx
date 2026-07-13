import React, { useState, useEffect } from 'react';
import API from '../api/client';

// ================================
// ACTION MODAL
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
          model_no: initialData.model_no || "",
          sku: initialData.sku || "",
          description: initialData.description || "",
          price: initialData.price || 0,
          hsn_code: initialData.hsn_code || "",
          type: initialData.type || "",
          product_group_id: initialData.product_group_id || initialData.product_group?.id || "",
          name: initialData.name || "",
          manufacturer_id: initialData.manufacturer_id || initialData.manufacturer?.id || "",
        });
      } else {
        setFormData({
          model_no: "",
          sku: "",
          description: "",
          price: 0.0,
          hsn_code: "",
          type: "",
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
      const data = res.data?.data || res.data || [];
      setParentOptions(Array.isArray(data) ? data : []);
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
        type === "manufacturer" ? "/manufacturers/"
        : type === "product_group" ? "/product-groups/"
        : "/models/";

      let payload = {};

      if (type === "model") {
        if (isEdit) {
          payload = {
            description: formData.description || "",
            price: parseFloat(formData.price) || 0.0,
            sku: formData.sku?.trim() || null,
            hsn_code: formData.hsn_code?.trim() || null,
            type: formData.type?.trim() || null,
          };
        } else {
          payload = {
            model_no: formData.model_no,
            sku: formData.sku?.trim() || null,
            description: formData.description || "",
            price: parseFloat(formData.price) || 0.0,
            hsn_code: formData.hsn_code?.trim() || null,
            type: formData.type?.trim() || null,
            product_group_id: parseInt(formData.product_group_id),
          };
        }
      } else {
        payload = {
          name: formData.name,
          description: formData.description || "",
          ...(type === "product_group" && { manufacturer_id: parseInt(formData.manufacturer_id) }),
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
      alert(err.response?.data?.detail || "Error saving.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-8 z-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? "Edit" : "Add"} {type.replace("_", " ")}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
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
              value={type === "model" ? formData.model_no || "" : formData.name || ""}
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Optional barcode..."
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
                  value={formData.price ?? 0}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 font-medium"
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </>
          )}

          {type !== "manufacturer" && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                Parent <span className="text-red-400">*</span>
              </label>
              <select
                required
                disabled={isEdit && type === "model"}
                value={type === "model" ? formData.product_group_id || "" : formData.manufacturer_id || ""}
                className={`w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none ${
                  isEdit && type === "model" ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
                onChange={(e) => {
                  const key = type === "model" ? "product_group_id" : "manufacturer_id";
                  setFormData({ ...formData, [key]: e.target.value });
                }}
              >
                <option value="">{loadingOptions ? "Loading..." : "Select..."}</option>
                {parentOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Description</label>
            <textarea
              value={formData.description || ""}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm h-20 resize-none outline-none focus:border-indigo-400"
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-[2] py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================
// MAIN PAGE
// ================================
const Models = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: "model", initialData: null });

  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await API.get('/models/');
      setModels(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this model?")) return;
    try {
      await API.delete(`/models/${id}`);
      fetchModels();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete.");
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const filteredModels = models.filter((item) => {
    const s = searchTerm.toLowerCase();
    return (
      item.model_no?.toLowerCase().includes(s) ||
      item.sku?.toLowerCase().includes(s) ||
      item.description?.toLowerCase().includes(s) ||
      item.product_group?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex-1 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900">Models</h1>
          <p className="text-sm text-gray-500 mb-4">{models.length} models in catalog</p>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by model, SKU, group..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-indigo-400"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>
        <button
          onClick={() => setModalConfig({ isOpen: true, type: "model", initialData: null })}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition h-fit"
        >
          + New Model
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading models...</div>
      ) : filteredModels.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-400">{searchTerm ? `No results for "${searchTerm}"` : "No models yet"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="px-4 py-3">Model No</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredModels.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-4 py-3 font-bold text-indigo-600">{item.model_no}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{item.description || "—"}</td>
                  <td className="px-4 py-3 font-medium">{item.product_group?.name || "—"}</td>
                  <td className="px-4 py-3 font-semibold">₹{(item.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      item.current_stock > 10 ? "bg-emerald-50 text-emerald-700"
                      : item.current_stock >= 0 ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                    }`}>
                      {item.current_stock ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModalConfig({ isOpen: true, type: "model", initialData: item })}
                      className="p-1.5 text-gray-400 hover:text-indigo-600"
                      title="Edit"
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500"
                      title="Delete"
                    >🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActionModal
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        initialData={modalConfig.initialData}
        refreshData={fetchModels}
        onClose={() => { setModalConfig({ isOpen: false, type: "model", initialData: null }); fetchModels(); }}
      />
    </div>
  );
};

export default Models;
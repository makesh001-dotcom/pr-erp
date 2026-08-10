// src/pages/CatalogManager.jsx
import React, { useState, useEffect } from "react";
import API from "../api/client";

export default function CatalogManager() {
  const [activeTab, setActiveTab] = useState("MODELS");

  // Data states
  const [manufacturers, setManufacturers] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Slide-over Panel
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalTab, setModalTab] = useState("DETAILS");

  // Edit Form
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [modelEditForm, setModelEditForm] = useState({
    description: "", price: 0, sku: "", hsn_code: "", type: ""
  });

  // Create Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "", description: "", manufacturer_id: "", product_group_id: ""
  });
  const [modelCreateForm, setModelCreateForm] = useState({
    model_no: "", sku: "", description: "", price: 0, hsn_code: "", type: "", product_group_id: ""
  });
  const [parentOptions, setParentOptions] = useState([]);

  // Search
  const [search, setSearch] = useState("");

  // ================================
  // FETCH DATA
  // ================================
  useEffect(() => {
    fetchAllData();
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === "MANUFACTURERS") {
        const res = await API.get("/manufacturers/", { params: { limit: 200 } });
        setManufacturers(res.data?.data || res.data || []);
      } else if (activeTab === "GROUPS") {
        const res = await API.get("/product-groups/", { params: { limit: 200 } });
        setProductGroups(res.data?.data || res.data || []);
      } else {
        const res = await API.get("/models/", { params: { limit: 200 } });
        setModels(res.data?.data || res.data || []);
      }
    } catch (err) {
      showNotice("error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchParentOptions = async (type) => {
    try {
      const endpoint = type === "group" ? "/manufacturers/" : "/product-groups/";
      const res = await API.get(endpoint, { params: { limit: 200 } });
      setParentOptions(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load options:", err);
    }
  };

  // ================================
  // HELPERS
  // ================================
  const showNotice = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  // ================================
  // HANDLERS
  // ================================
  const handleRowClick = (item) => {
    setSelectedItem(item);
    setModalTab("DETAILS");
    if (activeTab === "MODELS") {
      setModelEditForm({
        description: item.description || "",
        price: item.price || 0,
        sku: item.sku || "",
        hsn_code: item.hsn_code || "",
        type: item.type || "",
      });
    } else {
      setEditForm({
        name: item.name || "",
        description: item.description || "",
      });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === "MANUFACTURERS") {
        await API.put(`/manufacturers/${selectedItem.id}`, editForm);
      } else if (activeTab === "GROUPS") {
        await API.put(`/product-groups/${selectedItem.id}`, editForm);
      } else {
        await API.put(`/models/${selectedItem.id}`, modelEditForm);
      }
      showNotice("success", "Updated successfully!");
      fetchAllData();
      setSelectedItem(null);
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Update failed.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${selectedItem.name || selectedItem.model_no}"?`)) return;
    try {
      if (activeTab === "MANUFACTURERS") {
        await API.delete(`/manufacturers/${selectedItem.id}`);
      } else if (activeTab === "GROUPS") {
        await API.delete(`/product-groups/${selectedItem.id}`);
      } else {
        await API.delete(`/models/${selectedItem.id}`);
      }
      showNotice("success", "Deleted!");
      setSelectedItem(null);
      fetchAllData();
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Delete failed.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === "MANUFACTURERS") {
        await API.post("/manufacturers/", { name: createForm.name, description: createForm.description });
      } else if (activeTab === "GROUPS") {
        await API.post("/product-groups/", {
          name: createForm.name,
          description: createForm.description,
          manufacturer_id: parseInt(createForm.manufacturer_id),
        });
      } else {
        await API.post("/models/", {
          ...modelCreateForm,
          price: parseFloat(modelCreateForm.price) || 0,
          product_group_id: parseInt(modelCreateForm.product_group_id),
        });
      }
      showNotice("success", "Created!");
      setShowCreateForm(false);
      setCreateForm({ name: "", description: "", manufacturer_id: "", product_group_id: "" });
      setModelCreateForm({ model_no: "", sku: "", description: "", price: 0, hsn_code: "", type: "", product_group_id: "" });
      fetchAllData();
    } catch (err) {
      showNotice("error", err.response?.data?.detail || "Create failed.");
    }
  };

  // ================================
  // FILTERED DATA
  // ================================
  const currentData = activeTab === "MANUFACTURERS" ? manufacturers
    : activeTab === "GROUPS" ? productGroups
    : models;

  const filteredData = currentData.filter((item) => {
    const s = search.toLowerCase();
    const name = item.name || item.model_no || "";
    const desc = item.description || "";
    return name.toLowerCase().includes(s) || desc.toLowerCase().includes(s);
  });

  // ================================
  // RENDER
  // ================================
  return (
    <div className="relative flex min-h-[70vh] w-full text-left">
      {/* MAIN CONTENT */}
      <div className={`flex-1 bg-card p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 ${
        selectedItem ? "pr-4 mr-[420px]" : ""
      }`}>
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-gray-100 pb-5 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Catalog Manager</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage manufacturers, product groups, and models.
            </p>
          </div>

          {/* TABS */}
          <div className="flex bg-gray-100 p-1 rounded-xl self-start">
            {[
              { key: "MANUFACTURERS", label: "🏭 Manufacturers" },
              { key: "GROUPS", label: "📁 Product Groups" },
              { key: "MODELS", label: "📦 Models" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedItem(null); setSearch(""); }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* MESSAGE */}
        {message.text && (
          <div className={`p-4 mb-6 rounded-xl text-xs font-medium border ${
            message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            {message.text}
          </div>
        )}

        {/* Search + Create Button */}
        <div className="bg-card p-4 rounded-xl border  border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-primary-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute inset-y-0 right-3 text-gray-400 hover:text-black text-xs font-bold">✕</button>
            )}
          </div>
          <button
            onClick={() => {
              setShowCreateForm(true);
              fetchParentOptions(activeTab === "GROUPS" ? "group" : "model");
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-primary-700 transition flex items-center gap-1.5"
          >
            <span className="text-base">+</span> New {activeTab === "MANUFACTURERS" ? "Manufacturer" : activeTab === "GROUPS" ? "Group" : "Model"}
          </button>
        </div>

        {/* TABLE */}
        <div className="border  border-border rounded-xl bg-card shadow-xl overflow-hidden">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : filteredData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">
              {search ? "No results found." : `No ${activeTab.toLowerCase()} yet.`}
            </p>
          ) : (
            <table className="w-full text-left text-xs font-medium">
              <thead>
                <tr className="bg-gray-100 border-b  border-border font-bold text-gray-700 uppercase text-[10px]">
                  {activeTab === "MANUFACTURERS" && (
                    <>
                      <th className="p-3">Name</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Groups</th>
                    </>
                  )}
                  {activeTab === "GROUPS" && (
                    <>
                      <th className="p-3">Name</th>
                      <th className="p-3">Manufacturer</th>
                      <th className="p-3">Description</th>
                    </>
                  )}
                  {activeTab === "MODELS" && (
                    <>
                      <th className="p-3">Model No</th>
                      <th className="p-3">Group</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-center">Stock</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-slate-50 transition cursor-pointer group"
                  >
                    {activeTab === "MANUFACTURERS" && (
                      <>
                        <td className="p-3 font-bold text-indigo-900 group-hover:text-primary-600">{item.name}</td>
                        <td className="p-3 text-muted-foreground max-w-[250px] truncate">{item.description || "—"}</td>
                        <td className="p-3 text-center text-muted-foreground">{item.groups?.length || "—"}</td>
                      </>
                    )}
                    {activeTab === "GROUPS" && (
                      <>
                        <td className="p-3 font-bold text-indigo-900 group-hover:text-primary-600">{item.name}</td>
                        <td className="p-3 text-muted-foreground">{item.manufacturer?.name || "—"}</td>
                        <td className="p-3 text-muted-foreground max-w-[250px] truncate">{item.description || "—"}</td>
                      </>
                    )}
                    {activeTab === "MODELS" && (
                      <>
                        <td className="p-3 font-bold text-indigo-900 group-hover:text-primary-600">{item.model_no}</td>
                        <td className="p-3">
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                            {item.product_group?.name || "—"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground">{item.sku || "—"}</td>
                        <td className="p-3 text-right font-semibold">₹{Number(item.price || 0).toLocaleString("en-IN")}</td>
                        <td className="p-3 text-center">
                          <span className={`px-3 py-1 rounded-full font-mono text-xs font-bold border ${
                            (item.current_stock || 0) > 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : (item.current_stock || 0) > 0 ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {item.current_stock ?? 0}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SLIDE-OVER PANEL */}
      {selectedItem && (
        <aside className="fixed top-16 right-0 h-[calc(100vh-64px)] w-[400px] bg-card border-l  border-border shadow-2xl z-30 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 bg-muted flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary-600">
                {activeTab === "MANUFACTURERS" ? "Manufacturer" : activeTab === "GROUPS" ? "Product Group" : "Model"}
              </span>
              <h3 className="text-lg font-black text-foreground mt-0.5">
                {selectedItem.name || selectedItem.model_no}
              </h3>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-gray-400 hover:text-gray-700 bg-card border rounded-lg w-7 h-7 flex items-center justify-center font-bold text-sm"
            >×</button>
          </div>

          {/* Sub-Tabs */}
          <div className="flex border-b border-gray-100 text-xs font-semibold">
            <button
              onClick={() => setModalTab("DETAILS")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                modalTab === "DETAILS" ? "border-primary-600 text-primary-600 bg-primary-50/30"
                : "border-transparent text-muted-foreground hover:text-gray-800"
              }`}
            >📝 Edit</button>
            <button
              onClick={() => setModalTab("DELETE")}
              className={`flex-1 py-3 text-center border-b-2 transition ${
                modalTab === "DELETE" ? "border-red-500 text-red-600 bg-red-50/30"
                : "border-transparent text-muted-foreground hover:text-gray-800"
              }`}
            >🗑️ Delete</button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {modalTab === "DETAILS" && (
              <form onSubmit={handleUpdate} className="space-y-4">
                {(activeTab === "MANUFACTURERS" || activeTab === "GROUPS") && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Name</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </>
                )}

                {activeTab === "MODELS" && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={modelEditForm.description}
                        onChange={(e) => setModelEditForm({ ...modelEditForm, description: e.target.value })}
                        className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Price (₹)</label>
                        <input type="number" step="0.01" min="0"
                          value={modelEditForm.price}
                          onChange={(e) => setModelEditForm({ ...modelEditForm, price: e.target.value })}
                          className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">SKU</label>
                        <input
                          value={modelEditForm.sku}
                          onChange={(e) => setModelEditForm({ ...modelEditForm, sku: e.target.value })}
                          className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">HSN Code</label>
                        <input
                          value={modelEditForm.hsn_code}
                          onChange={(e) => setModelEditForm({ ...modelEditForm, hsn_code: e.target.value })}
                          className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">Type</label>
                        <input
                          value={modelEditForm.type}
                          onChange={(e) => setModelEditForm({ ...modelEditForm, type: e.target.value })}
                          className="w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-xl text-[11px] text-muted-foreground space-y-1">
                      <p>🆔 ID: <span className="text-foreground font-bold">{selectedItem.id}</span></p>
                      <p>📦 Group: <span className="text-foreground font-bold">{selectedItem.product_group?.name || "—"}</span></p>
                      <p>📊 Stock: <span className="text-foreground font-bold">{selectedItem.current_stock ?? 0} units</span></p>
                    </div>
                  </>
                )}

                <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition">
                  Save Changes
                </button>
              </form>
            )}

            {modalTab === "DELETE" && (
              <div className="text-center space-y-4">
                <div className="text-5xl">⚠️</div>
                <h3 className="text-lg font-bold text-foreground">
                  Delete "{selectedItem.name || selectedItem.model_no}"?
                </h3>
                <p className="text-xs text-red-500">This action cannot be undone.</p>
                <button
                  onClick={handleDelete}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition"
                >
                  Yes, Delete Permanently
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* CREATE MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCreateForm(false)}></div>
          <div className="relative bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-foreground">
                New {activeTab === "MANUFACTURERS" ? "Manufacturer" : activeTab === "GROUPS" ? "Product Group" : "Model"}
              </h2>
              <button onClick={() => setShowCreateForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {(activeTab === "MANUFACTURERS" || activeTab === "GROUPS") && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Name <span className="text-red-400">*</span></label>
                    <input required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  {activeTab === "GROUPS" && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Manufacturer <span className="text-red-400">*</span></label>
                      <select required
                        value={createForm.manufacturer_id}
                        onChange={(e) => setCreateForm({ ...createForm, manufacturer_id: e.target.value })}
                        className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                      >
                        <option value="">Select Manufacturer</option>
                        {parentOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                    <textarea rows={2}
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
                    />
                  </div>
                </>
              )}

              {activeTab === "MODELS" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Model No <span className="text-red-400">*</span></label>
                    <input required
                      value={modelCreateForm.model_no}
                      onChange={(e) => setModelCreateForm({ ...modelCreateForm, model_no: e.target.value })}
                      className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Product Group <span className="text-red-400">*</span></label>
                    <select required
                      value={modelCreateForm.product_group_id}
                      onChange={(e) => setModelCreateForm({ ...modelCreateForm, product_group_id: e.target.value })}
                      className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                    >
                      <option value="">Select Group</option>
                      {parentOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Price (₹)</label>
                      <input type="number" step="0.01" min="0"
                        value={modelCreateForm.price}
                        onChange={(e) => setModelCreateForm({ ...modelCreateForm, price: e.target.value })}
                        className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">SKU</label>
                      <input
                        value={modelCreateForm.sku}
                        onChange={(e) => setModelCreateForm({ ...modelCreateForm, sku: e.target.value })}
                        className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">HSN Code</label>
                      <input
                        value={modelCreateForm.hsn_code}
                        onChange={(e) => setModelCreateForm({ ...modelCreateForm, hsn_code: e.target.value })}
                        className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Type</label>
                      <input
                        value={modelCreateForm.type}
                        onChange={(e) => setModelCreateForm({ ...modelCreateForm, type: e.target.value })}
                        className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Description</label>
                    <textarea rows={2}
                      value={modelCreateForm.description}
                      onChange={(e) => setModelCreateForm({ ...modelCreateForm, description: e.target.value })}
                      className="w-full border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2.5 font-medium text-muted-foreground border  border-border rounded-xl hover:bg-muted text-sm">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-[2] py-2.5 rounded-xl bg-primary-600 text-white font-semibold hover:bg-primary-700 text-sm">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
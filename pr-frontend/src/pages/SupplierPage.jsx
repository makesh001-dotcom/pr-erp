// src/pages/SupplierPage.jsx

import { useState, useEffect } from "react";
import SupplierFormModal from "../components/SupplierFormModal";
import ParcelPrint from "../components/ParcelPrint";
import {
  getSuppliers,
  deactivateSupplier,
  reactivateSupplier,
} from "../api/supplierAPI";

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // State for controlling the printable parcel box label view
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printData, setPrintData] = useState(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 200,
        is_active: !showInactive || null,
      };
      if (search) params.search = search;
      const res = await getSuppliers(params);
      setSuppliers(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch suppliers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, showInactive]);

  const handleCreate = () => {
    setEditSupplierId(null);
    setModalOpen(true);
  };

  const handleEdit = (id) => {
    setEditSupplierId(id);
    setModalOpen(true);
  };

  const handleOpenPrint = (supplier) => {
    if (!supplier || supplier.nativeEvent || !supplier.company_name) {
      return;
    }
    setPrintData(supplier);
    setPrintModalOpen(true);
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate supplier "${name}"?`)) return;
    try {
      await deactivateSupplier(id);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to deactivate");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await reactivateSupplier(id);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reactivate");
    }
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      {/* SCOPED PRINT MEDIA CSS INJECTION */}
      <style>{`
        @media print {
          /* Hide all page content outside the print preview wrapper */
          body * {
            visibility: hidden !important;
          }
          
          /* Unhide only the parcel component container and its children */
          .parcel-print-area,
          .parcel-print-area * {
            visibility: visible !important;
          }

          /* Position the label at top-left of the paper */
          .parcel-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: #ffffff !important;
          }

          /* Hide modal action buttons when browser print window opens */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage supplier master data</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Add Supplier
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, GSTIN, or contact..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            Show Inactive
          </label>
          <span className="text-xs text-muted-foreground ml-auto">
            {suppliers.length} supplier(s)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <p className="text-center py-12 text-muted-foreground">Loading suppliers...</p>
        ) : suppliers.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">No suppliers found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Company Name</th>
                <th className="p-3 text-left">GSTIN</th>
                <th className="p-3 text-left">Primary Contact</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-muted ${!s.is_active ? "opacity-60" : ""}`}
                >
                  <td className="p-3 font-mono text-xs font-medium">{s.supplier_code}</td>
                  <td className="p-3 font-medium">
                    <button
                      onClick={() => handleEdit(s.id)}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                      {s.company_name}
                    </button>
                    {s.state && (
                      <p className="text-xs text-muted-foreground">{s.state}{s.pincode ? ` - ${s.pincode}` : ""}</p>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">{s.gstin || "—"}</td>
                  <td className="p-3">
                    {s.person1_name || "—"}
                    {s.person1_email && (
                      <p className="text-xs text-muted-foreground">{s.person1_email}</p>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {s.person1_phone || s.alternate_phone || "—"}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        s.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrint(s);
                        }}
                        className="text-gray-600 hover:text-foreground text-xs font-medium"
                        title="Print Shipping Label"
                      >
                        🖨️
                      </button>
                      <button
                        onClick={() => handleEdit(s.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {s.is_active ? (
                        <button
                          onClick={() => handleDeactivate(s.id, s.company_name)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                          title="Deactivate"
                        >
                          🚫
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(s.id)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                          title="Reactivate"
                        >
                          ✅
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Supplier Form Modal */}
      <SupplierFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        supplierId={editSupplierId}
        onSaveSuccess={() => {
          setModalOpen(false);
          fetchSuppliers();
        }}
      />

      {/* Print Preview Modal Overlay */}
      {printModalOpen && printData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-card shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            
            {/* Action Bar with Print Button */}
            <div className="flex justify-between items-center mb-4 no-print">
              <h2 className="text-lg font-bold">Shipping Label Preview</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleTriggerPrint}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  🖨️ Print Label
                </button>
                <button
                  onClick={() => {
                    setPrintModalOpen(false);
                    setPrintData(null);
                  }}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Target Printable Wrapper */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4 rounded-xl border flex justify-center">
              <div className="parcel-print-area">
                <ParcelPrint client={printData} />
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
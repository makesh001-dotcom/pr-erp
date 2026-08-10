import { useEffect, useState } from "react";
import React from "react";
import {
  getClients,
  createClient,
  updateClient,
  deactivateClient,
  reactivateClient,
} from "../api/client";
import ClientForm from "../components/ClientForm";
import { parseExcelHeaders } from "../utils/excelUtils";
import API from "../api/client";
import { exportToExcel } from "../utils/Export_Excel";
import ParcelPrint from "../components/ParcelPrint";

export default function ClientPage() {
  const [clients, setClients] = useState([]);
  const [editingClient, setEditingClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedPrintClient, setSelectedPrintClient] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const totalPages = Math.ceil(total / limit);

  // ================================
  // FETCH
  // ================================
  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await getClients({
        search: search || undefined,
        skip: (page - 1) * limit,
        limit: limit,
        is_active: !showInactive ? true : undefined,
      });
      setClients(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, search, showInactive]);

  // ================================
  // HANDLERS
  // ================================
  const handleSubmit = async (formData) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        await createClient(formData);
      }
      setEditingClient(null);
      setShowForm(false);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.detail || "Save Error: Check required fields.");
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Deactivate "${name}"?`)) return;
    try {
      await deactivateClient(id);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to deactivate");
    }
  };

  const handleReactivate = async (id) => {
    try {
      await reactivateClient(id);
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reactivate");
    }
  };

  const handleFileLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    parseExcelHeaders(file, ({ headers, jsonData }) => {
      const match = (regex) => headers.find((h) => regex.test(h)) || "";
      const autoMapping = {
        company_name: match(/comp|firm|organization|business/i),
        person1_name: match(/person\s*1|contact\s*1|primary\s*name|owner/i),
        person1_email: match(/email|mail/i),
        person1_phone: match(/phone|mobile|tel|contact/i),
        person2_name: match(/person\s*2|secondary\s*name/i),
        person2_email: match(/alt.*email|email\s*2/i),
        person2_phone: match(/alt.*phone|phone\s*2|mobile\s*2/i),
        address: match(/address|location|street/i),
        state: match(/state|region|province/i),
        pincode: match(/pin|zip|post/i),
        gstin: match(/gst|tax|tin|vat/i),
        alter_email: match(/alt.*email|email\s*2/i),
        alter_phone: match(/alt.*phone/i),
      };

      const payload = jsonData
        .map((row) => {
          let obj = {};
          for (let key in autoMapping) {
            let value = row[autoMapping[key]];
            if (key.includes("email")) value = value?.toString().includes("@") ? value : null;
            else if (key === "gstin") value = value ? value.toString() : null;
            else value = value || "";
            obj[key] = value;
          }
          return obj;
        })
        .filter((item) => item.company_name);

      if (payload.length > 0) {
        API.post("/api/v1/clients/bulk", payload)
          .then(() => {
            alert(`✅ Imported ${payload.length} clients successfully.`);
            fetchClients();
          })
          .catch((err) => {
            alert(err.response?.data?.detail || "Bulk Import Failed.");
          })
          .finally(() => setImporting(false));
      } else {
        alert("Failed to detect 'Company Name' column.");
        setImporting(false);
      }
    });
  };

  // ================================
  // HIGHLIGHT COMPONENT
  // ================================
  const Highlight = ({ text, query }) => {
    if (!query?.trim() || !text) return <span>{text || "—"}</span>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = String(text).split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-foreground rounded-sm px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // ================================
  // RENDER
  // ================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} client{total !== 1 ? "s" : ""} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64 rounded-xl border border-gray-300 bg-card px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingClient(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition"
          >
            + Add Client
          </button>
          <label className="rounded-lg bg-card border border-gray-300 text-gray-700 px-4 py-2.5 text-sm font-semibold cursor-pointer hover:bg-muted transition">
            {importing ? "⏳ Importing..." : "📥 Import"}
            <input
              type="file"
              onChange={handleFileLoad}
              hidden
              accept=".xlsx, .xls"
              disabled={importing}
            />
          </label>
          <button
            onClick={() => exportToExcel(clients, "Clients")}
            className="rounded-lg bg-card border border-gray-300 text-gray-700 px-4 py-2.5 text-sm font-semibold hover:bg-muted transition"
          >
            📤 Export
          </button>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setPage(1);
              }}
              className="rounded"
            />
            Show Inactive
          </label>
          <div className="text-xs text-gray-400">
            Page {page} of {totalPages || 1}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border  border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b  border-border text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Primary Contact</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading clients...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    {search
                      ? "No clients match your search."
                      : "No clients yet. Add your first client!"}
                  </td>
                </tr>
              ) : (
                clients.map((c, index) => (
                  <React.Fragment key={c.id}>
                    {/* Main Row */}
                    <tr
                      onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                      className="hover:bg-blue-50/30 transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          <Highlight text={c.company_name} query={search} />
                        </div>
                        {c.state && (
                          <span className="text-xs text-gray-400">
                            {c.state}
                            {c.pincode ? ` - ${c.pincode}` : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{c.person1_name || "—"}</div>
                        {c.person1_email && (
                          <div className="text-xs text-gray-400">{c.person1_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.person1_phone || c.alternate_phone || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {c.gstin || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.is_active !== false
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {c.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingClient(c);
                              setShowForm(true);
                            }}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {c.is_active !== false ? (
                            <button
                              onClick={() => handleDeactivate(c.id, c.company_name)}
                              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition"
                              title="Deactivate"
                            >
                              🚫
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(c.id)}
                              className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition"
                              title="Reactivate"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPrintClient(c)}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition"
                            title="Print"
                          >
                            🖨️
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === c.id && (
                      <tr>
                        <td
                          colSpan={7}
                          className="bg-muted px-6 py-4 border-b  border-border"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                                Address
                              </span>
                              <p className="text-gray-700 mt-1">{c.address || "—"}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                                Secondary Contact
                              </span>
                              <p className="text-gray-700 mt-1">{c.person2_name || "—"}</p>
                              {c.person2_phone && (
                                <p className="text-muted-foreground">{c.person2_phone}</p>
                              )}
                              {c.person2_email && (
                                <p className="text-muted-foreground">{c.person2_email}</p>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                                Alternate Contact
                              </span>
                              <p className="text-gray-700 mt-1">
                                {c.alternate_phone || "—"}
                              </p>
                              {c.alternate_email && (
                                <p className="text-muted-foreground">{c.alternate_email}</p>
                              )}
                            </div>
                            <div>
                              <span className="text-gray-400 font-semibold uppercase tracking-wider">
                                Additional Info
                              </span>
                              <p className="text-gray-700 mt-1">
                                {c.website || "—"}
                              </p>
                              {c.remarks && (
                                <p className="text-muted-foreground mt-1 italic">
                                  "{c.remarks}"
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-30 hover:bg-muted transition"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, i, arr) => (
              <React.Fragment key={p}>
                {i > 0 && arr[i - 1] !== p - 1 && (
                  <span className="text-gray-400">...</span>
                )}
                <button
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 text-sm rounded-lg transition ${
                    p === page
                      ? "bg-blue-600 text-white shadow-sm"
                      : "border hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-30 hover:bg-muted transition"
          >
            Next →
          </button>
        </div>
      )}

      {/* Form Modal */}
      {(showForm || editingClient) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => {
              setEditingClient(null);
              setShowForm(false);
            }}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border  border-border bg-card p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingClient ? "Edit Client" : "New Client"}
              </h2>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setShowForm(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>
            <ClientForm
              onSubmit={handleSubmit}
              selectedClient={editingClient}
              clearEdit={() => {
                setEditingClient(null);
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Print Modal */}
{selectedPrintClient && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-4xl rounded-2xl bg-card shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
      
      {/* Action Bar with Print and Close Buttons */}
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold">Shipping Label Preview</h2>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold hover:bg-black transition"
          >
            Print Label
          </button>
          <button
            onClick={() => setSelectedPrintClient(null)}
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Target Printable Wrapper */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4 rounded-xl border flex justify-center">
        <div className="parcel-print-area">
          <ParcelPrint client={selectedPrintClient} />
        </div>
      </div>

    </div>
  </div>
)}
      
    </div>
  );
}
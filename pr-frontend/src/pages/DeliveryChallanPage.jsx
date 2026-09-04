// src/pages/DeliveryChallanPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import DeliveryFormModal from "../components/DeliveryFormModal";
import DeliveryPrint from "../components/DeliveryPrint";
import DeliveryStatusBadge from "../components/DeliveryStatusBadge";
import API from "../api/client";
import {
  getDeliveryChallans,
  confirmDeliveryChallan,
  cancelDeliveryChallan,
  deleteDeliveryChallan,
} from "../api/delivery";

export default function DeliveryChallanPage() {
  const [challans, setChallans] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChallanForEdit, setSelectedChallanForEdit] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dcTypeFilter, setDcTypeFilter] = useState("");

  // Print State
  const [activePrintPayload, setActivePrintPayload] = useState(null);

  // ================================
  // DATA FETCHING
  // ================================
  const loadChallans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: searchQuery || undefined,
        limit: 50,
      };
      if (statusFilter) params.status = statusFilter;
      if (dcTypeFilter) params.dc_type = dcTypeFilter;

      // 'res' is response.data from delivery.js helper
      const res = await getDeliveryChallans(params); 
      
      // Read items and total directly from res
      setChallans(res.items || res.data || []); 
      setTotalCount(res.total || res.count || 0);
    } catch (err) {
      console.error("Failed to load delivery challans:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, dcTypeFilter]);

  const loadClients = useCallback(async () => {
    try {
      const res = await API.get("/clients/", {
        params: { limit: 200, is_active: true },
      });
      setClients(res.data?.items || res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }, []);

  useEffect(() => {
    loadChallans();
    loadClients();
  }, [loadChallans, loadClients]);

  // ================================
  // ACTIONS
  // ================================
  const handleConfirm = async (challanId) => {
    if (!window.confirm("Confirm this delivery? Stock will be deducted.")) return;
    try {
      await confirmDeliveryChallan(challanId);
      await loadChallans();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to confirm delivery.");
    }
  };

  const handleCancel = async (challanId) => {
    const reason = window.prompt("Reason for cancellation:");
    if (reason === null) return;
    try {
      await cancelDeliveryChallan(challanId, { reason });
      await loadChallans();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to cancel delivery.");
    }
  };

  const handleDelete = async (challanId) => {
    if (!window.confirm("Delete this delivery challan?")) return;
    try {
      await deleteDeliveryChallan(challanId);
      await loadChallans();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete delivery.");
    }
  };

  const handlePrint = (challan) => {
  const fullClient = clients.find((c) => c.id === Number(challan.client_id));

  const mappedItems = (challan.items || []).map((item) => ({
    ...item,
    model_no: item.model_no || item.model?.model_no || "",
    hsn_code: item.hsn_code || item.model?.hsn_code || "",
    description: item.description || item.model?.description || "",
  }));

  setActivePrintPayload({
    challan,
    selectedClient: {
      ...fullClient,
      company_name: fullClient?.company_name || challan.client?.company_name || "Client",
      address: fullClient?.address || challan.client?.address || "",
      state: fullClient?.state || challan.client?.state || "",
      pincode: fullClient?.pincode || challan.client?.pincode || "",
      gstin: fullClient?.gstin || challan.client?.gstin || "",
    },
    lineItems: mappedItems,
    deliveryDate: challan.delivery_date,
    displayType: challan.display_type,
    challanType: challan.dc_type || challan.challan_type || challan.type || "RETURNABLE",
    orderNo: challan.reference_no || challan.order_no || "—",
    via: challan.via || challan.dispatch_through || "Direct",
    destination: challan.destination || "—",
    referenceNo: challan.reference_no,
    remarks: challan.remarks,
  });

  setTimeout(() => {
    window.print();
  }, 300);
};

  // ================================
  // HELPERS
  // ================================
  const getTotalQuantity = (items) => {
    return items?.reduce(
      (sum, item) => sum + (item.quantity_sent || item.quantity_requested || item.quantity_delivered || item.quantity || 0), 
      0
    ) || 0;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ================================
  // RENDER
  // ================================
  return (
    <div className="bg-muted min-h-screen p-6 text-black print:bg-card print:p-0">
      <div className="print:hidden max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-2xl border  border-border shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Delivery Challans</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {totalCount} challan{totalCount !== 1 ? "s" : ""} in system
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedChallanForEdit(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <span className="text-lg">+</span> New Delivery Challan
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-card rounded-2xl border  border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-muted/50 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by challan no, client, or reference..."
              className="w-full md:w-1/2 border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PRINTED">Printed</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={dcTypeFilter}
              onChange={(e) => setDcTypeFilter(e.target.value)}
              className="border  border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400"
            >
              <option value="">All Types</option>
              <option value="WITH_BILL_INWARD">DC With Bill - IN</option>
              <option value="WITH_BILL_OUTWARD">DC With Bill - OUT</option>
              <option value="WITHOUT_BILL_INWARD">DC Without Bill - IN</option>
              <option value="WITHOUT_BILL_OUTWARD">DC Without Bill - OUT</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b  border-border text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">Challan No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading challans...
                    </td>
                  </tr>
                ) : challans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                      {searchQuery || statusFilter || dcTypeFilter
                        ? "No challans match your filters."
                        : "No delivery challans yet. Create your first one!"}
                    </td>
                  </tr>
                ) : (
                  challans.map((ch) => (
                    <tr key={ch.id} className="hover:bg-muted/50 transition font-medium">
                      <td className="px-4 py-3">
                        <span className="font-bold text-indigo-900">{ch.challan_no}</span>
                        {ch.revision_no > 0 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-1.5">
                            R{ch.revision_no}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(ch.delivery_date)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {ch.client?.company_name || clients.find((c) => c.id === ch.client_id)?.company_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {ch.reference_no || ch.order_no || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <DeliveryStatusBadge status={ch.status} />
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground">
                        {getTotalQuantity(ch.items)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {ch.status === "DRAFT" && (
                            <button
                              onClick={() => {
                                setSelectedChallanForEdit(ch);
                                setIsModalOpen(true);
                              }}
                              className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-2.5 py-1 rounded-lg font-medium transition"
                              title="Edit"
                            >
                              ✏️
                            </button>
                          )}

                          <button
                            onClick={() => handlePrint(ch)}
                            className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-1 rounded-lg font-medium transition"
                            title="Print"
                          >
                            🖨️
                          </button>

                          {(ch.status === "DRAFT" || ch.status === "PRINTED") && (
                            <button
                              onClick={() => handleConfirm(ch.id)}
                              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1 rounded-lg font-medium transition"
                              title="Confirm"
                            >
                              ✅
                            </button>
                          )}

                          {ch.status === "CONFIRMED" && (
                            <button
                              onClick={() => handleCancel(ch.id)}
                              className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2.5 py-1 rounded-lg font-medium transition"
                              title="Cancel"
                            >
                              ❌
                            </button>
                          )}

                          {(ch.status === "DRAFT" || ch.status === "CANCELLED") && (
                            <button
                              onClick={() => handleDelete(ch.id)}
                              className="text-xs bg-gray-100 text-muted-foreground hover:bg-gray-200 hover:text-red-600 px-2 py-1 rounded-lg font-medium transition"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 bg-muted/50 text-xs text-gray-400">
            Showing {challans.length} of {totalCount} challans
          </div>
        </div>
      </div>

      {activePrintPayload && (
        <div className="hidden print:block bg-card">
          <DeliveryPrint {...activePrintPayload} />
        </div>
      )}

      <DeliveryFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedChallanForEdit(null);
        }}
        initialData={selectedChallanForEdit}
        onSaveSuccess={loadChallans}
      />
    </div>
  );
}
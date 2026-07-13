import React, { useState, useEffect, useCallback } from "react";
import API from "../api/client";
import QuotationFormModal from "../components/QuotationFormModal";
import QuotationPrint from "../components/QuotationPrint";

export default function QuotationPage() {
  const [quotations, setQuotations] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuotationForEdit, setSelectedQuotationForEdit] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Print State
  const [activePrintPayload, setActivePrintPayload] = useState(null);

  // History Timeline State
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ================================
  // DATA FETCHING
  // ================================
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/quotations/", {
        params: { q: searchQuery || undefined, limit: 50 },
      });
      setQuotations(res.data?.data || []);
      setTotalCount(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadClients = useCallback(async () => {
    try {
      const res = await API.get("/clients/", { params: { limit: 200, is_active: true } });
      setClients(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadClients();
  }, [loadDashboardData, loadClients]);

  // ================================
  // HISTORY TIMELINE
  // ================================
  const loadHistoryAuditTimeline = async (quotationNo) => {
    setHistoryLoading(true);
    try {
      const res = await API.get(`/quotations/history/${quotationNo}`);
      setHistoryTimeline(res.data || []);
    } catch (err) {
      alert("Failed to load revision history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // ================================
  // PRINT HANDLER
  // ================================
  const activatePrintCanvas = (quoteData) => {
    const subtotal = quoteData.sub_total || 0;
    const discountAmount = quoteData.discount_amount || 0;
    const taxableValue = subtotal - discountAmount;
    const gstAmount = quoteData.tax_amount || 0;
    const totalBeforeRound = taxableValue + gstAmount;
    const roundedTotal = Math.round(totalBeforeRound);
    const roundOff = roundedTotal - totalBeforeRound;

    const fullClient = clients.find(
      (c) =>
        c.company_name?.trim().toLowerCase() ===
        quoteData.company_name?.trim().toLowerCase()
    );

    setActivePrintPayload({
      selectedClient: {
        ...fullClient,
        quotation_number: `${quoteData.quotation_no}/REV-${quoteData.revision_no}`,
        client_name: quoteData.client_name,
        email: quoteData.client_email,
      },
      lineItems: quoteData.items || [],
      subtotal,
      discount: quoteData.discount_rate || 0,
      discountAmount,
      taxableValue,
      gstAmount,
      totalBeforeRound,
      roundOff,
      finalPrice: roundedTotal,
      taxRate: quoteData.tax_rate || 18,
      deliveryType: "Immediate",
    });

    setTimeout(() => {
      window.print();
    }, 300);
  };

  // ================================
  // HELPERS
  // ================================
  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: "bg-yellow-100 text-yellow-800",
      SENT: "bg-blue-100 text-blue-800",
      ACCEPTED: "bg-emerald-100 text-emerald-800",
      REJECTED: "bg-red-100 text-red-800",
      EXPIRED: "bg-gray-100 text-gray-600",
    };
    return styles[status] || "bg-gray-100 text-gray-600";
  };

  // ================================
  // RENDER
  // ================================
  return (
    <div className="bg-gray-50 min-h-screen p-6 text-black print:bg-white print:p-0">
      {/* Main Content - Hidden during print */}
      <div className="print:hidden max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quotations</h2>
            <p className="text-gray-500 text-sm mt-1">
              {totalCount} quotation{totalCount !== 1 ? "s" : ""} in system
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedQuotationForEdit(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            <span className="text-lg">+</span> New Quotation
          </button>
        </div>

        {/* Search & Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <input
              type="text"
              placeholder="Search by client name, company, or quotation number..."
              className="w-full md:w-1/3 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Reference No</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading quotations...
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                      {searchQuery
                        ? "No quotations match your search."
                        : "No quotations yet. Create your first quotation!"}
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition font-medium">
                      <td className="px-4 py-3">
                        <span className="font-bold text-indigo-900">{q.quotation_no}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded ml-1.5">
                          R{q.revision_no}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{q.company_name || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">{q.client_name || "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        ₹{Number(q.grand_total || 0).toLocaleString("en-IN")}
                      </td>
                      
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => loadHistoryAuditTimeline(q.quotation_no)}
                            className="text-xs text-gray-500 hover:text-blue-600 font-medium transition"
                            title="Revision History"
                          >
                            📜 History
                          </button>
                          <button
                            onClick={() => {
                              setSelectedQuotationForEdit(q);
                              setIsModalOpen(true);
                            }}
                            className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-2.5 py-1 rounded-lg font-medium transition"
                          >
                            Revise
                          </button>
                          <button
                            onClick={() => activatePrintCanvas(q)}
                            className="text-xs bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-1 rounded-lg font-medium transition"
                          >
                            🖨️ Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
            Showing {quotations.length} of {totalCount} quotations
          </div>
        </div>

        {/* History Timeline Modal */}
        {historyTimeline.length > 0 && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4 sticky top-0 bg-white rounded-t-2xl z-10">
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">
                    Revision History
                  </h4>
                  <p className="text-sm text-gray-500">
                    {historyTimeline[0]?.quotation_no}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryTimeline([])}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  ✕
                </button>
              </div>

              {/* Timeline Content */}
              <div className="p-6">
                {historyLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Loading history...</p>
                  </div>
                ) : (
                  <div className="relative pl-8 border-l-2 border-blue-200 space-y-6">
                    {historyTimeline.map((h, index) => (
                      <div key={h.id} className="relative">
                        {/* Timeline Dot */}
                        <div
                          className={`absolute -left-[29px] w-3 h-3 rounded-full border-2 border-white ${
                            h.is_active ? "bg-green-500" : "bg-gray-400"
                          }`}
                        ></div>

                        {/* Timeline Card */}
                        <div
                          className={`p-4 rounded-xl border ${
                            h.is_active
                              ? "bg-green-50/50 border-green-200"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-gray-800">
                                Revision R{h.revision_no}
                              </span>
                              <span className="text-gray-400 mx-2">|</span>
                              <span className="text-xs text-gray-500">
                                {new Date(h.updated_at).toLocaleString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                h.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {h.is_active ? "ACTIVE" : "SUPERSEDED"}
                            </span>
                          </div>

                          <div className="mt-2 flex gap-3">
                            <button
                              onClick={() => activatePrintCanvas(h)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              📄 View This Revision
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print Output - Shown only during print */}
      {activePrintPayload && (
        <div className="hidden print:block bg-white">
          <QuotationPrint {...activePrintPayload} />
        </div>
      )}

      {/* Quotation Form Modal */}
      <QuotationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedQuotationForEdit(null);
        }}
        
        initialData={selectedQuotationForEdit}
        onSaveSuccess={loadDashboardData}
      />
    </div>
  );
}
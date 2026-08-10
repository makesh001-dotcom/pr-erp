import { useState, useEffect } from "react";
import SalesFormModal from "../components/SalesFormModal";
import { getSales } from "../api/salesAPI";

export default function SalesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await getSales({ limit: 100 });
      setSales(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch sales", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleCreate = () => {
    setEditSaleId(null);
    setModalOpen(true);
  };

  const handleEdit = (saleId) => {
    setEditSaleId(saleId);
    setModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setModalOpen(false);
    fetchSales();
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: "bg-yellow-100 text-yellow-800",
      POSTED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return `px-2 py-1 rounded text-xs font-bold ${styles[status] || ""}`;
  };

  const getTypeBadge = (type) => {
    const styles = {
      NORMAL_SALE: "bg-blue-100 text-blue-800",
      DEMO_TO_CUSTOMER: "bg-purple-100 text-purple-800",
      DEMO_RETURN_TO_SUPPLIER: "bg-amber-100 text-amber-800",
      FREE_OF_COST: "bg-gray-100 text-gray-800",
    };
    return `px-2 py-1 rounded text-xs font-medium ${styles[type] || "bg-gray-100"}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Outward</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Sale
        </button>
      </div>

      {/* Sales List Table */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading sales...</p>
        ) : sales.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No sales yet. Click "+ New Sale" to create one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Sales No</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Items</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sales.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-muted cursor-pointer"
                  onClick={() => s.status === "DRAFT" && handleEdit(s.id)}
                >
                  <td className="p-3 font-medium">{s.sales_no}</td>
                  <td className="p-3">{s.client_name}</td>
                  <td className="p-3">
                    <span className={getTypeBadge(s.sales_type)}>
                      {s.sales_type?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={getStatusBadge(s.status)}>{s.status}</span>
                  </td>
                  <td className="p-3 text-right font-medium">₹{s.grand_total}</td>
                  <td className="p-3 text-center">{s.items?.length || 0}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center">
                    {s.status === "DRAFT" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(s.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <SalesFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        saleId={editSaleId}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}
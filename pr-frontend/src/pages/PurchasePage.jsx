import { useState, useEffect } from "react";
import PurchaseFormModal from "../components/PurchaseFormModal";
import { getPurchases } from "../api/purchaseAPI";

export default function PurchasePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch purchases on mount and after save
  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const res = await getPurchases({ limit: 100 });
      setPurchases(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch purchases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleCreate = () => {
    setEditPurchaseId(null);
    setModalOpen(true);
  };

  const handleEdit = (purchaseId) => {
    setEditPurchaseId(purchaseId);
    setModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setModalOpen(false);
    fetchPurchases(); // Refresh the list
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: "bg-yellow-100 text-yellow-800",
      POSTED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return `px-2 py-1 rounded text-xs font-bold ${styles[status] || ""}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Purchase Inward</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Purchase
        </button>
      </div>

      {/* Purchase List Table */}
      <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading purchases...</p>
        ) : purchases.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No purchases yet. Click "+ New Purchase" to create one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Purchase No</th>
                <th className="p-3 text-left">Supplier</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Items</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-muted cursor-pointer"
                  onClick={() => p.status === "DRAFT" && handleEdit(p.id)}
                >
                  <td className="p-3 font-medium">{p.purchase_no}</td>
                  <td className="p-3">{p.supplier_name}</td>
                  <td className="p-3 text-xs">{p.purchase_type?.replace(/_/g, " ")}</td>
                  <td className="p-3 text-center">
                    <span className={getStatusBadge(p.status)}>{p.status}</span>
                  </td>
                  <td className="p-3 text-right font-medium">₹{p.grand_total}</td>
                  <td className="p-3 text-center">{p.items?.length || 0}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center">
                    {p.status === "DRAFT" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(p.id);
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
      <PurchaseFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        purchaseId={editPurchaseId}
        onSaveSuccess={handleSaveSuccess}
      />
    </div>
  );
}
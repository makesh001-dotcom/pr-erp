import { useState, useEffect } from "react";
import {
  createSupplier,
  updateSupplier,
  getSupplier,
} from "../api/supplierAPI";

export default function SupplierFormModal({
  isOpen,
  onClose,
  supplierId,
  onSaveSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  /**
 * Extracts a readable message from FastAPI errors.
 */
function getErrorMessage(error) {
  if (!error.response) {
    return error.message || "Network error. Please check your connection.";
  }

  const data = error.response.data;

  // Handles FastAPI 422 Validation Errors (array of field errors)
  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((err) => {
        // e.g., "alternate_email: value is not a valid email address"
        const field = err.loc ? err.loc[err.loc.length - 1] : "Field";
        return `${field}: ${err.msg}`;
      })
      .join("\n");
  }

  // Handles custom FastAPI 400/404 errors (e.g., HTTPException(detail="..."))
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  return "An unexpected error occurred.";
}

  const [formData, setFormData] = useState({
    company_name: "",
    gstin: "",

    address: "",
    state: "",
    pincode: "",
    person1_name: "",
    person1_phone: "",
    person1_email: "",
    person2_name: "",
    person2_phone: "",
    person2_email: "",
    alternate_phone: "",
    alternate_email: "",
    website: "",
    remarks: "",
  });
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  useEffect(() => {
    if (isOpen && supplierId) {
      fetchSupplier(supplierId);
    } else if (isOpen) {
      resetForm();
    }
  }, [isOpen, supplierId]);

  

  const fetchSupplier = async (id) => {
    try {
      setLoading(true);
      const res = await getSupplier(id);
      const s = res.data;
      setFormData({
        company_name: s.company_name || "",
        gstin: s.gstin || "",
        address: s.address || "",
        state: s.state || "",
        pincode: s.pincode || "",
        person1_name: s.person1_name || "",
        person1_phone: s.person1_phone || "",
        person1_email: s.person1_email || "",
        person2_name: s.person2_name || "",
        person2_phone: s.person2_phone || "",
        person2_email: s.person2_email || "",
        alternate_phone: s.alternate_phone || "",
        alternate_email: s.alternate_email || "",
        website: s.website || "",
        remarks: s.remarks || "",
      });
    } catch (err) {
      console.error("Failed to fetch supplier", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      gstin: "",
      address: "",
      state: "",
      pincode: "",
      person1_name: "",
      person1_phone: "",
      person1_email: "",
      person2_name: "",
      person2_phone: "",
      person2_email: "",
      alternate_phone: "",
      alternate_email: "",
      website: "",
      remarks: "",
    });
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.company_name.trim()) errs.company_name = "Company name is required";
    if (formData.gstin && formData.gstin.length !== 15) errs.gstin = "GSTIN must be 15 characters";
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) errs.pincode = "Invalid pincode";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        ...formData,
        gstin: formData.gstin?.toUpperCase() || null,
      };

      let response;
      if (supplierId) {
        response = await updateSupplier(supplierId, payload);
      } else {
        response = await createSupplier(payload);
      }

      onSaveSuccess?.(response.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
        <div className="bg-card p-8 rounded-xl shadow-xl text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading supplier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-start overflow-y-auto z-50 p-6">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-6 py-4">
          <h2 className="text-2xl font-bold">
            {supplierId ? "Edit Supplier" : "New Supplier"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-red-600 text-xl font-bold">
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Company Information */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.company_name}
                  onChange={(e) => handleChange("company_name", e.target.value)}
                  className={`w-full border rounded p-2 ${errors.company_name ? "border-red-500" : ""}`}
                  placeholder="Enter company name"
                />
                {errors.company_name && <p className="text-red-500 text-xs mt-1">{errors.company_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GSTIN</label>
                <input
                  value={formData.gstin}
                  onChange={(e) => handleChange("gstin", e.target.value.toUpperCase())}
                  className={`w-full border rounded p-2 uppercase ${errors.gstin ? "border-red-500" : ""}`}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
                {errors.gstin && <p className="text-red-500 text-xs mt-1">{errors.gstin}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <input
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="www.example.com"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Enter address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <input
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pincode</label>
                <input
                  value={formData.pincode}
                  onChange={(e) => handleChange("pincode", e.target.value.replace(/\D/g, ""))}
                  className={`w-full border rounded p-2 ${errors.pincode ? "border-red-500" : ""}`}
                  placeholder="6-digit pincode"
                  maxLength={6}
                />
                {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
              </div>
            </div>
          </div>

          {/* Primary Contact */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4">Primary Contact (Person 1)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={formData.person1_name}
                  onChange={(e) => handleChange("person1_name", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  value={formData.person1_phone}
                  onChange={(e) => handleChange("person1_phone", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.person1_email}
                  onChange={(e) => handleChange("person1_email", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Secondary Contact */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4">Secondary Contact (Person 2)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  value={formData.person2_name}
                  onChange={(e) => handleChange("person2_name", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  value={formData.person2_phone}
                  onChange={(e) => handleChange("person2_phone", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.person2_email}
                  onChange={(e) => handleChange("person2_email", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Alternate Contact */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4">Alternate Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Alternate Phone</label>
                <input
                  value={formData.alternate_phone}
                  onChange={(e) => handleChange("alternate_phone", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Alternate phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alternate Email</label>
                <input
                  type="email"
                  value={formData.alternate_email}
                  onChange={(e) => handleChange("alternate_email", e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Alternate email"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="border rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4">Additional Information</h3>
            <textarea
              rows={3}
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Any notes or remarks..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded border text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : supplierId ? "Update Supplier" : "Create Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}
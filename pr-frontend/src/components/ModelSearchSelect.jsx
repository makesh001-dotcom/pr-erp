import { useState, useEffect, useRef, useMemo } from "react";
import API from "../api/client";

export default function ModelSearchSelect({
  value,           // Currently selected model_id
  onChange,        // (modelId, modelObject) => void
  productGroupId,  // Optional: filter by group
  disabled = false,
  error = null,
  placeholder = "Search model...",
}) {
  const [search, setSearch] = useState("");
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const dropdownRef = useRef(null);

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, [productGroupId]);

  const fetchModels = async (searchQuery = "") => {
    setLoading(true);
    try {
        // Only search if there's a query, otherwise get all
        if (searchQuery && searchQuery.trim().length >= 1) {
            const params = { q: searchQuery, limit: 25 };
            if (productGroupId) params.product_group_id = productGroupId;
            const res = await API.get("/api/v1/inventory/model-search", { params });
            setModels(res.data || []);
        } else {
            // Get first 50 models for initial dropdown
            const params = { limit: 50, skip: 0 };
            if (productGroupId) params.product_group_id = productGroupId;
            const res = await API.get("/api/v1/inventory/inventory-summary", { params });
            setModels(res.data?.data || []);
        }
    } catch (err) {
        console.error("Failed to fetch models", err);
    } finally {
        setLoading(false);
    }
};

// Fetch on search change
useEffect(() => {
    const timer = setTimeout(() => {
        fetchModels(search);
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timer);
}, [search, productGroupId]);

  // Filter models by search
  // Remove useMemo filter - backend does the filtering
const filteredModels = models; // Already filtered by backend

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set initial label if value exists
  useEffect(() => {
    if (value) {
      const model = models.find((m) => m.id === parseInt(value));
      if (model) setSelectedLabel(model.model_no);
    }
  }, [value, models]);

  const handleSelect = (model) => {
    setSelectedLabel(model.model_no);
    setSearch("");
    setShowDropdown(false);
    onChange(model.id, model);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={search || selectedLabel}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedLabel("");
          setShowDropdown(true);
          if (!e.target.value) onChange(null, null);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={loading ? "Loading..." : placeholder}
        className={`w-full border rounded-lg p-2 text-sm ${error ? "border-red-500" : "border-gray-200"}`}
        disabled={disabled}
      />

      {showDropdown && filteredModels.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto mt-1">
          {filteredModels.map((m) => (
            <div
              key={m.id}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center"
              onClick={() => handleSelect(m)}
            >
              <span className="font-medium text-gray-900">{m.model_no}</span>
              <span className="text-xs text-gray-400">
                {m.current_stock !== undefined ? `Stock: ${m.current_stock}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {showDropdown && search && filteredModels.length === 0 && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 p-3 text-sm text-gray-400 text-center">
          No models found
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
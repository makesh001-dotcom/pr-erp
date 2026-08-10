// src/components/delivery/DeliveryStatusBadge.jsx

import React from "react";

export default function DeliveryStatusBadge({ status }) {
  const styles = {
    DRAFT: "bg-yellow-100 text-yellow-800 border-yellow-200",
    PRINTED: "bg-blue-100 text-blue-800 border-blue-200",
    CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };

  const icons = {
    DRAFT: "📝",
    PRINTED: "🖨️",
    CONFIRMED: "✅",
    CANCELLED: "❌",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
        styles[status] || "bg-gray-100 text-gray-600  border-border"
      }`}
    >
      <span>{icons[status] || "•"}</span>
      {status}
    </span>
  );
}
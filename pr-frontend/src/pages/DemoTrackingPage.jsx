import { useState, useEffect } from "react";
import { getDemoTracking, getDemoStats } from "../api/demoAPI";
import React from 'react';

export default function DemoTrackingPage() {
  const [demoData, setDemoData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedSerial, setExpandedSerial] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStats();
    fetchDemoData();
  }, [filter]);

  const fetchStats = async () => {
    try {
      const res = await getDemoStats();
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch demo stats", err);
    }
  };

  const fetchDemoData = async () => {
    setLoading(true);
    try {
      const res = await getDemoTracking({ demo_type: filter });
      setDemoData(res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch demo data", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      DEMO_FROM_SUPPLIER: "bg-purple-100 text-purple-800 border-purple-300",
      DEMO_WITH_CUSTOMER: "bg-blue-100 text-blue-800 border-blue-300",
      DEMO_RETURNED_BY_CUSTOMER: "bg-green-100 text-green-800 border-green-300",
      RETURNED_TO_SUPPLIER: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status) => {
    const labels = {
      DEMO_FROM_SUPPLIER: "From Supplier",
      DEMO_WITH_CUSTOMER: "With Customer",
      DEMO_RETURNED_BY_CUSTOMER: "Returned by Customer",
      RETURNED_TO_SUPPLIER: "Returned to Supplier",
    };
    return labels[status] || status;
  };

  const getDueBadge = (days, isOverdue) => {
    if (isOverdue) {
      return "bg-red-100 text-red-800 font-bold";
    } else if (days !== null && days <= 7) {
      return "bg-amber-100 text-amber-800 font-bold";
    } else if (days !== null) {
      return "bg-green-100 text-green-800";
    }
    return "bg-gray-100 text-gray-500";
  };

  const getDueLabel = (days, isOverdue) => {
    if (days === null) return "No deadline";
    if (isOverdue) return `⚠ ${Math.abs(days)} days overdue!`;
    if (days === 0) return "Due today!";
    if (days === 1) return "Due tomorrow";
    return `${days} days remaining`;
  };

  const filteredData = demoData.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.serial_number?.toLowerCase().includes(q) ||
      item.model_no?.toLowerCase().includes(q) ||
      item.purchase?.supplier_name?.toLowerCase().includes(q) ||
      item.sales?.client_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track demo units across suppliers and customers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon="📦"
            label="Total Demos"
            value={stats.total_demo_units}
            color="indigo"
          />
          <StatCard
            icon="🏢"
            label="From Suppliers"
            value={stats.from_suppliers}
            color="purple"
          />
          <StatCard
            icon="👥"
            label="With Customers"
            value={stats.with_customers}
            color="blue"
          />
          <StatCard
            icon="🟡"
            label="Due Soon"
            value={stats.due_soon}
            color="amber"
          />
          <StatCard
            icon="🔴"
            label="Overdue"
            value={stats.overdue}
            color="red"
            highlight={stats.overdue > 0}
          />
        </div>
      )}

      {/* Filters + Search */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All Demos", icon: "📋" },
              { key: "from_supplier", label: "From Supplier", icon: "🏢" },
              { key: "with_customer", label: "With Customer", icon: "👥" },
              { key: "overdue", label: "Overdue", icon: "🔴" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search serial, model, party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">From (Supplier)</th>
                <th className="px-4 py-3">To (Customer)</th>
                <th className="px-4 py-3 text-center">Return Due</th>
                <th className="px-4 py-3 text-center w-20">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    Loading demo tracking data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    {filter === "overdue"
                      ? "🎉 No overdue demos! All units are on track."
                      : "No demo units found."}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <React.Fragment key={item.id || item.serial_number}>
                    <tr
                      onClick={() =>
                        setExpandedSerial(
                          expandedSerial === item.serial_number ? null : item.serial_number
                        )
                      }
                      className={`hover:bg-gray-50/50 transition cursor-pointer ${
                        item.is_overdue ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-gray-900">
                          {item.serial_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{item.model_no}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                            item.current_status
                          )}`}
                        >
                          {getStatusLabel(item.current_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.purchase ? (
                          <>
                            <div className="font-medium text-gray-700">
                              {item.purchase.supplier_name}
                            </div>
                            <div className="text-gray-400">{item.purchase.purchase_no}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.sales ? (
                          <>
                            <div className="font-medium text-gray-700">
                              {item.sales.client_name}
                            </div>
                            <div className="text-gray-400">{item.sales.sales_no}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">
                            {item.current_status === "DEMO_FROM_SUPPLIER"
                              ? "In stock"
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDueBadge(
                            item.days_remaining,
                            item.is_overdue
                          )}`}
                        >
                          {getDueLabel(item.days_remaining, item.is_overdue)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-lg transition-transform ${
                            expandedSerial === item.serial_number ? "rotate-90" : ""
                          }`}
                        >
                          ▶
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Lifecycle */}
                    {expandedSerial === item.serial_number && (
                      <tr key={`exp-${item.serial_number}`}>
                        <td colSpan={7} className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                          <div className="space-y-3">
                            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                              📜 Lifecycle Timeline
                            </h4>
                            <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4">
                              {item.lifecycle?.map((event, i) => (
                                <div key={i} className="relative">
                                  <div
                                    className={`absolute -left-[25px] w-3 h-3 rounded-full border-2 border-white ${
                                      event.type === "inward"
                                        ? "bg-green-500"
                                        : "bg-blue-500"
                                    }`}
                                  ></div>
                                  <div className="text-xs">
                                    <div className="font-semibold text-gray-700">
                                      {event.event}
                                    </div>
                                    <div className="text-gray-500">
                                      {event.party} • {event.reference}
                                    </div>
                                    <div className="text-gray-400 text-[11px]">
                                      {new Date(event.date).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {item.current_status === "DEMO_WITH_CUSTOMER" &&
                                item.expected_return_date && (
                                  <div className="relative">
                                    <div className="absolute -left-[25px] w-3 h-3 rounded-full border-2 border-white bg-amber-500"></div>
                                    <div className="text-xs">
                                      <div className="font-semibold text-amber-700">
                                        Expected Return
                                      </div>
                                      <div className="text-gray-500">
                                        {new Date(item.expected_return_date).toLocaleDateString(
                                          "en-IN",
                                          { day: "numeric", month: "short", year: "numeric" }
                                        )}
                                      </div>
                                    </div>
                                  </div>
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
    </div>
  );
}

// ================================
// STAT CARD COMPONENT
// ================================
const StatCard = ({ icon, label, value, color, highlight }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div
      className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
        highlight ? "border-red-300 ring-2 ring-red-100" : "border-gray-100"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-gray-900"}`}>
            {value}
          </p>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
};
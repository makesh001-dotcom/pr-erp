// src/pages/DemoTrackingPage.jsx — Complete Rewrite

import React, { useState, useEffect } from "react";
import { getDemoTracking, getDemoStats } from "../api/demoAPI";

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

  // ================================
  // BADGE HELPERS
  // ================================
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

  const getSourceBadge = (source) => {
    const styles = {
      purchase: "bg-purple-50 text-purple-700",
      sales: "bg-blue-50 text-blue-700",
      delivery_challan: "bg-orange-50 text-orange-700",
      unknown: "bg-muted text-gray-600",
    };
    const labels = {
      purchase: "Purchase",
      sales: "Sales",
      delivery_challan: "DC",
      unknown: "—",
    };
    return { style: styles[source] || styles.unknown, label: labels[source] || source };
  };

  const getDueBadge = (days, isOverdue, isDueSoon) => {
    if (isOverdue) return "bg-red-100 text-red-800 font-bold";
    if (isDueSoon) return "bg-amber-100 text-amber-800 font-bold";
    if (days !== null) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-muted-foreground";
  };

  const getDueLabel = (days, isOverdue, isDueSoon) => {
    if (days === null) return "No deadline";
    if (isOverdue) return `⚠ ${Math.abs(days)}d overdue`;
    if (isDueSoon && days === 0) return "Due today";
    if (isDueSoon) return `${days}d left`;
    return `${days}d remaining`;
  };

  const getDCStatusBadge = (status) => {
    const styles = {
      DRAFT: "bg-yellow-100 text-yellow-700",
      PRINTED: "bg-blue-100 text-blue-700",
      CONFIRMED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
      COMPLETED: "bg-gray-100 text-gray-600",
    };
    return styles[status] || "bg-gray-100 text-gray-600";
  };

  // ================================
  // FILTER
  // ================================
  const filteredData = demoData.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.serial_number?.toLowerCase().includes(q) ||
      item.model_no?.toLowerCase().includes(q) ||
      item.supplier?.toLowerCase().includes(q) ||
      item.customer?.toLowerCase().includes(q)
    );
  });

  // ================================
  // RENDER
  // ================================
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demo Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track demo units across suppliers, customers, and delivery challans
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard icon="📦" label="Total Demos" value={stats.total_demo_units} color="indigo" />
          <StatCard icon="🏢" label="From Suppliers" value={stats.from_suppliers} color="purple" />
          <StatCard icon="👥" label="With Customers" value={stats.with_customers} color="blue" />
          <StatCard icon="🟡" label="Due Soon" value={stats.due_soon} color="amber" />
          <StatCard icon="🔴" label="Overdue" value={stats.overdue} color="red" highlight={stats.overdue > 0} />
          <StatCard icon="📄" label="Pending DC" value={stats.missing_dc || 0} color="red" highlight={(stats.missing_dc || 0) > 0} />
        </div>
      )}

      {/* Filters + Search */}
      <div className="bg-card rounded-2xl border  border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All Demos", icon: "📋" },
              { key: "from_supplier", label: "From Supplier", icon: "🏢" },
              { key: "with_customer", label: "With Customer", icon: "👥" },
              { key: "overdue", label: "Overdue", icon: "🔴" },
              { key: "missing_dc", label: "Missing DC", icon: "📄" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === f.key
                    ? "bg-primary-600 text-white shadow-sm"
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
            className="w-full sm:w-64 px-4 py-2 border  border-border rounded-xl text-sm outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border  border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b  border-border text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Serial Number</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">From / To</th>
                <th className="px-4 py-3">DC Links</th>
                <th className="px-4 py-3 text-center">Return Due</th>
                <th className="px-4 py-3 text-center w-12">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    Loading demo tracking data...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    {filter === "overdue"
                      ? "🎉 No overdue demos!"
                      : filter === "missing_dc"
                      ? "✅ All demos have DC documentation."
                      : "No demo units found."}
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const sourceInfo = getSourceBadge(item.source);
                  
                  return (
                    <React.Fragment key={item.id || item.serial_number}>
                      <tr
                        onClick={() =>
                          setExpandedSerial(
                            expandedSerial === item.serial_number ? null : item.serial_number
                          )
                        }
                        className={`hover:bg-muted/50 transition cursor-pointer ${
                          item.is_overdue ? "bg-red-50/30" : ""
                        } ${item.has_missing_dc ? "border-l-4 border-l-amber-400" : ""}`}
                      >
                        {/* Serial */}
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-foreground">
                            {item.serial_number}
                          </span>
                          {item.has_missing_dc && (
                            <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                              Missing DC
                            </span>
                          )}
                        </td>
                        
                        {/* Model */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{item.model_no}</div>
                          {item.description && (
                            <div className="text-xs text-gray-400 truncate max-w-[150px]">
                              {item.description}
                            </div>
                          )}
                        </td>
                        
                        {/* Source */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${sourceInfo.style}`}>
                            {sourceInfo.label}
                          </span>
                        </td>
                        
                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(item.current_status)}`}>
                            {getStatusLabel(item.current_status)}
                          </span>
                        </td>
                        
                        {/* From/To Party */}
                        <td className="px-4 py-3 text-xs">
                          {item.supplier && (
                            <div className="text-purple-700">
                              ← {item.supplier}
                              <div className="text-gray-400 text-[10px]">{item.supplier_ref}</div>
                            </div>
                          )}
                          {item.customer && (
                            <div className="text-blue-700 mt-0.5">
                              → {item.customer}
                              <div className="text-gray-400 text-[10px]">{item.customer_ref}</div>
                            </div>
                          )}
                          {!item.supplier && !item.customer && (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        
                        {/* DC Links */}
                        <td className="px-4 py-3 text-xs">
                          {item.dc_links && item.dc_links.length > 0 ? (
                            <div className="space-y-1">
                              {item.dc_links.map((dc, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    dc.direction === "OUT" ? "bg-orange-500" : "bg-teal-500"
                                  }`}></span>
                                  <span className="font-mono text-[10px] font-medium">{dc.dc_no}</span>
                                  <span className={`px-1 py-0.5 rounded text-[9px] font-semibold ${getDCStatusBadge(dc.dc_status)}`}>
                                    {dc.dc_status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        
                        {/* Return Due */}
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getDueBadge(item.days_remaining, item.is_overdue, item.is_due_soon)}`}>
                            {getDueLabel(item.days_remaining, item.is_overdue, item.is_due_soon)}
                          </span>
                        </td>
                        
                        {/* Expand Toggle */}
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block text-xs transition-transform duration-200 ${
                            expandedSerial === item.serial_number ? "rotate-90" : ""
                          }`}>
                            ▶
                          </span>
                        </td>
                      </tr>

                      {/* Expanded Lifecycle */}
                      {expandedSerial === item.serial_number && (
                        <tr>
                          <td colSpan={8} className="bg-muted px-6 py-4 border-b  border-border">
                            <div className="space-y-3">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                📜 Lifecycle Timeline
                              </h4>
                              <div className="relative pl-6 border-l-2 border-indigo-200 space-y-4">
                                {item.lifecycle?.map((event, i) => {
                                  let dotColor = "bg-green-500";
                                  if (event.source === "delivery_challan") {
                                    dotColor = event.type === "outward" ? "bg-orange-500" : "bg-teal-500";
                                  } else if (event.source === "sales") {
                                    dotColor = "bg-blue-500";
                                  }

                                  return (
                                    <div key={i} className="relative">
                                      <div className={`absolute -left-[25px] w-3 h-3 rounded-full border-2 border-white ${dotColor}`}></div>
                                      <div className="text-xs">
                                        <div className="font-semibold text-gray-700 flex items-center gap-1.5 flex-wrap">
                                          {event.event}
                                          {event.source === "delivery_challan" && (
                                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded font-medium">
                                              DC
                                            </span>
                                          )}
                                          {event.source === "purchase" && (
                                            <span className="text-[10px] bg-purple-100 text-purple-600 px-1 rounded font-medium">
                                              Purchase
                                            </span>
                                          )}
                                          {event.source === "sales" && (
                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1 rounded font-medium">
                                              Sales
                                            </span>
                                          )}
                                          {event.dc_status && (
                                            <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${getDCStatusBadge(event.dc_status)}`}>
                                              {event.dc_status}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-muted-foreground">
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
                                  );
                                })}

                                {/* Expected Return Marker */}
                                {item.current_status === "DEMO_WITH_CUSTOMER" && item.expected_return_date && (
                                  <div className="relative">
                                    <div className="absolute -left-[25px] w-3 h-3 rounded-full border-2 border-white bg-amber-500"></div>
                                    <div className="text-xs">
                                      <div className="font-semibold text-amber-700">Expected Return</div>
                                      <div className="text-muted-foreground">
                                        {new Date(item.expected_return_date).toLocaleDateString("en-IN", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                        })}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ================================
// STAT CARD
// ================================
const StatCard = ({ icon, label, value, color, highlight }) => {
  const colorMap = {
    indigo: "bg-primary-50 text-primary-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className={`bg-card rounded-2xl border p-5 shadow-sm transition ${
      highlight ? "border-red-300 ring-2 ring-red-100" : "border-gray-100"
    }`}>
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${colorMap[color]} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-foreground"}`}>
            {value}
          </p>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        </div>
      </div>
    </div>
  );
};
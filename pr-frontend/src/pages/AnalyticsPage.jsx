import { useState, useEffect } from "react";
import {
  getDashboardStats,
  getMonthlyTrend,
  getSalesByType,
  getTopProducts,
  getLowStockAlerts,
} from "../api/analyticsAPI";

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [salesByType, setSalesByType] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes, typeRes, topRes, stockRes] = await Promise.all([
        getDashboardStats(),
        getMonthlyTrend(6),
        getSalesByType(),
        getTopProducts(10),
        getLowStockAlerts(5),
      ]);
      setStats(statsRes?.data || null);
      setTrend(trendRes?.data || []);
      setSalesByType(typeRes?.data || []);
      setTopProducts(topRes?.data || []);
      setLowStock(stockRes?.data || []);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

  const maxTrendValue = Math.max(
    ...trend.map((t) => Math.max(t.purchases || 0, t.sales || 0)),
    1
  );

  if (loading) {
    return (
      <div className="p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-slate-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-sm font-medium text-slate-500 tracking-wide">Loading system data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics & Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time business intelligence and operational performance metrics.</p>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />}
            label="Purchases (MTD)"
            value={formatCurrency(stats.monthly_purchases)}
            sub={`${stats.units_purchased?.toLocaleString() || 0} units collected`}
            borderColor="border-l-blue-600"
            iconColor="text-blue-600 bg-blue-50"
          />
          <KPICard
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />}
            label="Sales (MTD)"
            value={formatCurrency(stats.monthly_sales)}
            sub={`${stats.units_sold?.toLocaleString() || 0} units dispatch`}
            borderColor="border-l-emerald-600"
            iconColor="text-emerald-600 bg-emerald-50"
          />
          <KPICard
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />}
            label="Stock Valuation"
            value={formatCurrency(stats.stock_value)}
            sub={`${stats.low_stock_items} alerts flagged`}
            borderColor="border-l-amber-500"
            iconColor="text-amber-600 bg-amber-50"
          />
          <KPICard
            icon={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
            label="Pending Pipeline"
            value={`${(stats.pending_purchases || 0) + (stats.pending_sales || 0)}`}
            sub={`${stats.pending_purchases} PO | ${stats.pending_sales} SO`}
            borderColor="border-l-purple-600"
            iconColor="text-purple-600 bg-purple-50"
          />
        </div>
      )}

      {/* Monthly Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Performance Trend</h2>
          <div className="flex gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Purchases</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Sales</span>
          </div>
        </div>
        <div className="space-y-4">
          {trend.map((t) => (
            <div key={`${t.month}-${t.year}`} className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-500 w-12 uppercase">{t.month}</span>
              <div className="flex-1 space-y-1.5">
                {/* Purchases Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-md h-5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2 min-w-[4px]"
                      style={{ width: `${((t.purchases || 0) / maxTrendValue) * 100}%` }}
                    >
                      {t.purchases > maxTrendValue * 0.25 && (
                        <span className="text-[10px] text-white font-semibold">
                          {formatCurrency(t.purchases)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Sales Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-md h-5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2 min-w-[4px]"
                      style={{ width: `${((t.sales || 0) / maxTrendValue) * 100}%` }}
                    >
                      {t.sales > maxTrendValue * 0.25 && (
                        <span className="text-[10px] text-white font-semibold">
                          {formatCurrency(t.sales)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Type */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight mb-5">Sales Segment Distribution</h2>
          <div className="divide-y divide-slate-100">
            {salesByType.map((item) => (
              <div key={item.type} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                  <span className="text-sm text-slate-600 truncate capitalize">{item.type?.replace(/_/g, " ")}</span>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <span className="text-sm font-semibold text-slate-900">{item.count} orders</span>
                  <span className="text-xs font-medium text-slate-400 ml-3">{formatCurrency(item.total)}</span>
                </div>
              </div>
            ))}
            {salesByType.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">No segment allocations recorded.</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 tracking-tight mb-5">Top Performing Products</h2>
          <div className="divide-y divide-slate-100">
            {topProducts.map((p, i) => (
              <div key={p.model_id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-200 text-slate-600"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.model_no}</p>
                    <p className="text-xs text-slate-400 truncate">Available Stock: {p.current_stock}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md ml-4 shrink-0">
                  {p.units_sold} sold
                </span>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-6">No modern transactions this period.</p>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-red-900 tracking-tight mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-red-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          Critical Inventory Alerts
          <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
            {lowStock.length} items risk
          </span>
        </h2>
        {lowStock.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
            <span>✓ All inventory units are operating within safe baseline capacities.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map((item) => (
              <div key={item.model_id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-100 min-w-0">
                <span className="font-medium text-slate-800 text-sm truncate pr-2">{item.model_no}</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 ${
                  item.current_stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                }`}>
                  {item.current_stock} left
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ================================
// COMPONENT: KPI CARD
// ================================
function KPICard({ icon, label, value, sub, borderColor, iconColor }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 border-l-4 ${borderColor} flex flex-col justify-between min-w-0`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
          <span className={`p-1.5 rounded-lg shrink-0 ${iconColor}`}>
            <svg xmlns="http://www.w3.org/w3.org/w3.org/w3.org/w3.org/w3.org/w4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              {icon}
            </svg>
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight text-slate-900 truncate" title={value}>{value}</p>
      </div>
      {sub && <p className="text-xs font-medium text-slate-400 mt-2 truncate">{sub}</p>}
    </div>
  );
}
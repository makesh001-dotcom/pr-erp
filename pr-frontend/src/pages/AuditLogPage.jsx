import { useState, useEffect } from "react";
import { getAuditLogs, getAuditStats } from "../api/auditAPI";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    module: "",
    search: "",
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        skip: (page - 1) * 50,
        limit: 50,
        action: filters.action || undefined,
        module: filters.module || undefined,
        search: filters.search || undefined,
      };
      const res = await getAuditLogs(params);
      setLogs(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getAuditStats();
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const getActionBadge = (action) => {
    const styles = {
      CREATE: "bg-green-100 text-green-800",
      UPDATE: "bg-blue-100 text-blue-800",
      DELETE: "bg-red-100 text-red-800",
      POST: "bg-purple-100 text-purple-800",
      CANCEL: "bg-gray-100 text-gray-800",
      REACTIVATE: "bg-emerald-100 text-emerald-800",
      LOGIN: "bg-indigo-100 text-indigo-800",
      LOGOUT: "bg-amber-100 text-amber-800",
    };
    return styles[action] || "bg-gray-100 text-gray-600";
  };

  const getModuleIcon = (module) => {
    const icons = {
      PURCHASE: "📥",
      SALES: "📤",
      CLIENT: "👥",
      SUPPLIER: "🏢",
      MODEL: "📦",
      QUOTATION: "🧾",
      INVENTORY: "🏪",
    };
    return icons[module] || "📋";
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all system activities and changes
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{stats.total_today}</p>
            <p className="text-xs text-gray-500">Actions Today</p>
          </div>
          {stats.by_action?.slice(0, 3).map((a) => (
            <div key={a.action} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{a.count}</p>
              <p className="text-xs text-gray-500">{a.action}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search logs..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
            className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400"
          />
          <select
            value={filters.action}
            onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="POST">POST</option>
            <option value="CANCEL">CANCEL</option>
          </select>
          <select
            value={filters.module}
            onChange={(e) => { setFilters({ ...filters, module: e.target.value }); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All Modules</option>
            <option value="PURCHASE">Purchase</option>
            <option value="SALES">Sales</option>
            <option value="CLIENT">Client</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="MODEL">Model</option>
            <option value="QUOTATION">Quotation</option>
          </select>
          <button
            onClick={() => { setFilters({ action: "", module: "", search: "" }); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 w-40">Date/Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-gray-400">
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">
                      {log.username}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {getModuleIcon(log.module)} {log.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.description || log.record_no || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30">← Prev</button>
          <span className="px-3 py-1 text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}
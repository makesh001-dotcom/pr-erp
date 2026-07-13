import axios from "axios";

// ================================
// Purchase CRUD
// ================================
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


export const getAuditLogs = (params = {}) =>
  API.get("/api/v1/audit-logs/", { params });

export const getAuditStats = () =>
  API.get("/api/v1/audit-logs/stats");
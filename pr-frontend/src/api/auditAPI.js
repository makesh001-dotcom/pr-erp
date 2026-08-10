import axios from "axios";

// ================================
// Purchase CRUD
// ================================
import API from "../api/client";


export const getAuditLogs = (params = {}) =>
  API.get("/api/v1/audit-logs/", { params });

export const getAuditStats = () =>
  API.get("/api/v1/audit-logs/stats");
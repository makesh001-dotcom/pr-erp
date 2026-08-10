import axios from "axios";


import API from "../api/client";

export const getDashboardStats = () =>
  API.get("/api/v1/analytics/stats");

export const getMonthlyTrend = (months = 6) =>
  API.get("/api/v1/analytics/monthly-trend", { params: { months } });

export const getSalesByType = () =>
  API.get("/api/v1/analytics/sales-by-type");

export const getTopProducts = (limit = 10) =>
  API.get("/api/v1/analytics/top-products", { params: { limit } });

export const getLowStockAlerts = (threshold = 5) =>
  API.get("/api/v1/analytics/low-stock", { params: { threshold } });
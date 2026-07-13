import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export const getDemoTracking = (params = {}) =>
  API.get("/api/v1/demo-tracking/", { params });

export const getDemoStats = () =>
  API.get("/api/v1/demo-tracking/stats");
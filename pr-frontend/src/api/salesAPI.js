import axios from "axios";


import API from "../api/client";

// ================================
// Sales CRUD
// ================================

export const getSales = (params = {}) =>
  API.get("/api/v1/sales/", { params });

export const getSale = (saleId) =>
  API.get(`/api/v1/sales/${saleId}`);

export const createSale = (data) =>
  API.post("/api/v1/sales/", data);

export const updateSale = (saleId, data) =>
  API.put(`/api/v1/sales/${saleId}`, data);

export const postSale = (saleId) =>
  API.post(`/api/v1/sales/${saleId}/post`);

export const cancelSale = (saleId) =>
  API.post(`/api/v1/sales/${saleId}/cancel`);
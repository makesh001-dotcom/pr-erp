import axios from "axios";


import API from "../api/client";
// ================================
// Sales CRUD
// ================================

export const getSuppliers = (params = {}) =>
  API.get("/api/v1/suppliers/", { params });

export const getSupplier = (supplierId) =>
  API.get(`/api/v1/suppliers/${supplierId}`);

export const getSupplierByCode = (supplierCode) =>
  API.get(`/api/v1/suppliers/code/${supplierCode}`);

export const createSupplier = (data) =>
  API.post("/api/v1/suppliers/", data);

export const updateSupplier = (supplierId, data) =>
  API.put(`/api/v1/suppliers/${supplierId}`, data);

export const deactivateSupplier = (supplierId) =>
  API.delete(`/api/v1/suppliers/${supplierId}`);

export const reactivateSupplier = (supplierId) =>
  API.put(`/api/v1/suppliers/${supplierId}/reactivate`);
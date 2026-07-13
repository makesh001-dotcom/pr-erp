import axios from "axios";

// ================================
// Purchase CRUD
// ================================
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


export const getPurchases = (params = {}) =>
  API.get("/api/v1/purchases/", { params });

export const getPurchase = (purchaseId) =>
  API.get(`/api/v1/purchases/${purchaseId}`);

export const createPurchase = (data) =>
  API.post("/api/v1/purchases/", data);

export const updatePurchase = (purchaseId, data) =>
  API.put(`/api/v1/purchases/${purchaseId}`, data);

export const cancelPurchase = (purchaseId) =>
  API.post(`/api/v1/purchases/${purchaseId}/cancel`); // ⭐ POST, not DELETE


// ================================
// Workflow Actions
// ================================

export const postPurchase = (purchaseId) =>
  API.post(`/api/v1/purchases/${purchaseId}/post`);


// ================================
// Future Expansion
// ================================

// export const printPurchase = (purchaseId) =>
//     API.get(`/api/v1/purchases/${purchaseId}/print`);

// export const exportPurchasePDF = (purchaseId) =>
//     API.get(`/api/v1/purchases/${purchaseId}/pdf`);

// export const getPurchaseHistory = (purchaseId) =>
//     API.get(`/api/v1/purchases/${purchaseId}/history`);

export default API;
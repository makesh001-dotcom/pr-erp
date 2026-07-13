import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProductGroups = (params) => 
  API.get("/product-groups/", { params });

export const getGroupsByManufacturer = (mfrId) => 
  API.get(`/product-groups/by-manufacturer/${mfrId}`);

export const createProductGroup = (data) => 
  API.post("/product-groups/", data);

export const updateProductGroup = (id, data) => 
  API.put(`/product-groups/${id}`, data);

export const deleteProductGroup = (id) => 
  API.delete(`/product-groups/${id}`);

export default API;
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

/**
 * Manufacturer Endpoints
 * Note: URLs are lowercase to match the FastAPI prefix "/manufacturers"
 */

// params includes skip, limit, sort_by, and order
export const getManufacturers = (params) => 
  API.get("/manufacturers/", { params });

export const createManufacturer = (data) => 
  API.post("/manufacturers/", data);

export const updateManufacturer = (id, data) => 
  API.put(`/manufacturers/${id}`, data);

export const deleteManufacturer = (id) => 
  API.delete(`/manufacturers/${id}`);

// Special route for searching
export const searchManufacturer = (query) => 
  API.get(`/manufacturers/search?q=${query}`);

export default API;
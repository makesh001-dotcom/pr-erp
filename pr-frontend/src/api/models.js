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


export const getModels = (params) => 
  API.get("/models/", { params });

export const createModel = (data) => 
  API.post("/models/", data);

export const updateModel = (id, data) => 
  API.put(`/models/${id}`, data);

export const deleteModel = (id) => 
  API.delete(`/models/${id}`);

export const searchModels = (query) => 
  API.get(`/models/search/?q=${query}`);


export default API;
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
console.log("AXIOS BASE URL =", API.defaults.baseURL);


API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// ================================
// Client CRUD
// ================================

export const getClients = (params = {}) =>
  API.get("/clients/", { params });

export const getClient = (clientId) =>
  API.get(`/clients/${clientId}`);

export const createClient = (data) =>
  API.post("/clients/", data);

export const updateClient = (clientId, data) =>
  API.put(`/clients/${clientId}`, data);

export const deactivateClient = (clientId) =>
  API.delete(`/clients/${clientId}`);

export const reactivateClient = (clientId) =>
  API.put(`/clients/${clientId}/reactivate`);

// Matches: API.post("/auth/login") inside AuthProvider
export const loginAPI = (data) => API.post("/auth/login", data);

// Matches: API.get("/auth/me") inside AuthProvider
export const getCurrentUserAPI = () => API.get("/auth/me");


export default API;
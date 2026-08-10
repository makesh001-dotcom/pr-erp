import axios from "axios";

import API from "../api/client";

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
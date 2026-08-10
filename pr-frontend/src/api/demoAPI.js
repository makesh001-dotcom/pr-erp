import axios from "axios";

import API from "../api/client";

export const getDemoTracking = (params = {}) =>
  API.get("/api/v1/demo-tracking/", { params });

export const getDemoStats = () =>
  API.get("/api/v1/demo-tracking/stats");
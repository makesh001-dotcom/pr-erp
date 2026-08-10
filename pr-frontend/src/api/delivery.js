// src/api/delivery.js
import API from "./client";

// ================================
// DELIVERY CHALLAN API SERVICE
// ================================

/**
 * List delivery challans with filters and pagination
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.search - Search in challan_no, client, reference
 * @param {string} params.status - Filter by status (DRAFT/PRINTED/CONFIRMED/CANCELLED)
 * @param {string} params.dc_type - Filter by DC type
 * @param {number} params.client_id - Filter by client
 * @param {string} params.reference_no - Filter by reference number
 * @param {string} params.from_date - From date filter
 * @param {string} params.to_date - To date filter
 * @param {string} params.sort_by - Sort field (default: created_at)
 * @param {string} params.sort_order - Sort direction (asc/desc)
 */
export const getDeliveryChallans = async (params = {}) => {
  const response = await API.get("/api/v1/delivery/", { params });
  return response.data;
};

/**
 * Get single delivery challan by ID
 * @param {number} challanId
 */
export const getDeliveryChallan = async (challanId) => {
  const response = await API.get(`/api/v1/delivery/${challanId}`);
  return response.data;
};

/**
 * Create new delivery challan (Draft)
 * @param {Object} data - Challan payload
 * @param {number} data.client_id
 * @param {string} data.reference_no
 * @param {string} data.dc_type
 * @param {string} data.delivery_date
 * @param {string} data.expected_return_date
 * @param {string} data.remarks
 * @param {Array} data.items - Line items
 */
export const createDeliveryChallan = async (data) => {
  const response = await API.post("/api/v1/delivery/", data);
  return response.data;
};

/**
 * Update delivery challan
 * @param {number} challanId
 * @param {Object} data - Updated fields
 */
export const updateDeliveryChallan = async (challanId, data) => {
  const response = await API.put(`/api/v1/delivery/${challanId}`, data);
  return response.data;
};

/**
 * Confirm delivery challan (triggers inventory OUTWARD)
 * @param {number} challanId
 * @param {Object} data - Optional { remarks: string }
 */
export const confirmDeliveryChallan = async (challanId, data = {}) => {
  const response = await API.post(`/api/v1/delivery/${challanId}/confirm`, data);
  return response.data;
};

/**
 * Cancel delivery challan (triggers inventory INWARD restoration)
 * @param {number} challanId
 * @param {Object} data - { reason: string }
 */
export const cancelDeliveryChallan = async (challanId, data = {}) => {
  const response = await API.post(`/api/v1/delivery/${challanId}/cancel`, data);
  return response.data;
};

/**
 * Soft delete delivery challan
 * @param {number} challanId
 */
export const deleteDeliveryChallan = async (challanId) => {
  const response = await API.delete(`/api/v1/delivery/${challanId}`);
  return response.data;
};

/**
 * Get all challans by reference number (for tracking partial deliveries)
 * @param {string} referenceNo
 */
export const getChallansByReference = async (referenceNo) => {
  const response = await API.get(`/api/v1/delivery/by-reference/${referenceNo}`);
  return response.data;
};

/**
 * Get pending deliveries (DRAFT or PRINTED)
 * @param {Object} params - Optional { client_id: number }
 */
export const getPendingDeliveries = async (params = {}) => {
  const response = await API.get("/api/v1/delivery/dashboard/pending", { params });
  return response.data;
};

/**
 * Record partial or full return of items
 * @param {number} challanId
 * @param {Array} items - [{ id: number, quantity_returned: number }]
 */
export const recordReturn = async (challanId, items) => {
  const response = await API.post(`/api/v1/delivery/${challanId}/return`, { items });
  return response.data;
};

/**
 * Get overdue and long-pending challans
 * @param {number} days - Threshold in days (default 180)
 */
export const getOverdueDeliveries = async (days = 180) => {
  const response = await API.get("/api/v1/delivery/dashboard/overdue", { params: { days } });
  return response.data;
};

/**
 * Get pending returns summary for dashboard
 */
export const getReturnsSummary = async () => {
  const response = await API.get("/api/v1/delivery/dashboard/returns-summary");
  return response.data;
};
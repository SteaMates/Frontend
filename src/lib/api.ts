import axios from 'axios';

// In development, Vite proxy handles /api → backend
// In production, use VITE_API_URL to point to the deployed backend
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
export { API_URL };

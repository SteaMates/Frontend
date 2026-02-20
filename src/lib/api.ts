import axios from 'axios';

// In development, Vite proxy handles /api → backend
// In production, Vercel rewrites handle /api → backend
const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

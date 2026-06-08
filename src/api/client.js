// Authentication has been removed — no Authorization header is attached,
// and 401 responses are not redirected anywhere.
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

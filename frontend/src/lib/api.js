export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:8000'
    : 'https://revaudit-backend.onrender.com')
).replace(/\/$/, '');

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export const fetchOptions = {
  credentials: 'include',
};

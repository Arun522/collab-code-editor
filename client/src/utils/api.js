const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Rooms
  createRoom: (body) => request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  getRooms: () => request('/rooms'),
  getRoom: (slug) => request(`/rooms/${slug}`),
  updateRoom: (slug, body) => request(`/rooms/${slug}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRoom: (slug) => request(`/rooms/${slug}`, { method: 'DELETE' }),

  // Snapshots
  saveSnapshot: (slug, label) =>
    request(`/rooms/${slug}/snapshots`, { method: 'POST', body: JSON.stringify({ label }) }),
  getSnapshots: (slug) => request(`/rooms/${slug}/snapshots`),

  // Execute
  executeCode: (code, language) =>
    request('/execute', { method: 'POST', body: JSON.stringify({ code, language }) }),
};

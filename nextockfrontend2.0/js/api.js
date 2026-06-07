// Cliente HTTP (fetch) hacia el backend NestJS.
const API_BASE = 'http://localhost:3000/api';

const Auth = {
  get token() { return localStorage.getItem('nx_token'); },
  set token(t) { localStorage.setItem('nx_token', t); },
  get usuario() { return JSON.parse(localStorage.getItem('nx_user') || 'null'); },
  set usuario(u) { localStorage.setItem('nx_user', JSON.stringify(u)); },
  logout() { localStorage.removeItem('nx_token'); localStorage.removeItem('nx_user'); },
};

async function api(path, { method = 'GET', body = null, form = null } = {}) {
  const headers = {};
  if (Auth.token) headers['Authorization'] = 'Bearer ' + Auth.token;

  let payload;
  if (form) {
    payload = form; // FormData: el navegador pone el Content-Type
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(msg || `Error ${res.status}`);
  }
  return data;
}

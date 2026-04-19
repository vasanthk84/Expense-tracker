/**
 * client.js — base HTTP client.
 *
 * In local dev, VITE_API_BASE is empty so requests go to /api/* (proxied by Vite).
 * In production, VITE_API_BASE = https://your-api.vercel.app so calls go cross-origin.
 */

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status  = status;
    this.details = details;
  }
}

// Set VITE_API_BASE in the API project's Vercel env vars.
// Leave it empty / unset for local dev — Vite proxy handles it.
const BASE = import.meta.env.VITE_API_BASE || '';

const RETRY_DELAYS = [150, 400]; // ms — covers the ~200ms node --watch restart window

async function request(method, path, body, attempt = 0) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, opts);
  } catch (networkErr) {
    // Retry on transient connection resets (ECONNRESET during server restarts)
    if (attempt < RETRY_DELAYS.length) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      return request(method, path, body, attempt + 1);
    }
    throw new ApiError('Network error — is the server running?', 0, networkErr);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      data?.message || data?.error || `Request failed (${res.status})`,
      res.status,
      data?.details
    );
  }

  return data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path)
};

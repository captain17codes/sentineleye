import { handleMockRequest } from './mockData';

const rawBase = import.meta.env.VITE_API_URL?.trim();
const BASE = rawBase
  ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`)
  : '/api';

// The Vercel deployment has no API server: everything runs in the browser engine (plus the optional
// Supabase mirror). Skip the network there instead of logging a 404 for every call.
let noBackend = Boolean(import.meta.env.PROD && !rawBase);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (noBackend) return handleMockRequest<T>(path, options);
  try {
    const res = await fetch(`${BASE}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });

    // If static host returns 404 or 405 (e.g. Vercel static rewrite without backend):
    if (res.status === 404 || res.status === 405) {
      noBackend = true;
      console.warn(`[SentinelEye] Host returned HTTP ${res.status} for ${path}. Using internal data provider.`);
      return await handleMockRequest<T>(path, options);
    }

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        errMsg = body.error || errMsg;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    // Handle PDF/blob response
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/pdf')) {
      return res.blob() as unknown as T;
    }

    return res.json() as Promise<T>;
  } catch (err: any) {
    // If it's a known error from a live backend (e.g. wrong password or bad request):
    if (
      err.message &&
      !err.message.includes('405') &&
      !err.message.includes('404') &&
      !err.message.includes('Failed to fetch') &&
      !err.message.includes('NetworkError')
    ) {
      throw err;
    }

    // Otherwise, backend is unreachable or returning static 404/405 -> fallback
    console.warn(`[SentinelEye] Backend unavailable for ${path} (${err.message}). Using internal data provider.`);
    return await handleMockRequest<T>(path, options);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

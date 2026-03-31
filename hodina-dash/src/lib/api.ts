const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  token?: string | null;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: BodyInit | FormData | Record<string, unknown> | null;
  headers?: HeadersInit;
}

function buildHeaders(body: RequestOptions['body'], headers?: HeadersInit, token?: string | null) {
  const nextHeaders = new Headers(headers);

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`);
  }

  if (!(body instanceof FormData) && body !== null && body !== undefined && !nextHeaders.has('Content-Type')) {
    nextHeaders.set('Content-Type', 'application/json');
  }

  nextHeaders.set('Accept', 'application/json');

  return nextHeaders;
}

export async function apiRequest<T>(
  path: string,
  { token, method = 'GET', body = null, headers }: RequestOptions = {},
): Promise<T> {
  const requestBody =
    body instanceof FormData || typeof body === 'string' || body === null
      ? body
      : JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method,
    headers: buildHeaders(body, headers, token),
    body: method === 'GET' ? null : requestBody,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T & { message?: string; errors?: Record<string, string[]> }) : null;

  if (!response.ok) {
    const message =
      (payload as { message?: string; errors?: Record<string, string[]> } | null)?.message ??
      Object.values((payload as { errors?: Record<string, string[]> } | null)?.errors ?? {})[0]?.[0] ??
      'A apărut o eroare. Încearcă din nou.';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export function createMultipartPayload(
  values: Record<string, FormDataEntryValue | FormDataEntryValue[] | null | undefined>,
) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(`${key}[]`, item));
      return;
    }

    formData.append(key, value);
  });

  return formData;
}

export function formatApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'A apărut o eroare neașteptată.';
}

export { API_BASE_URL };

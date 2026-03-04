export const api = process.env.REACT_APP_api

export async function apiFetch(path, { loginKey, ...options } = {}) {
  const response = await fetch(api + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(loginKey ? { "X-api-key": loginKey } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function apiJson(path, { loginKey, body, ...options } = {}) {
  const isFormData = body instanceof FormData;

  const response = await apiFetch(path, {
    loginKey,
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
    body: isFormData ? body : body != null ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;
  return response.json();
}
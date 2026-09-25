let token = "";
export const setToken = (value) => {
  token = value;
};
export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Não foi possível concluir a operação.");
    error.code = data.error;
    error.details = data.details || [];
    throw error;
  }
  return data;
}

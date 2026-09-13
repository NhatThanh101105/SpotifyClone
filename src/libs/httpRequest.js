const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const getHeaders = (requiresAuth) => {
  const headers = {
    "Content-Type": "application/json",
  };
  if (requiresAuth) {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    let errorMessage = "Something went wrong";
    
    // Check if the API returns error inside "data.error"
    if (data.error) {
      if (data.error.details && data.error.details.length > 0) {
        errorMessage = data.error.details[0].message; // Get the specific validation error
      } else if (data.error.message) {
        errorMessage = data.error.message;
      }
    } else if (data.message) {
      errorMessage = data.message;
    }

    const error = new Error(errorMessage);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const httpRequest = {
  get: async (url, requiresAuth = false) => {
    const res = await fetch(`${baseUrl}${url}`, {
      method: "GET",
      headers: getHeaders(requiresAuth),
    });
    return handleResponse(res);
  },
  post: async (url, body, requiresAuth = false) => {
    const res = await fetch(`${baseUrl}${url}`, {
      method: "POST",
      headers: getHeaders(requiresAuth),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
  put: async (url, body, requiresAuth = false) => {
    const res = await fetch(`${baseUrl}${url}`, {
      method: "PUT",
      headers: getHeaders(requiresAuth),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },
  delete: async (url, requiresAuth = false) => {
    const res = await fetch(`${baseUrl}${url}`, {
      method: "DELETE",
      headers: getHeaders(requiresAuth),
    });
    return handleResponse(res);
  },
  upload: async (url, formData, requiresAuth = false) => {
    // For FormData, we do not set Content-Type header. 
    // The browser automatically sets it with the boundary.
    const headers = {};
    if (requiresAuth) {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    const res = await fetch(`${baseUrl}${url}`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(res);
  },
};
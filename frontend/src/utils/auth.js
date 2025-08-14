import axios from 'axios';

// Ensure interceptors are only registered once
let interceptorsInitialized = false;

// Create global axios interceptors for auth
export const setupAxiosInterceptors = (navigate) => {
  if (interceptorsInitialized) return;
  interceptorsInitialized = true;

  // Attach Authorization header from localStorage on each request
  axios.interceptors.request.use((config) => {
    try {
      const raw = localStorage.getItem('hcp_auth');
      if (raw) {
        const { token } = JSON.parse(raw);
        if (token && !config.headers?.Authorization) {
          config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
        }
      }
    } catch {}
    return config;
  });

  // On 401, clear auth and redirect to login
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        try {
          localStorage.removeItem('hcp_auth');
          // Notify app to clear in-memory auth state
          window.dispatchEvent(new CustomEvent('auth:logout'));
        } catch {}
        const redirect = error?.response?.data?.redirect || '/login';
        navigate(redirect, { replace: true });
      }
      return Promise.reject(error);
    }
  );
};

// Legacy helpers kept for convenience (optional usage by components)
export const getAuthHeader = () => {
  try {
    const raw = localStorage.getItem('hcp_auth');
    if (!raw) return {};
    const { token } = JSON.parse(raw);
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

export const authenticatedRequest = (url, options = {}) => {
  return axios({ url, ...options });
};

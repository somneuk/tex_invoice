const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'development' ? 'http://localhost:5000/api' : '/api');

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setUser = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, set Content-Type to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  return response.json();
};

export const login = async (username, password) => {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  setAuthToken(data.token);
  setUser(data.user);
  return data.user;
};

export const register = async (username, password, name) => {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { username, password, name },
  });
};

export const logout = () => {
  setAuthToken(null);
  setUser(null);
};

export const fetchProfile = () => apiRequest('/auth/me');
export const fetchLogs = () => apiRequest('/auth/logs');

export const fetchCustomers = () => apiRequest('/customers');
export const getCustomers = () => apiRequest('/customers');
export const addCustomer = (customerData) => apiRequest('/customers', {
  method: 'POST',
  body: customerData,
});
export const updateCustomer = (id, customerData) => apiRequest(`/customers/${id}`, {
  method: 'PUT',
  body: customerData,
});
export const deleteCustomer = (id) => apiRequest(`/customers/${id}`, {
  method: 'DELETE',
});

export const getInvoices = (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  return apiRequest(`/invoices${query ? '?' + query : ''}`);
};

export const addInvoice = (formData) => {
  // formData must be a FormData instance because of image uploads
  return apiRequest('/invoices', {
    method: 'POST',
    body: formData,
  });
};

export const updateInvoice = (id, formData) => {
  return apiRequest(`/invoices/${id}`, {
    method: 'PUT',
    body: formData,
  });
};

export const deleteInvoice = (id) => apiRequest(`/invoices/${id}`, {
  method: 'DELETE',
});

export const getDashboardStats = (period = 'monthly') => {
  return apiRequest(`/dashboard?period=${period}`);
};

// Format currency helper
export const formatCurrency = (val) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(val);
};

// Format date helper
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// 🔒 WRAPPER dla fetch który automatycznie dodaje tokeny
const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('AdminToken') || localStorage.getItem('UserToken');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  };

  if (token) {
    defaultOptions.headers.Authorization = `Bearer ${token}`;
  }

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  return fetch(url, finalOptions);
};

export default authFetch;

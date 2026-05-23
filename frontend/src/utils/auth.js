export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';
/** Set when logged in via torotech product-owner credentials. */
export const PRODUCT_OWNER_KEY = 'product_owner_session';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PRODUCT_OWNER_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  localStorage.removeItem(USER_KEY);
}

export function getProductOwnerSession() {
  return localStorage.getItem(PRODUCT_OWNER_KEY) === '1';
}

export function setProductOwnerSession(active) {
  if (active) {
    localStorage.setItem(PRODUCT_OWNER_KEY, '1');
  } else {
    localStorage.removeItem(PRODUCT_OWNER_KEY);
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}


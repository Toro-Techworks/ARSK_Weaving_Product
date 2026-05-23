/** Super Admin and Production Admin (admin role) may change loom status and view full history. */
export function canManageLoomStatus(user) {
  const role = user?.role;
  return role === 'super_admin' || role === 'admin';
}

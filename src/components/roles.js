export function normalizeRole(role) {
  return role === 'admin' ? 'system_admin' : role;
}

export function roleHome(role) {
  switch (normalizeRole(role)) {
    case 'technician': return '/technician';
    case 'accountant': return '/accountant';
    case 'store_manager': return '/manager';
    case 'system_admin': return '/admin';
    default: return '/home';
  }
}

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/App";
import type { PermissionModule } from "@shared/schema";

export function usePermissions() {
  const { data: user } = useQuery<User>({
    queryKey: ["/api/me"],
  });

  const hasPermission = (module: PermissionModule, action: 'create' | 'edit' | 'view' | 'delete'): boolean => {
    // Not logged in - no permissions
    if (!user) return false;

    // Admins have all permissions
    if (user.role === 'admin') return true;

    // Check if user has permissions object
    if (!user.permissions) return false;

    // Check specific permission
    const modulePermissions = user.permissions[module];
    if (!modulePermissions) return false;

    return modulePermissions[action] === true;
  };

  const canCreate = (module: PermissionModule) => hasPermission(module, 'create');
  const canEdit = (module: PermissionModule) => hasPermission(module, 'edit');
  const canView = (module: PermissionModule) => hasPermission(module, 'view');
  const canDelete = (module: PermissionModule) => hasPermission(module, 'delete');

  return {
    user,
    hasPermission,
    canCreate,
    canEdit,
    canView,
    canDelete,
    isAdmin: user?.role === 'admin',
  };
}

import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";

export default function PermissionGate({
  permission,
  permissions = [],
  mode = "all",
  fallback = null,
  children,
}) {
  const { hasPermission } = useAuth();

  // Memoize normalization to avoid executing array manipulation on every single render cycle
  const requiredPermissions = useMemo(() => {
    return permission ? [permission, ...permissions] : permissions;
  }, [permission, permissions]);

  if (requiredPermissions.length === 0) return children;

  const isAllowed = mode === "all" 
    ? requiredPermissions.every(hasPermission) 
    : requiredPermissions.some(hasPermission);

  return isAllowed ? children : fallback;
}
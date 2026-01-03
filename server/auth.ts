import type { Request, Response, NextFunction } from "express";
import type { Employee, Permissions, PermissionModule } from "@shared/schema";
import type { IStorage } from "./storage";

// Extend Express Session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: 'admin' | 'employee';
  }
}

// Extend Express Request to include storage
declare global {
  namespace Express {
    interface Request {
      storage?: IStorage;
    }
  }
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "User Authentication required" });
  }
  next();
}

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Admin Authentication required" });
  }
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Helper to get user role from employee record
export function getUserRole(employee: Employee): 'admin' | 'employee' {
  // Use the role field from the database, defaulting to 'employee' for safety
  return (employee.role === 'admin' || employee.role === 'employee') 
    ? employee.role as 'admin' | 'employee'
    : 'employee';
}

// Permission enforcement middleware factory
export function requirePermission(module: PermissionModule, action: 'create' | 'edit' | 'view' | 'delete') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // First check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Admins have all permissions
    if (req.session.userRole === 'admin') {
      return next();
    }

    // Get storage from request (needs to be attached in routes)
    const storage = req.storage;
    if (!storage) {
      return res.status(500).json({ error: "Storage not available" });
    }

    try {
      // Get the employee's details including roleId
      const employee = await storage.getEmployee(req.session.userId);
      if (!employee) {
        return res.status(401).json({ error: "Employee not found" });
      }

      // If employee has no role assigned, deny access to non-view actions
      if (!employee.roleId) {
        if (action === 'view') {
          return next(); // Allow view access for employees without specific roles
        }
        return res.status(403).json({ error: "Access denied: No role assigned" });
      }

      // Get the role and its permissions
      const role = await storage.getRole(employee.roleId);
      if (!role) {
        return res.status(403).json({ error: "Access denied: Role not found" });
      }

      // Check if the role has the required permission
      const permissions = role.permissions as Permissions;
      const modulePermissions = permissions[module];
      if (!modulePermissions || !modulePermissions[action]) {
        return res.status(403).json({ 
          error: `Access denied: You don't have permission to ${action} ${module}` 
        });
      }

      // Permission granted
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
}

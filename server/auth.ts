import type { Request, Response, NextFunction } from "express";
import type { Employee } from "@shared/schema";

// Extend Express Session types
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userEmail: string;
    userRole: 'admin' | 'employee';
  }
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
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

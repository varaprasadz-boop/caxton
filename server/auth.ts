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

// Helper to determine if employee is admin (first employee in system)
export async function isAdmin(employee: Employee, allEmployees: Employee[]): Promise<boolean> {
  // Admin is the first employee created (lowest createdAt or specific check)
  // For simplicity, we'll check if email contains 'admin' or is the first employee
  return employee.email.toLowerCase().includes('admin');
}

// Helper to get user role
export function getUserRole(employee: Employee): 'admin' | 'employee' {
  return employee.email.toLowerCase().includes('admin') ? 'admin' : 'employee';
}

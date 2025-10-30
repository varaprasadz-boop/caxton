# Caxton PHP Workflow Management System

## Overview

Caxton PHP is a comprehensive workflow management system designed specifically for a printing company. The application manages the complete printing workflow from job creation to delivery, including client management, employee coordination, task assignment, and deadline tracking. Built as a modern full-stack web application, it provides real-time visibility into production status and helps coordinate complex multi-stage printing processes.

## Recent Changes

### October 30, 2025
- **Client Detail Page Enhancement**: Replaced simple job list with professional status tabs (All Jobs, Pending, In Progress, Completed, Overdue) and comprehensive table view showing Job ID, Job Name, Type, Quantity, Created Date, Deadline, Status, Progress percentage, and View action. Added progress calculation based on task completion, overdue visual indicators (red border/text), and defensive handling for missing deadlines and job numbers. Completed tab includes both "completed" and "delivered" statuses.
- **Job Detail Page Enhancement**: Added Job ID field display as the first item in the Job Information card with proper formatting (CAX####/YYYY-YY) and defensive handling for missing/invalid job numbers
- **Default Sorting Implementation**: Jobs page now sorts by Created Date ascending (oldest first), Tasks page sorts by Deadline ascending (earliest first) by default, both maintaining interactive sort toggles
- **Status Overview Tabs**: Jobs page now includes status filter tabs (All Jobs, Pending, In Progress, Completed, Overdue) with live count updates, matching the Tasks page functionality

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development practices
- **Routing**: Wouter for lightweight client-side routing without the complexity of React Router
- **State Management**: TanStack Query (React Query) for server state management, caching, and synchronization
- **UI Framework**: Shadcn/UI components built on Radix UI primitives for accessibility and consistency
- **Styling**: Tailwind CSS with custom design system following Material Design principles
- **Build System**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript throughout the stack for consistency and type safety
- **Database ORM**: Drizzle ORM for type-safe database operations and migrations
- **API Design**: RESTful endpoints with consistent error handling and response formatting
- **File Structure**: Monorepo approach with shared schema definitions between client and server

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured via Drizzle with Neon serverless)
- **Session Storage**: PostgreSQL-based session storage using connect-pg-simple
- **Schema Management**: Drizzle migrations for version-controlled database changes
- **Data Modeling**: Relational design with proper foreign key relationships between clients, jobs, tasks, and employees

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL storage for persistence
- **Security**: CORS configuration and credential-based authentication
- **Access Control**: Role-based permission system with granular module-level permissions
- **Role System**: Database-driven roles with custom permissions for create/edit/view/delete actions
- **Admin Credentials**: michael.torres@caxton.com / admin123 (bcrypt hashed)
- **Permission Modules**: Jobs, Clients, Employees, Departments, Machines, Tasks, Roles
- **Permission Actions**: Create, Edit, View, Delete per module (stored as JSON in database)
- **Employee Roles**: Each employee can be assigned a role with specific permission set

### Design System and UI Architecture
- **Design Approach**: Material Design principles for utility-focused business applications
- **Color System**: Semantic color tokens with light/dark theme support
- **Typography**: Roboto font family with consistent sizing and weight scales  
- **Component Library**: Custom components built on Radix UI primitives for accessibility
- **Layout System**: Sidebar navigation with collapsible menu and responsive design
- **Spacing**: Systematic Tailwind spacing units (2, 4, 6, 8, 12, 16) for consistency

### Workflow Management Architecture
- **Job Lifecycle**: Multi-stage workflow from pending → pre-press → printing → cutting → folding → binding → QC → packaging → dispatch → delivered → completed
- **Job Numbering**: Sequential job numbers with format CAXNNNN/YYYY-YY (e.g., CAX0001/2025-26) for easy reference and tracking
- **Job Naming**: Optional alphanumeric job names (e.g., "Marketing Brochure", "Annual Report 2025") displayed next to Job ID in listings
- **Task Management**: Ordered task system with dependencies and employee assignment
- **Real-time Updates**: Query invalidation for immediate UI updates after state changes
- **Deadline Tracking**: Date-based alerts and overdue detection with visual indicators
- **Progress Visualization**: Timeline components showing workflow status and bottlenecks with completion percentages

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support for real-time connections
- **Database Driver**: @neondatabase/serverless for optimized serverless database connections

### UI and Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives including dialogs, dropdowns, forms, and navigation components
- **Lucide React**: Consistent icon library for UI elements and status indicators
- **React Hook Form**: Form state management with validation integration
- **TanStack Query**: Server state management, caching, and background updates

### Development and Build Tools
- **Vite**: Build tool and development server with hot module replacement
- **TypeScript**: Type checking and enhanced developer experience
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

### Validation and Data Handling
- **Zod**: Runtime type validation for API requests and form submissions
- **date-fns**: Date manipulation and formatting utilities for deadline management
- **clsx**: Conditional CSS class composition utility

### Development Environment
- **Replit Integration**: Development environment plugins for error overlay and debugging
- **ESBuild**: Fast JavaScript bundler for production builds
- **WebSocket Support**: Real-time communication capabilities for live updates
# Design Guidelines for Caxton PHP Workflow Management System

## Design Approach Selection

**Selected Approach**: Design System Approach using **Material Design** principles
**Justification**: This is a utility-focused, information-dense business application requiring stability, efficiency, and learnability over visual differentiation.

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- Primary: 25 70% 50% (Deep blue for main actions and navigation)
- Primary Light: 25 60% 85% (Light blue for backgrounds)

**Supporting Colors:**
- Success: 120 60% 45% (Green for completed tasks)
- Warning: 45 95% 55% (Orange for approaching deadlines) 
- Error: 0 70% 50% (Red for overdue/failed tasks)
- Neutral: 220 10% 95% (Light gray for backgrounds)
- Text Primary: 220 20% 20% (Dark gray for main text)
- Text Secondary: 220 15% 50% (Medium gray for secondary text)

### B. Typography

**Font Stack**: Roboto (Google Fonts) with system fallbacks
- **Headers**: Roboto Medium (500) - sizes 24px, 20px, 18px
- **Body Text**: Roboto Regular (400) - 16px for main content, 14px for secondary
- **Captions/Labels**: Roboto Regular (400) - 12px for form labels and metadata
- **Buttons**: Roboto Medium (500) - 14px

### C. Layout System

**Tailwind Spacing Units**: Consistently use 2, 4, 6, 8, 12, 16
- **Micro spacing**: `p-2, m-2` (8px) - form inputs, small gaps
- **Standard spacing**: `p-4, m-4` (16px) - card padding, button spacing  
- **Section spacing**: `p-6, m-6` (24px) - component separation
- **Major spacing**: `p-8, m-8` (32px) - page sections, major layout gaps
- **Large spacing**: `p-12, m-12` (48px) - hero sections, major content blocks
- **Extra large**: `p-16, m-16` (64px) - page-level spacing

### D. Component Library

**Navigation**
- Top navigation bar with company branding
- Left sidebar with collapsible menu sections (Dashboard, Jobs, Clients, Tasks, Employees)
- Breadcrumb navigation for deep pages

**Data Displays**
- Clean data tables with sorting and filtering
- Status badges with color coding (Pending: gray, In Progress: blue, Completed: green, Overdue: red)  
- Progress indicators for job completion percentage
- Timeline components for job workflow stages

**Forms**
- Material Design input fields with floating labels
- Grouped form sections with clear visual separation
- Inline validation with helpful error messages
- Multi-step forms for job creation workflow

**Cards & Containers**
- Clean white cards with subtle shadows
- Dashboard metric cards with large numbers and trend indicators
- Job detail cards showing status, deadlines, and key information

**Actions**
- Primary buttons for main actions (Create Job, Assign Task)
- Secondary outline buttons for supporting actions
- Icon-only buttons for quick actions in tables
- Floating action button for quick job creation

### E. Animations

**Minimal Motion Design**
- Subtle hover states on interactive elements (buttons, table rows)
- Smooth transitions for status changes (0.2s ease)
- Loading states with simple progress indicators
- **NO** complex animations or distracting motion effects

## Page-Specific Design Notes

**Dashboard**: Clean grid layout with metric cards, recent activity feed, and upcoming deadline alerts

**Job Management**: Master-detail layout with job list on left, details panel on right. Status pipeline visualization showing workflow progress.

**Task Views**: Kanban board option for visual task management, table view for detailed task lists with sorting/filtering.

**Forms**: Multi-step wizard for job creation, inline editing capabilities for quick updates.

## Key Design Principles

1. **Information Hierarchy**: Clear visual hierarchy with consistent heading sizes and spacing
2. **Functional Clarity**: Every interface element has a clear, single purpose
3. **Data Density**: Efficient use of screen space while maintaining readability
4. **Status Communication**: Immediate visual feedback for system state and user actions
5. **Professional Aesthetic**: Clean, trustworthy appearance suitable for business environment

This design approach prioritizes usability, efficiency, and reliability over visual flair, ensuring the workflow management system serves its functional purpose effectively.
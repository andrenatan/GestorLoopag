# Loopag - Sistema Completo de Gestão de Assinaturas IPTV

## Overview

Loopag is a comprehensive IPTV subscription management system built with modern web technologies. The application features a futuristic glassmorphism design with dual theme support (dark/light mode), real-time dashboard analytics, client management, billing automation, WhatsApp integration, and employee management capabilities.

## Recent Critical Fixes

### Revenue History Preservation (February 2026)
**Problem**: When renewing clients, the revenue for previous months was incorrectly decreasing.

**Root Cause**: The frontend form was sending `activationDate` on client updates, and the backend was accepting it, causing the original activation date to be overwritten with the current date.

**Solution Implemented**:
1. **Backend Guard** (`server/routes.ts`): The PUT `/api/clients/:id` endpoint now strips `activationDate` from the update payload, making it immutable after creation.
2. **Frontend Guard** (`client/src/components/clients/client-form.tsx`): The `handleSubmit` function now excludes `activationDate` when editing an existing client.

**Important Notes**:
- `activationDate` is IMMUTABLE after client creation - it should never be updated
- Revenue calculations are based on `payment_history.paymentDate`, not `clients.activationDate`
- Each renewal creates a NEW record in `payment_history` with today's date, preserving historical data

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **Theme Management**: Custom theme provider with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Schema Validation**: Zod for runtime type checking
- **Session Management**: PostgreSQL-based session storage
- **Authentication**: Supabase Auth with JWT verification

### Design System
- **Theme**: Dual mode (dark/light) with glassmorphism effects
- **Colors**: Neon blue (#6366f1) and purple (#8b5cf6) accents
- **Typography**: System font stack with responsive sizing
- **Animations**: CSS transitions and hover effects
- **Layout**: Responsive design with collapsible sidebar

## Key Components

### 1. Multi-Tenant SaaS Architecture
- **Complete Data Isolation**: Each user sees only their own data across all entities
- **Tenant Scoping**: All multi-tenant tables include `auth_user_id` foreign key to users.authUserId
- **Automatic Filtering**: Storage layer enforces tenant-scoped queries on all operations
- **Multi-Tenant Tables**: clients, employees, systems, whatsapp_instances, message_templates, billing_history, payment_history, automation_configs
- **Global Tables**: plans (shared subscription tiers for all tenants)
- **Security**: JWT-based authentication required for all protected endpoints, owner-only access verification

### 2. Authentication System
- **Supabase Auth**: Email/password authentication with JWT tokens
- **User Metadata**: Additional user data stored in application database
- **Auth Flow**: Supabase handles authentication, app stores metadata linked by authUserId
- **Security**: JWT verification on protected endpoints, duplicate username/email validation
- **Token Management**: Frontend automatically includes Authorization header with Bearer token on all API requests
- **Middleware**: Server middleware verifies Supabase JWT and populates req.user for tenant-scoped operations
- **Role-Based Access**: Admin, operator, and viewer roles with granular permissions (future enhancement)

### 3. Database Schema
- **Users**: Extended user metadata linked to Supabase Auth via authUserId (UUID, unique)
- **Plans**: Subscription plans - global table shared across all tenants (Mensal R$60, Trimestral R$150, Anual R$890)
- **Clients**: IPTV subscriber management with auth_user_id scoping
- **Employees**: Staff management with auth_user_id scoping
- **Systems**: Available systems per tenant with auth_user_id scoping
- **WhatsApp Instances**: Messaging integration with auth_user_id scoping
- **Message Templates**: Customizable templates with auth_user_id scoping
- **Billing History**: Transaction tracking with auth_user_id scoping
- **Payment History**: Revenue tracking with auth_user_id scoping
- **Automation Configs**: Automation settings with auth_user_id scoping

### 2. Dashboard
- Real-time metrics with animated cards
- Interactive charts for revenue and subscription analytics
- Key performance indicators (KPIs) tracking
- Responsive grid layout with glassmorphism effects

### 3. Client Management
- Comprehensive CRUD operations for IPTV subscribers
- Advanced filtering and search capabilities
- Bulk operations support
- Payment method tracking (PIX, Credit Card, Boleto)
- Referral system integration
- Expiration and payment status monitoring

### 4. Billing System
- Automated billing message generation
- WhatsApp integration for payment reminders
- Template-based messaging system
- Bulk billing operations
- Payment status tracking

### 5. Employee Management
- Staff information and payroll tracking
- Photo upload and profile management
- Position and salary administration
- Active/inactive status management

### 6. WhatsApp Integration
- Multiple instance support
- QR code connection workflow
- Template message management
- Automated billing notifications

## Data Flow

### 1. Client Onboarding
1. Client data entry through validated forms
2. Automatic ID generation and date calculations
3. Database persistence with audit trails
4. Real-time dashboard updates

### 2. Billing Process
1. System identifies clients approaching expiration
2. Template selection for messaging
3. WhatsApp instance routing
4. Message delivery and tracking
5. Payment status updates

### 3. Dashboard Analytics
1. Real-time data aggregation from multiple tables
2. Chart data transformation for visualization
3. KPI calculation and trend analysis
4. Automatic refresh mechanisms

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI primitives
- **wouter**: Lightweight React router
- **recharts**: Chart and data visualization library
- **react-hook-form**: Form state management
- **zod**: Schema validation and type safety

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: Fast JavaScript bundler for production

### Integration Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Supabase**: Authentication service with JWT tokens
- **WhatsApp Business API**: Messaging integration (planned)

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- TypeScript compilation with incremental builds
- Replit integration with banner and error overlay
- Environment variable management for database connection

### Production Build
1. **Frontend**: Vite builds React application to `dist/public`
2. **Backend**: ESBuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations apply schema changes
4. **Static Assets**: Served through Express static middleware

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **SUPABASE_URL**: Supabase project URL (required)
- **SUPABASE_ANON_KEY**: Supabase anonymous key (required)
- **NODE_ENV**: Environment mode (development/production)
- **PORT**: Server port configuration

### Scaling Considerations
- Serverless database for automatic scaling
- Stateless Express server design
- CDN-ready static asset structure
- Session storage in PostgreSQL for horizontal scaling

### Monitoring and Maintenance
- Request logging with duration tracking
- Error boundary implementation
- Database migration system
- Health check endpoints (planned)
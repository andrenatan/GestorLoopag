# Loopag - Sistema Completo de Gestão de Assinaturas IPTV

## Overview

Loopag is a comprehensive IPTV subscription management system built with modern web technologies. The application features a futuristic glassmorphism design with dual theme support (dark/light mode), real-time dashboard analytics, client management, billing automation, WhatsApp integration, and employee management capabilities.

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

### Design System
- **Theme**: Dual mode (dark/light) with glassmorphism effects
- **Colors**: Neon blue (#6366f1) and purple (#8b5cf6) accents
- **Typography**: System font stack with responsive sizing
- **Animations**: CSS transitions and hover effects
- **Layout**: Responsive design with collapsible sidebar

## Key Components

### 1. Database Schema
- **Users**: Authentication and role-based access control (admin/operator/viewer)
- **Clients**: IPTV subscriber management with comprehensive tracking
- **Employees**: Staff management and payroll information
- **WhatsApp Instances**: Integration for automated messaging
- **Message Templates**: Customizable billing and notification templates
- **Billing History**: Transaction and payment tracking

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
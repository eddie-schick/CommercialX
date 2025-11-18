# CommercialX Platform - Architecture & Capabilities Documentation

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Front-End Capabilities](#front-end-capabilities)
3. [System Architecture](#system-architecture)
4. [Back-End Integrations](#back-end-integrations)
5. [Database Architecture](#database-architecture)
6. [API Architecture](#api-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Data Flow & Processing](#data-flow--processing)

---

## Executive Summary

CommercialX is a comprehensive commercial vehicle marketplace platform built with modern full-stack technologies. The platform enables dealers to list commercial vehicles, equipment, and charging infrastructure while providing buyers with advanced search, filtering, and discovery capabilities.

**Technology Stack:**
- **Frontend:** React 19, TypeScript, Vite, TailwindCSS, Radix UI
- **Backend:** Node.js, Express, tRPC, TypeScript
- **Database:** PostgreSQL (via Supabase) with multi-schema architecture
- **Authentication:** Supabase Auth with OAuth fallback
- **Storage:** AWS S3 (via proxy) for images and assets
- **State Management:** TanStack Query (React Query) with optimistic updates
- **Real-time:** Supabase Realtime subscriptions

---

## Front-End Capabilities

### 1. Public-Facing Features

#### 1.1 Vehicle Inventory Browsing
- **Infinite scroll listing** with pagination
- **Advanced search & filtering:**
  - Fuel type (gasoline, diesel, electric, hybrid, CNG, propane)
  - Make & model selection
  - Body type filtering
  - Year range (min/max)
  - Price range filtering
  - Condition (new, used, certified pre-owned, demo)
  - Status (available, pending, sold, reserved)
- **Geographic search** with location-based filtering
- **Featured vehicles** showcase
- **Vehicle detail pages** with:
  - Image galleries
  - Comprehensive specifications
  - Equipment details
  - View tracking
  - Lead generation forms

#### 1.2 Bodies & Equipment Catalog
- **Category-based browsing:**
  - Box bodies, flatbeds, dump bodies
  - Refrigerated units
  - Service bodies, stake bodies, van bodies
  - Cranes, liftgates, toolboxes
  - Ladder racks, shelving, partitions
- **Filtering by:**
  - Manufacturer
  - Price range
  - Stock status (in stock, backorder, made-to-order, discontinued)
  - Compatibility filters (chassis types, makes, wheelbase, GVWR)
- **Detailed product pages** with specifications, images, and compatibility information

#### 1.3 Charging Infrastructure Marketplace
- **Charging station listings:**
  - Level 1, Level 2, DC Fast Charging
  - Depot chargers
  - Portable chargers
  - Accessories
- **Filtering by:**
  - Power output range
  - Connector types
  - Installation type (wall mount, pedestal, overhead, portable)
  - Location (city, state)
  - Public access availability
- **Location-based search** with map integration

#### 1.4 Content & Resources
- **Blog system** with published posts
- **Expert directory** with active experts
- **Resources page** for educational content
- **About, Contact, Services** pages
- **Financing & Incentives** information pages

### 2. User Account Features

#### 2.1 Authentication & Onboarding
- **Supabase Auth integration:**
  - Email/password signup & login
  - Email verification flow
  - Password reset functionality
- **Organization setup wizard:**
  - Multi-step onboarding process
  - Business type selection (franchise dealer, independent dealer, fleet remarketer, broker, leasing company, rental company)
  - Enhanced profile fields:
    - Business location (city, state, zip)
    - Contact information
    - Website URL
    - Makes carried
    - Specializations
    - Dealer license information
    - Tax ID
    - Service capabilities (service department, parts department, upfit installation)
    - Business hours
    - Sales territory
- **Protected routes** with role-based access control

#### 2.2 User Profile Management
- **Profile editing:**
  - Name, phone, company name
  - Address information
  - Bio and avatar
  - Email notification preferences
  - Marketing email preferences
- **Organization management** (for dealers)

#### 2.3 Saved Vehicles (Favorites)
- **Save/unsave vehicles** with optimistic UI updates
- **Personal notes** on saved vehicles
- **Favorites list** with filtering

### 3. Dealer Dashboard Features

#### 3.1 Vehicle Listing Management
- **Create new listings:**
  - Stock unit or build-to-order options
  - **VIN decoder integration:**
    - Automatic vehicle data extraction
    - NHTSA + EPA data enrichment
    - Real-time validation
    - Data source indicators
  - **Comprehensive form:**
    - Vehicle specifications (year, make, model, series, body style)
    - Fuel type, wheelbase, GVWR, payload
    - Engine & transmission details
    - Drive type selection
    - Equipment information (manufacturer, product line, type, dimensions, weight)
    - Pricing (asking price, special price)
    - Stock number, condition, mileage
    - Color information (exterior, interior)
    - Description
    - Location (city, state)
    - Photo upload with image transformation
- **Listing status management:**
  - Draft, Live, Archived states
  - Bulk operations support
- **Listing analytics:**
  - View counts
  - Lead counts
  - Favorite counts
  - Real-time updates via Supabase Realtime

#### 3.2 Bodies & Equipment Management
- **CRUD operations:**
  - Create, read, update, delete equipment listings
  - Category selection
  - Manufacturer & model information
  - Pricing (MSRP, sale price, installation cost)
  - Specifications (dimensions, weight, capacity, material, color)
  - Compatibility information (chassis types, makes, wheelbase range, GVWR range)
  - Lead time & stock status
  - Installation details (time, requirements)
  - Warranty information
  - Configuration options
  - Featured image upload
- **Status management:** Live, Draft, Archived

#### 3.3 Charging Infrastructure Management
- **CRUD operations** for charging stations:
  - Category selection
  - Manufacturer & model
  - Technical specifications:
    - Input voltage
    - Output power & current
    - Efficiency
    - Connector types
    - Number of ports
    - Simultaneous charging capability
    - Cable length & type
  - Installation information:
    - Installation type
    - Requirements
    - Electrical requirements
  - Features:
    - Network connectivity
    - Payment capability
    - Load management
  - Weather rating & certifications
  - Location information (address, coordinates, public access)
  - Pricing & warranty
  - Stock status & lead time
  - Featured image
- **Status management:** Live, Draft, Archived

#### 3.4 Analytics Dashboard
- **Real-time analytics:**
  - Listing performance metrics
  - View tracking
  - Lead generation statistics
  - Favorite counts
  - Geographic distribution
- **Data quality dashboard** (admin):
  - Vehicle data statistics
  - NHTSA vs EPA data source breakdown
  - Confidence level analysis
  - Recent VIN decodes
  - Cache hit rates

#### 3.5 Bulk Operations
- **Batch processing** capabilities for listings
- **Bulk status updates**
- **Mass import/export** functionality

#### 3.6 Settings
- **Dealer profile settings**
- **Organization configuration**
- **Integration settings** (DMS, etc.)

### 4. Advanced Front-End Features

#### 4.1 Real-Time Capabilities
- **Supabase Realtime subscriptions:**
  - Live listing updates
  - Real-time analytics
  - Presence tracking
  - View count updates
- **Optimistic UI updates:**
  - Instant feedback on user actions
  - Automatic rollback on errors
  - Loading states management

#### 4.2 Search & Discovery
- **Advanced listing search:**
  - Multi-criteria filtering
  - Geographic search with radius
  - Fuzzy matching for make/model
  - Saved search preferences
- **Infinite scroll pagination**
- **Smart filtering** with URL state persistence

#### 4.3 Image Management
- **Image upload:**
  - Drag-and-drop interface
  - Multiple image support
  - Image transformation & optimization
  - S3 storage integration
  - Progress tracking
- **Image galleries** with carousel views

#### 4.4 VIN Decoding UI
- **VIN input component:**
  - Real-time validation
  - Format checking (17 characters, excludes I/O/Q)
  - Auto-decode on valid input
  - Loading states
  - Error handling
- **Data preview:**
  - Source indicators (NHTSA, EPA, manual)
  - Confidence levels
  - Data source badges
  - Field-by-field display

#### 4.5 Map Integration
- **Geographic visualization:**
  - Vehicle location mapping
  - Charging infrastructure locations
  - Radius-based search
  - Interactive markers

#### 4.6 AI Chat Integration
- **AIChatBox component** for customer support
- **Manus Dialog** integration for AI-powered assistance

### 5. UI Component Library

#### 5.1 Design System
- **Radix UI primitives:**
  - Accessible, unstyled components
  - Full keyboard navigation
  - ARIA compliance
- **TailwindCSS** for styling
- **Theme support** (light/dark mode via ThemeContext)
- **Responsive design** with mobile-first approach

#### 5.2 Custom Components
- **Form components:**
  - Smart combobox with search
  - VIN input with validation
  - Image upload zones
  - Field groups
  - Input groups
- **Data display:**
  - Tables with sorting/filtering
  - Cards with hover effects
  - Badges for status indicators
  - Charts for analytics (Recharts)
- **Navigation:**
  - Sidebar navigation
  - Breadcrumbs
  - Tabs
  - Menus (dropdown, context, menubar)
- **Feedback:**
  - Toast notifications (Sonner)
  - Alert dialogs
  - Progress indicators
  - Skeletons for loading states
  - Spinners

### 6. State Management & Data Fetching

#### 6.1 TanStack Query (React Query)
- **Query configuration:**
  - 5-minute stale time
  - 10-minute cache time
  - Automatic retry (3 attempts with exponential backoff)
  - Refetch on reconnect
  - No refetch on window focus (performance optimization)
- **Mutation configuration:**
  - Single retry on failure
  - Optimistic updates
- **Error handling:**
  - Automatic redirect on unauthorized errors
  - Error suppression for expected cases
  - Query cache subscriptions

#### 6.2 Custom Hooks
- **`useCurrentUser`:** User authentication & profile management
- **`useSupabaseAuth`:** Supabase auth state management
- **`useInfiniteListings`:** Infinite scroll for listings
- **`useAdvancedListingSearch`:** Advanced search with filters
- **`useGeographicSearch`:** Location-based search
- **`useRealtimeListings`:** Real-time listing updates
- **`useRealtimeAnalytics`:** Real-time analytics tracking
- **`useOptimisticListing`:** Optimistic updates for listings
- **`useOptimisticFavorite`:** Optimistic favorite toggling
- **`useImageUpload`:** Image upload with progress
- **`useViewTracking`:** View count tracking
- **`usePresence`:** User presence tracking
- **`useListingMutations`:** Listing CRUD operations
- **`useComposition`:** Component composition utilities
- **`useMobile`:** Mobile device detection
- **`usePersistFn`:** Function persistence utilities

#### 6.3 Error Handling
- **Error boundary** for React error catching
- **Centralized error handler** (`errorHandler.ts`)
- **Retry utilities** with exponential backoff
- **Query cache management** for error recovery

---

## System Architecture

### 1. Application Structure

```
commercialx/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── _core/         # Core hooks (auth)
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts (Theme)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities & helpers
│   │   ├── pages/         # Route pages
│   │   └── types/         # TypeScript types
│   └── public/            # Static assets
├── server/                 # Backend Node.js application
│   ├── _core/             # Core server modules
│   ├── lib/               # Business logic & services
│   ├── routers/           # tRPC routers
│   └── db.ts              # Database layer
├── shared/                 # Shared types & constants
├── drizzle/               # Database schema (legacy)
└── supabase/              # Supabase functions & migrations
```

### 2. Technology Stack Details

#### 2.1 Frontend Stack
- **React 19.1.1** - UI library
- **TypeScript 5.9.3** - Type safety
- **Vite 7.1.7** - Build tool & dev server
- **Wouter 3.3.5** - Lightweight routing
- **TanStack Query 5.90.2** - Server state management
- **tRPC 11.6.0** - Type-safe API client
- **TailwindCSS 4.1.14** - Utility-first CSS
- **Radix UI** - Accessible component primitives
- **Framer Motion 12.23.22** - Animation library
- **Recharts 2.15.2** - Chart library
- **SuperJSON** - Enhanced JSON serialization

#### 2.2 Backend Stack
- **Node.js** - Runtime environment
- **Express 4.21.2** - Web framework
- **tRPC 11.6.0** - Type-safe API framework
- **TypeScript 5.9.3** - Type safety
- **Supabase JS 2.81.1** - Database & auth client
- **Axios 1.12.0** - HTTP client
- **Zod 4.1.12** - Schema validation
- **SuperJSON** - Enhanced JSON serialization

#### 2.3 Database
- **PostgreSQL** (via Supabase)
- **Multi-schema architecture:**
  - `01. Organization` - Organizations & users
  - `02a. Dealership` - Dealers & listings
  - `03. Vehicle Data` - Vehicle catalog
  - `04. Equipment Data` - Equipment catalog
  - `05. Completed Unit` - Complete configurations

### 3. Request Flow

```
Client Request
    ↓
Express Server
    ↓
tRPC Middleware (Context Creation)
    ↓
Authentication Check (Supabase Auth / OAuth)
    ↓
tRPC Router
    ↓
Procedure (Public/Protected/Admin)
    ↓
Business Logic (Services)
    ↓
Database Layer (Supabase)
    ↓
Response (SuperJSON serialized)
```

### 4. Build & Deployment

#### 4.1 Development
- **Vite dev server** with HMR
- **Express server** with tRPC middleware
- **Hot reload** for both frontend and backend
- **Port auto-detection** (starts at 3000, finds available port)

#### 4.2 Production Build
- **Frontend:** Vite build → static files in `dist/public`
- **Backend:** ESBuild bundle → `dist/index.js`
- **Static serving:** Express serves built frontend
- **API routing:** `/api/trpc/*` → tRPC handlers

---

## Back-End Integrations

### 1. External API Integrations

#### 1.1 NHTSA VPIC API
**Purpose:** Vehicle identification and specification data

**Integration Details:**
- **Base URL:** `https://vpic.nhtsa.dot.gov/api/vehicles`
- **Endpoint:** `DecodeVinValues/{vin}?format=json`
- **Service:** `server/lib/services/vin-decoder.ts`

**Capabilities:**
- Decodes 17-character VINs
- Extracts 150+ data points including:
  - Vehicle identity (year, make, model, trim, series)
  - Classification (vehicle type, body class, body style, cab type)
  - Dimensions (wheelbase, bed length, overall length/width/height)
  - Weight & capacity (curb weight, GVWR, payload, GAWR front/rear)
  - Towing capacity
  - Engine & powertrain (engine model, configuration, cylinders, displacement, fuel type)
  - Electric vehicle data (battery type, capacity, voltage, charging times)
  - Transmission & drivetrain
  - Safety features (ABS, ESC, airbags, TPMS)
  - Manufacturing details

**Error Handling:**
- VIN format validation (excludes I, O, Q)
- Error code interpretation
- Timeout handling (10 seconds)
- Retry logic with exponential backoff
- Graceful degradation

**Caching:**
- In-memory cache with 60-day TTL
- Cache key: `nhtsa:${vin}`
- Reduces API calls for repeated VINs

#### 1.2 EPA Fuel Economy API
**Purpose:** Fuel economy, emissions, and powertrain details

**Integration Details:**
- **Base URL:** `https://www.fueleconomy.gov/ws/rest`
- **Endpoints:**
  - `/vehicle/menu/options` - Find vehicle ID
  - `/vehicle/{id}` - Get vehicle data
- **Service:** `server/lib/services/epa-fuel-economy.ts`

**Capabilities:**
- Fuel economy data (city, highway, combined MPG)
- MPGe for electric vehicles
- Electric range & battery capacity
- Charging time estimates
- Annual fuel cost estimates
- CO2 emissions data
- Detailed engine descriptions
- Transmission information
- Drive type normalization

**Data Merging:**
- Combined with NHTSA data in `vehicle-data-enrichment.ts`
- EPA data preferred for fuel economy & emissions
- NHTSA data preferred for specifications
- Conflict resolution logic

#### 1.3 NHTSA Makes API
**Purpose:** Get vehicle makes for commercial vehicles

**Integration Details:**
- **Service:** `server/lib/services/nhtsa-makes.ts`
- **Function:** `getCommercialVehicleMakes()`

**Capabilities:**
- Filters makes for commercial vehicles (trucks)
- Cached responses
- Fallback makes list if API fails

### 2. Supabase Integration

#### 2.1 Authentication
**Service:** `server/_core/supabase.ts`

**Features:**
- **Supabase Auth client** initialization
- **JWT token validation** from Authorization header
- **Session management** (server-side, no persistence)
- **User context** in tRPC procedures

**Authentication Flow:**
1. Client sends Bearer token in Authorization header
2. Server validates token with Supabase Auth
3. User context populated in tRPC context
4. Protected procedures check for authenticated user

#### 2.2 Database Access
**Service:** `server/lib/supabase-db.ts`

**Multi-Schema Support:**
- **Schema-qualified queries:**
  - `querySchemaTable(schema, table, options)`
  - `insertSchemaTable(schema, table, data)`
  - `updateSchemaTable(schema, table, data, where)`
  - `deleteSchemaTable(schema, table, where)`
- **Public schema helpers:**
  - `querySupabaseTable(table, options)`
  - `insertSupabaseTable(table, data)`
  - `updateSupabaseTable(table, data, where)`

**Features:**
- Type-safe queries with TypeScript
- Automatic schema qualification
- Query builder support
- Transaction support (via Supabase)

#### 2.3 Realtime Subscriptions
**Frontend:** `client/src/hooks/useRealtimeListings.ts`, `useRealtimeAnalytics.ts`

**Capabilities:**
- **PostgreSQL change notifications:**
  - INSERT, UPDATE, DELETE events
  - Filtered by table, schema, row
- **Channel-based subscriptions:**
  - Per-listing analytics channels
  - Global listing update channels
  - Presence tracking channels
- **Automatic cleanup** on component unmount

### 3. Storage Integration

#### 3.1 AWS S3 (via Proxy)
**Service:** `server/storage.ts`

**Architecture:**
- **Storage proxy** via Forge API
- **Base URL:** Configured via `BUILT_IN_FORGE_API_URL`
- **Authentication:** Bearer token via `BUILT_IN_FORGE_API_KEY`

**Endpoints:**
- `POST /v1/storage/upload` - Upload files
- `GET /v1/storage/downloadUrl` - Get signed URLs

**Features:**
- **File upload:**
  - FormData-based uploads
  - Content-type support
  - Unique filename generation (timestamp + random suffix)
  - Path normalization
- **File retrieval:**
  - Signed URL generation
  - Secure access control
- **Error handling:**
  - HTTP status code interpretation
  - Detailed error messages

**Usage:**
- Listing images
- Equipment images
- Infrastructure images
- User avatars
- Company logos

### 4. Data Processing Services

#### 4.1 Vehicle Data Enrichment
**Service:** `server/lib/services/vehicle-data-enrichment.ts`

**Process:**
1. **NHTSA Decode** (required):
   - Decode VIN from NHTSA API
   - Extract all available fields
   - Enrich with derived calculations
   - Validate required fields (year, make, model)
2. **EPA Data Fetch** (optional):
   - Find EPA vehicle ID by year/make/model
   - Fetch detailed EPA data
   - Normalize fuel types
3. **Data Merging:**
   - Combine NHTSA + EPA data
   - Resolve conflicts (EPA preferred for fuel economy, NHTSA for specs)
   - Calculate confidence levels
   - Track data sources

**Output:**
- `EnrichedVehicleData` interface with 100+ fields
- Source tracking (`dataSources` array)
- Confidence level (`high`, `medium`, `low`)

#### 4.2 Smart Data Routing
**Service:** `server/lib/database/smart-routing.ts`

**Purpose:** Automatically route dealer input to correct database schemas

**Flow:**
1. **Input Validation:**
   - VIN validation
   - Required field checks
   - Business rule validation
2. **Schema Routing:**
   - **Schema 03:** Vehicle Data (vehicle catalog)
   - **Schema 04:** Equipment Data (equipment catalog)
   - **Schema 05:** Completed Unit Configuration
   - **Schema 02a:** Dealership (dealer listings)
3. **Data Creation:**
   - Create/update vehicle config
   - Create/update equipment config (if applicable)
   - Create completed unit configuration
   - Create dealer listing
4. **Compatibility Calculation:**
   - Calculate equipment compatibility
   - Validate weight distributions
   - Check GAWR compliance

**Functions:**
- `createListingFromDealerInput()` - Main entry point
- `getCurrentDealerId()` - Get authenticated dealer
- `verifyUserPermission()` - Check permissions
- `canUserCreateListings()` - Permission check

#### 4.3 Compatibility Calculator
**Service:** `server/lib/compatibility/calculator.ts`

**Purpose:** Calculate equipment compatibility with vehicles

**Checks:**
- Wheelbase compatibility
- GVWR compatibility
- GAWR compliance
- Chassis type matching
- Make compatibility
- Weight distribution

#### 4.4 Data Quality Scoring
**Service:** `server/lib/data-quality/scoring.ts`

**Purpose:** Assess data quality and completeness

**Metrics:**
- Field completeness
- Data source reliability
- Confidence scoring
- Validation status

#### 4.5 Fuzzy Matching
**Service:** `server/lib/fuzzy-matching/config.ts`

**Purpose:** Match vehicle makes/models with variations

**Use Cases:**
- Make/model normalization
- Search query matching
- Data deduplication

### 5. Supabase Edge Functions

#### 5.1 VIN Decode Function
**Location:** `supabase/functions/decode-vin/index.ts`

**Purpose:** Serverless VIN decoding

**Features:**
- VIN validation
- NHTSA API integration
- Error handling
- Response formatting

#### 5.2 Compliance Calculator
**Location:** `supabase/functions/calculate-compliance/index.ts`

**Purpose:** Calculate regulatory compliance

**Features:**
- Weight distribution checks
- GAWR compliance
- Regulatory validation

---

## Database Architecture

### 1. Multi-Schema Design

The database uses a multi-schema architecture to organize data by domain:

#### 1.1 Schema: `01. Organization`
**Purpose:** Organization and user management

**Tables:**
- `organizations` - Organization records
- `organization_users` - User-organization relationships
- `organization_settings` - Organization configuration

**Key Features:**
- Multi-tenant support
- Role-based access (owner, admin, member, viewer)
- Status tracking (active, inactive, suspended)

#### 1.2 Schema: `02a. Dealership`
**Purpose:** Dealer operations and listings

**Tables:**
- `dealers` - Dealer records (linked to organizations)
- `vehicle_listings` - Vehicle listings
- `listing_images` - Listing image associations
- `leads` - Lead generation records
- `saved_vehicles` - User favorites

**Key Features:**
- Listing status management (draft, live, archived)
- View/lead/favorite tracking
- Image associations
- Lead management

#### 1.3 Schema: `03. Vehicle Data`
**Purpose:** Vehicle catalog (master data)

**Tables:**
- `vehicles` - Vehicle master records
- `vehicle_config` - Vehicle configurations
- `vehicle_images` - Vehicle image associations

**Key Features:**
- VIN-based deduplication
- Data source tracking (NHTSA, EPA, manual)
- Enrichment metadata storage
- Confidence scoring

#### 1.4 Schema: `04. Equipment Data`
**Purpose:** Equipment catalog (master data)

**Tables:**
- `equipment` - Equipment master records
- `equipment_config` - Equipment configurations
- `equipment_images` - Equipment image associations

**Key Features:**
- Category organization
- Compatibility specifications
- Manufacturer information
- Stock status tracking

#### 1.5 Schema: `05. Completed Unit`
**Purpose:** Complete vehicle + equipment configurations

**Tables:**
- `complete_configurations` - Complete unit records
- `configuration_equipment` - Equipment associations

**Key Features:**
- Vehicle + equipment linking
- Compatibility validation
- Configuration tracking

### 2. Database Functions (RPC)

#### 2.1 Organization Functions
- `create_dealer_organization()` - Create organization + dealer
- `user_has_organization()` - Check user organization
- `get_user_organization_id()` - Get user's organization
- `user_can_create_listings()` - Permission check

#### 2.2 Dealer Functions
- `get_user_dealer_id()` - Get user's dealer ID
- `increment_listing_views()` - View tracking
- `increment_listing_leads()` - Lead tracking

### 3. Data Relationships

```
Organization (01)
    ↓ (1:N)
Organization Users (01)
    ↓ (1:1)
Dealer (02a)
    ↓ (1:N)
Vehicle Listings (02a)
    ↓ (N:1)
Vehicle Config (03)
    ↓ (N:1)
Vehicle (03)

Vehicle Listing (02a)
    ↓ (N:N)
Equipment Config (04)
    ↓ (1:1)
Complete Configuration (05)
```

---

## API Architecture

### 1. tRPC Router Structure

The API is organized into logical routers:

```
appRouter
├── system          # System routes
├── user            # User management
├── auth            # Authentication
│   ├── me          # Current user
│   ├── logout      # Logout
│   ├── setupOrganization  # Organization setup
│   └── hasOrganization    # Check organization
├── profile         # User profile
│   ├── get         # Get profile
│   └── update      # Update profile
├── vehicles        # Vehicle browsing
│   ├── list        # List vehicles
│   ├── getById     # Get vehicle
│   ├── getImages   # Get images
│   ├── getFeatured # Featured vehicles
│   ├── search      # Search vehicles
│   ├── stats       # Statistics
│   └── byFuelType  # By fuel type
├── leads           # Lead management
│   ├── create      # Create lead
│   └── listByCompany # List leads
├── saved           # Saved vehicles
│   ├── save        # Save vehicle
│   ├── unsave      # Unsave vehicle
│   └── list        # List saved
├── bodiesEquipment # Bodies & equipment
│   ├── list        # List equipment
│   ├── getById     # Get equipment
│   └── getImages   # Get images
├── infrastructure  # Charging infrastructure
│   ├── list        # List infrastructure
│   ├── getById     # Get infrastructure
│   └── getImages   # Get images
├── dealer          # Dealer operations
│   ├── bodies      # Equipment management
│   ├── infrastructure # Infrastructure management
│   └── listings    # Listing management
│       └── create  # Create listing
├── vin             # VIN decoding
│   └── decode      # Decode VIN
├── nhtsa           # NHTSA API
│   └── getMakes    # Get makes
├── admin           # Admin operations
│   └── vehicleDataStats # Data statistics
├── newsletter      # Newsletter
│   ├── subscribe   # Subscribe
│   └── unsubscribe # Unsubscribe
├── blog            # Blog
│   ├── list        # List posts
│   └── getBySlug   # Get post
├── experts         # Experts
│   └── list        # List experts
├── companies       # Companies
│   ├── getById     # Get company
│   └── getLocations # Get locations
└── upload          # File upload
    └── image       # Upload image
```

### 2. Procedure Types

#### 2.1 Public Procedures
- No authentication required
- Available to all users
- Examples: vehicle browsing, VIN decode, blog posts

#### 2.2 Protected Procedures
- Authentication required
- User context available
- Examples: profile management, saved vehicles, dealer operations

#### 2.3 Admin Procedures
- Admin role required
- Additional permission checks
- Examples: data quality dashboard, system statistics

### 3. Input Validation

**Zod Schemas:**
- All inputs validated with Zod
- Type-safe from client to server
- Automatic error messages
- Custom refinements for complex validation

**Example:**
```typescript
z.object({
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/),
  year: z.number().int().min(2000).max(new Date().getFullYear() + 1),
  // ... more fields
})
```

### 4. Error Handling

**Error Types:**
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `BAD_REQUEST` - Invalid input
- `NOT_FOUND` - Resource not found
- `INTERNAL_SERVER_ERROR` - Server error

**Error Messages:**
- User-friendly messages
- Consistent error format
- Automatic client-side handling

### 5. Response Format

**Success Response:**
```typescript
{
  success: true,
  data: T,
  message?: string
}
```

**Error Response:**
```typescript
{
  success: false,
  error: string,
  data: null
}
```

---

## Authentication & Authorization

### 1. Authentication Methods

#### 1.1 Supabase Auth (Primary)
- **Email/password** authentication
- **JWT tokens** in Authorization header
- **Session management** via Supabase
- **Email verification** required
- **Password reset** functionality

#### 1.2 OAuth (Fallback)
- **OAuth providers** support
- **Cookie-based** session management
- **Legacy support** for existing users

### 2. Authorization Levels

#### 2.1 Public Access
- No authentication required
- Browse vehicles, equipment, infrastructure
- View public content

#### 2.2 Authenticated Users
- Basic user account
- Save vehicles
- Create leads
- Manage profile

#### 2.3 Dealers
- Organization membership required
- Create/edit listings
- Manage equipment
- View analytics
- Access dealer dashboard

#### 2.4 Admins
- System-wide access
- Data quality dashboard
- System statistics
- User management

### 3. Permission System

**Organization Roles:**
- `owner` - Full control
- `admin` - Administrative access
- `member` - Create/edit access
- `viewer` - Read-only access

**Permission Checks:**
- Role hierarchy validation
- Resource ownership checks
- Organization membership verification

---

## Data Flow & Processing

### 1. VIN Decode Flow

```
User enters VIN
    ↓
Frontend validation (format, length)
    ↓
tRPC call: vin.decode
    ↓
Check cache (60-day TTL)
    ↓
If cached: Return cached data
    ↓
If not cached:
    ├─→ NHTSA API call
    │   └─→ Extract 150+ fields
    ├─→ EPA API call (optional)
    │   └─→ Get fuel economy data
    └─→ Merge & enrich data
        └─→ Cache result
            └─→ Return to client
```

### 2. Listing Creation Flow

```
Dealer fills form
    ↓
VIN decode (if provided)
    ↓
Form validation
    ↓
tRPC call: dealer.listings.create
    ↓
Authentication check
    ↓
Permission check (dealer role)
    ↓
Smart routing:
    ├─→ Create/update vehicle_config (Schema 03)
    ├─→ Create/update equipment_config (Schema 04, if equipment)
    ├─→ Create complete_configuration (Schema 05)
    └─→ Create vehicle_listing (Schema 02a)
        └─→ Return listing ID
```

### 3. Real-Time Update Flow

```
Database change (INSERT/UPDATE/DELETE)
    ↓
Supabase Realtime trigger
    ↓
PostgreSQL notification
    ↓
Supabase Realtime service
    ↓
WebSocket message to subscribed clients
    ↓
Frontend hook receives update
    ↓
State update (React Query cache)
    ↓
UI re-render
```

### 4. Image Upload Flow

```
User selects image
    ↓
Frontend: Image transformation/optimization
    ↓
Base64 encoding
    ↓
tRPC call: upload.image
    ↓
Server: Decode base64
    ↓
Generate unique filename
    ↓
Storage proxy: Upload to S3
    ↓
Return URL
    ↓
Frontend: Store URL in form state
```

### 5. Search & Filter Flow

```
User applies filters
    ↓
Frontend: Build query object
    ↓
tRPC call: vehicles.list (with filters)
    ↓
Server: Build Supabase query
    ↓
Apply filters:
    ├─→ Fuel type
    ├─→ Make/model
    ├─→ Year range
    ├─→ Price range
    ├─→ Condition
    └─→ Status
    ↓
Execute query
    ↓
Return paginated results
    ↓
Frontend: Display results
    ↓
Infinite scroll: Load more
```

---

## Performance Optimizations

### 1. Caching Strategy

#### 1.1 API Response Caching
- **NHTSA VIN decode:** 60-day TTL (VIN data doesn't change)
- **EPA data:** 30-day TTL
- **NHTSA makes:** 24-hour TTL
- **In-memory cache** with LRU eviction

#### 1.2 React Query Caching
- **Stale time:** 5 minutes
- **Cache time:** 10 minutes
- **Automatic refetch:** On reconnect only
- **No refetch on focus:** Performance optimization

### 2. Database Optimizations

- **Indexed columns:** VIN, organization_id, dealer_id, status
- **Query optimization:** Selective field queries
- **Pagination:** Limit/offset for large datasets
- **Connection pooling:** Via Supabase

### 3. Frontend Optimizations

- **Code splitting:** Route-based splitting
- **Image optimization:** Transformation on upload
- **Lazy loading:** Components & images
- **Optimistic updates:** Instant UI feedback
- **Debouncing:** Search input debouncing

### 4. Network Optimizations

- **Request batching:** tRPC batch links
- **Compression:** Gzip/Brotli (via Express)
- **CDN:** Static assets via CDN (production)
- **Timeout handling:** 25-second request timeout

---

## Security Considerations

### 1. Authentication Security

- **JWT tokens:** Secure token storage
- **HTTPS only:** All API calls over HTTPS
- **Token expiration:** Automatic token refresh
- **Session management:** Server-side validation

### 2. Authorization Security

- **Role-based access:** Enforced at procedure level
- **Resource ownership:** Verify user owns resource
- **Organization isolation:** Multi-tenant data isolation
- **Permission checks:** Multiple validation layers

### 3. Input Validation

- **Zod schemas:** All inputs validated
- **SQL injection:** Parameterized queries (Supabase)
- **XSS prevention:** React auto-escaping
- **CSRF protection:** Same-origin policy

### 4. Data Security

- **Encrypted storage:** S3 encryption
- **Secure headers:** Security headers in Express
- **Environment variables:** Secrets in env, not code
- **Error messages:** No sensitive data in errors

---

## Monitoring & Observability

### 1. Logging

- **Console logging:** Development & production
- **Error logging:** Detailed error information
- **Request logging:** API request/response logging
- **Performance logging:** Slow query detection

### 2. Error Tracking

- **Error boundaries:** React error catching
- **Centralized handler:** `errorHandler.ts`
- **User-friendly messages:** No technical details exposed
- **Error reporting:** (Future: Sentry integration)

### 3. Analytics

- **View tracking:** Listing view counts
- **Lead tracking:** Lead generation metrics
- **User analytics:** User behavior tracking
- **Performance metrics:** Response times, cache hit rates

---

## Future Enhancements

### 1. Planned Features

- **DMS Integration:** Dealer Management System sync
- **Payment processing:** Stripe integration
- **Email notifications:** Transactional emails
- **Advanced analytics:** Business intelligence dashboard
- **Mobile app:** React Native application
- **AI recommendations:** ML-based vehicle recommendations

### 2. Technical Improvements

- **GraphQL API:** Alternative to tRPC
- **Microservices:** Service decomposition
- **Event sourcing:** Event-driven architecture
- **CQRS:** Command/Query separation
- **Redis caching:** Distributed caching
- **Message queue:** Background job processing

---

## Conclusion

CommercialX is a sophisticated, full-stack commercial vehicle marketplace platform with:

- **Comprehensive front-end capabilities** for browsing, searching, and managing commercial vehicles
- **Robust back-end architecture** with type-safe APIs and multi-schema database design
- **Deep integrations** with NHTSA, EPA, and Supabase for data enrichment
- **Real-time capabilities** for live updates and analytics
- **Scalable architecture** ready for growth

The platform leverages modern technologies and best practices to deliver a performant, secure, and user-friendly experience for both dealers and buyers in the commercial vehicle marketplace.

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** CommercialX Development Team


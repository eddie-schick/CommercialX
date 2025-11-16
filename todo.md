# CommercialX.ai Development TODO

## Phase 1: Database Schema & Core Setup
- [x] Design vehicle inventory schema (make, model, year, fuel type, body type, price, etc.)
- [x] Design dealer/company schema with multi-location support
- [x] Design lead management schema with source tracking
- [x] Design user roles schema (admin, dealer, buyer, upfitter, finance, viewer)
- [x] Design vehicle images and media schema
- [x] Design vehicle specifications and equipment schema
- [x] Design private catalog schema for enterprise customers
- [x] Set up database relationships and indexes

## Phase 2: Homepage & Core Layout
- [x] Create main navigation with logo and menu
- [x] Build hero section with headline and search widget
- [x] Implement vehicle search widget (Vehicle Type, Body Type, Make, Model, Fuel Type, Range/Price)
- [x] Create feature cards section (Grants & Incentives, Meet Experts, Services)
- [x] Build "Who Benefits" section with stakeholder categories
- [x] Add "Find the Right Vehicle" browsing options (by OEM, Category, Equipment, Vocation, Class)
- [x] Create "Sell Your Vehicles" CTA section
- [x] Build footer with newsletter signup
- [x] Implement responsive mobile design
- [x] Add teal accent color (#008080) throughout design

## Phase 3: Vehicle Inventory System
- [x] Create vehicle listing page with grid/list view
- [x] Build vehicle detail page with full specifications
- [x] Implement vehicle image gallery
- [ ] Add vehicle comparison feature
- [ ] Create "similar vehicles" recommendations
- [ ] Build vehicle availability status display
- [x] Add dealer contact information on vehicle pages
- [x] Implement vehicle pricing display with markup capabilities

## Phase 4: Advanced Search & Filters
- [x] Build multi-filter search system
- [x] Add fuel type filter (Electric, Diesel, Gasoline, Hybrid, Alternative)
- [x] Add manufacturer/OEM filter
- [x] Add body type filter (Van, Truck, Box Truck, Cutaway, etc.)
- [x] Add year range filter
- [x] Add price range filter
- [x] Add location-based search with ZIP code
- [ ] Add availability status filter
- [x] Implement search results sorting (price, year, distance)
- [ ] Add saved searches functionality

## Phase 5: Dealer Management System
- [ ] Create dealer dashboard for inventory management
- [ ] Build inventory upload interface
- [ ] Implement bulk inventory import
- [ ] Add vehicle listing creation/edit forms
- [ ] Create image upload and management
- [ ] Build pricing management interface
- [ ] Add location management for multi-rooftop dealers
- [ ] Implement inventory status controls (active, sold, pending)
- [ ] Create dealer profile management
- [ ] Add dealer subscription tier display (Basic/Professional/Enterprise)

## Phase 6: Lead Management System
- [ ] Create lead capture forms on vehicle pages
- [x] Build contact forms with multiple entry points
- [ ] Implement lead routing to appropriate dealers
- [ ] Create lead dashboard for dealers
- [ ] Add lead source tracking (marketplace, dealer site, private catalog)
- [ ] Build lead notification system
- [ ] Implement lead quality scoring
- [ ] Add lead response tracking
- [ ] Create lead export functionality

## Phase 7: Services & Solutions Pages
- [x] Create financing & leasing information page
- [x] Build incentives & grants lookup page with ZIP code search
- [x] Create charging/infrastructure solutions page (adapted for all fuel types)
- [ ] Build upfitter/equipment provider directory
- [x] Create fleet solutions page
- [x] Add service provider integration pages
- [ ] Build OEM partnership pages

## Phase 8: Partner & Expert Sections
- [x] Create expert profiles section with photos and bios
- [ ] Build partner directory (dealers, upfitters, finance providers)
- [ ] Add partner benefits pages for each stakeholder type
- [ ] Create "List Your Inventory" dealer onboarding page
- [ ] Build partner testimonials section
- [ ] Add partner success stories

## Phase 9: Content & Information Pages
- [x] Create About Us page
- [x] Build blog/news section with article listings
- [ ] Create individual blog post pages
- [ ] Add FAQ section
- [ ] Create terms of service page
- [ ] Build privacy policy page
- [x] Add contact page with form
- [ ] Create sitemap

## Phase 10: Role-Based Access Control
- [ ] Implement user authentication system
- [ ] Create role definitions (admin, dealer, buyer, upfitter, finance, viewer)
- [ ] Build permission system for different user types
- [ ] Add dealer-only dashboard access
- [ ] Create admin panel for platform management
- [ ] Implement private catalog access for enterprise customers
- [ ] Add user profile management

## Phase 11: Private Enterprise Catalogs
- [ ] Design private catalog system
- [ ] Build white-labeled catalog interface
- [ ] Implement pre-negotiated pricing display
- [ ] Add approved vehicle configurations filtering
- [ ] Create bulk order capabilities
- [ ] Build custom approval workflows
- [ ] Add procurement system integration hooks

## Phase 12: Analytics & Reporting
- [ ] Implement page view tracking
- [ ] Add vehicle listing view analytics
- [ ] Create lead source attribution reporting
- [ ] Build dealer performance dashboard
- [ ] Add inventory turnover reports
- [ ] Implement ROI calculation tools
- [ ] Create conversion tracking

## Phase 13: Additional Features
- [ ] Add email notification system
- [ ] Implement saved vehicles/favorites
- [ ] Create vehicle comparison tool
- [ ] Build print-friendly vehicle pages
- [ ] Add social sharing capabilities
- [ ] Implement SEO optimization
- [ ] Add structured data markup
- [ ] Create XML sitemap generation

## Phase 14: Testing & Refinement
- [ ] Test all forms and lead capture
- [ ] Verify responsive design on all devices
- [ ] Test search and filter functionality
- [ ] Verify dealer dashboard features
- [ ] Test role-based access controls
- [ ] Check all navigation and links
- [ ] Verify image loading and optimization
- [ ] Test performance and load times
- [ ] Review and fix any bugs
- [ ] Create final checkpoint

## Phase 15: Documentation & Deployment
- [ ] Create user documentation
- [ ] Write dealer onboarding guide
- [ ] Document API endpoints
- [ ] Create admin guide
- [ ] Prepare deployment checklist
- [ ] Final review and delivery


## UI Refinements
- [x] Increase CommercialX logo size in navigation header


## Navigation Restructure
- [x] Update main navigation tabs to: Browse Vehicles, Body & Equipment, Infrastructure, Financing, Resource Center
- [x] Update navigation component with new structure
- [x] Create Resource Center page (consolidate Services, About, Blog, Experts, Contact)

## Bodies & Equipment Inventory System
- [x] Design bodies/equipment database schema
- [x] Add fields: name, pricing, lead time, compatibility specs, media gallery, installation specs, warranty
- [x] Create Bodies & Equipment listing page with filters
- [x] Create Body/Equipment detail page
- [x] Add lead capture forms for bodies/equipment
- [ ] Implement compatibility matching with chassis
- [ ] Add configuration options support

## Infrastructure (Chargers) Inventory System
- [x] Design charging infrastructure database schema
- [x] Add fields: cable length, input voltage, output power, connector types, installation requirements, pricing
- [x] Create Infrastructure listing page with filters
- [x] Create Charger detail page
- [x] Add lead capture forms for infrastructure
- [x] Support multiple connector types (NACS, SAE J1772, CCS, CHAdeMO)
- [ ] Add location/deployment information

## Enhanced Vehicle System
- [ ] Add template-based system for any OEM/model
- [ ] Support multiple powertrain types (EV, ICE, hybrid, CNG, hydrogen)
- [ ] Add multi-tier inventory (new, like-new, varying conditions)
- [ ] Add delivery logistics information
- [ ] Add performance analytics (views, inquiries per listing)
- [ ] Enhance status management (Live, Draft, Sold, Archived, In Stock, Backorder)


## Inventory Management & RBAC System

### User Profile & Role Management
- [x] Extend user schema with additional profile fields (company, phone, address, role details)
- [x] Create user profile page with edit capabilities
- [x] Implement role-based access control (dealer, upfitter, charging_provider, buyer, admin)
- [x] Add company association for dealers/upfitters/providers
- [ ] Create role switching UI for users with multiple roles

### Dealer Dashboard - Vehicle Management
- [x] Create dealer dashboard layout with sidebar navigation
- [ ] Build vehicle inventory listing page (dealer's vehicles only)
- [ ] Create "Add New Vehicle" form with all required fields
- [ ] Build "Edit Vehicle" form with validation
- [ ] Implement vehicle status management (Live, Draft, Sold, Archived)
- [ ] Add "Featured" vehicle toggle for premium placement
- [ ] Build photo upload and gallery management
- [ ] Add stock status controls (In Stock, Backorder, Coming Soon)
- [ ] Implement multi-location assignment for vehicles
- [ ] Add vehicle delete/archive functionality

### Dealer Dashboard - Bodies/Equipment Management
- [ ] Create bodies/equipment inventory page for dealers
- [ ] Build "Add Body/Equipment" form
- [ ] Implement markup pricing controls
- [ ] Add body availability management per vehicle type
- [ ] Create lead time management interface
- [ ] Build compatibility configuration (which chassis)

### Dealer Dashboard - Infrastructure Management
- [ ] Create charging infrastructure inventory page
- [ ] Build "Add Charger" form with all specs
- [ ] Implement installation pricing controls
- [ ] Add installation logistics management

### Dealer Analytics & Reporting
- [ ] Build analytics dashboard with key metrics
- [ ] Implement view tracking per listing
- [ ] Create lead/inquiry tracking per vehicle
- [ ] Add "most viewed" vehicles report
- [ ] Build export functionality (CSV/Excel)
- [ ] Create date range filtering for reports

### Bulk Operations
- [ ] Build CSV import interface for vehicles
- [ ] Create CSV template download
- [ ] Implement bulk pricing update tool
- [ ] Add bulk status update (mark multiple as sold)
- [ ] Create advanced filtering (VIN, stock#, make, model, location, status)
- [ ] Build bulk delete/archive functionality

### Upfitter Role (Phase 2)
- [ ] Create upfitter dashboard (bodies only)
- [ ] Implement upfitter-specific body catalog management
- [ ] Add chassis compatibility specification tool
- [ ] Build upfitter analytics (views, inquiries on their bodies)
- [ ] Restrict visibility to own inventory only

### Charging Provider Role (Phase 2)
- [ ] Create charging provider dashboard
- [ ] Implement infrastructure catalog management
- [ ] Add installation pricing calculator
- [ ] Build provider analytics
- [ ] Restrict visibility to own equipment only

### Three-Entry Configurator System
- [ ] Build chassis selection interface with filters
- [ ] Create compatible bodies selection step
- [ ] Add dealer/location selection step
- [ ] Implement total price calculation
- [ ] Build configuration save/compare feature
- [ ] Add "Request Quote" from configuration
- [ ] Create shareable configuration links

### DMS Integration Preparation
- [ ] Design API endpoints for DMS sync
- [ ] Create webhook receivers for inventory updates
- [ ] Build mapping layer for CDK/Reynolds/Dealertrack formats
- [ ] Implement real-time status sync (sold vehicles)
- [ ] Add automated pricing update handlers
- [ ] Create conflict resolution for simultaneous updates

### Frontend Buyer Experience Enhancements
- [ ] Add "Save Configuration" for logged-in buyers
- [ ] Build "Compare Vehicles" feature (up to 3)
- [ ] Implement "Saved Vehicles" / favorites
- [ ] Add "Recently Viewed" tracking
- [ ] Create personalized recommendations
- [ ] Build financing calculator integration


## Bug Fixes
- [x] Fix nested anchor tag error in Navigation component


## Dealer Inventory Management System
- [x] Fix current error messages (cached console errors from before restart)
- [x] Fix 404 error on manage inventory page
- [x] Create dealer dashboard overview page with metrics
- [x] Build vehicle inventory management page (list view)
- [x] Create add vehicle form with all fields
- [x] Create edit vehicle form
- [x] Implement vehicle delete/archive functionality
- [ ] Add image upload for vehicles
- [ ] Build bodies/equipment management pages
- [ ] Build infrastructure management pages
- [ ] Implement proper RBAC controls for all dealer pages
- [ ] Create account management workflows
- [ ] Add bulk operations support
- [ ] Build analytics dashboard


## Fix 404 Errors in Dealer Dashboard
- [x] Create dealer bodies/equipment list page
- [x] Create dealer bodies/equipment form page
- [x] Create dealer infrastructure list page
- [x] Create dealer infrastructure form page
- [x] Create dealer analytics page
- [x] Create dealer settings page
- [x] Create bulk operations page
- [x] Add all dealer routes to App.tsx


## Connect List Your Inventory to Dealer Dashboard
- [x] Update "List Your Inventory" button to link to /dealer/vehicles
- [x] Clear sample seed data from database
- [x] Verify public inventory shows empty state when no dealer listings exist
- [x] Ensure only dealer-added vehicles appear in public inventory


## Fix Bodies & Equipment and Infrastructure Pages
- [x] Fix Select component error (empty string value issue)
- [x] Redesign Bodies & Equipment page to match Browse Vehicles layout
- [x] Redesign Infrastructure page to match Browse Vehicles layout
- [x] Make filters dynamic based on actual database listings
- [x] Show empty state when no listings exist
- [x] Ensure filters have no options when database is empty


## Build Bodies/Equipment and Infrastructure Forms
- [x] Add backend database functions for bodies/equipment create/update/delete
- [x] Add backend database functions for infrastructure create/update/delete
- [ ] Build comprehensive Bodies/Equipment form with all fields
- [ ] Build comprehensive Infrastructure form with all fields
- [ ] Add form validation for required fields
- [ ] Connect forms to backend procedures
- [ ] Test form submission and data persistence


## Backend Integration - Bodies & Equipment
- [x] Add tRPC procedures for dealer bodies/equipment list
- [x] Add tRPC procedures for dealer bodies/equipment create
- [x] Add tRPC procedures for dealer bodies/equipment update
- [x] Add tRPC procedures for dealer bodies/equipment delete
- [x] Wire up BodiesList.tsx with tRPC integration
- [x] Implement delete functionality with confirmation

## Backend Integration - Infrastructure
- [x] Add tRPC procedures for dealer infrastructure list
- [x] Add tRPC procedures for dealer infrastructure create
- [x] Add tRPC procedures for dealer infrastructure update
- [x] Add tRPC procedures for dealer infrastructure delete
- [x] Wire up InfrastructureList.tsx with tRPC integration
- [x] Implement delete functionality with confirmation


## Add/Edit Forms for Bodies & Equipment
- [x] Build comprehensive BodyForm component with all database fields
- [x] Add validation for required fields (name, category, pricing)
- [x] Implement image upload with S3 integration for featured image
- [ ] Add photo gallery upload capability
- [x] Wire up create mutation for new bodies/equipment
- [x] Wire up update mutation for editing existing items
- [x] Add success/error handling with toast notifications
- [ ] Test complete add workflow
- [ ] Test complete edit workflow

## Add/Edit Forms for Charging Infrastructure
- [x] Build comprehensive InfrastructureForm component with all database fields
- [x] Add validation for required fields (name, category, pricing, power specs)
- [x] Implement image upload with S3 integration for featured image
- [ ] Add photo gallery upload capability
- [x] Wire up create mutation for new infrastructure
- [x] Wire up update mutation for editing existing items
- [x] Add success/error handling with toast notifications
- [ ] Test complete add workflow
- [ ] Test complete edit workflow


## Branding Updates
- [x] Copy new CommercialX logo to public directory
- [x] Update APP_LOGO constant to reference new logo
- [x] Update color palette to teal (#008080) theme
- [x] Test logo display across all pages
- [x] Remind user to update favicon in Management Dashboard


## Logo Size Adjustment
- [x] Increase CommercialX logo size in navigation header
- [x] Significantly increase logo size in main navigation (h-32 or larger)
- [x] Increase logo size in footer
- [x] Increase logo size in dealer dashboard sidebar


## Dynamic Filters for Browse Vehicles
- [x] Update Browse Vehicles page to use dynamic filters based on actual database listings
- [x] Match filter pattern from Bodies & Equipment and Infrastructure pages
- [x] Remove hardcoded filter options when no vehicles exist


## Teal Color Correction
- [x] Verify current teal color values in index.css
- [x] Update to exact #008080 teal hex code
- [x] Test color display across all pages


## Fix Nested Anchor Tag Error
- [x] Locate nested <a> tags on homepage
- [x] Fix HTML structure to remove nesting
- [x] Test homepage for console errors


## Convert Vehicle Filters to Dropdowns
- [x] Convert Fuel Type filter from checkboxes to dropdown select
- [x] Convert Make filter from checkboxes to dropdown select
- [x] Convert Body Type filter from checkboxes to dropdown select
- [x] Match dropdown pattern from Bodies & Equipment page
- [x] Test filter functionality

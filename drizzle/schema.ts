import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean, numeric, index, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Define PostgreSQL enums
export const userRoleEnum = pgEnum("user_role", ["admin", "dealer", "buyer", "upfitter", "charging_provider", "finance", "viewer"]);
export const companyTypeEnum = pgEnum("company_type", ["dealer", "upfitter", "charging_provider", "oem", "other"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["basic", "professional", "enterprise"]);
export const companyMemberRoleEnum = pgEnum("company_member_role", ["owner", "manager", "sales", "operations", "viewer"]);
export const conditionEnum = pgEnum("condition", ["new", "used"]);
export const fuelTypeEnum = pgEnum("fuel_type", ["electric", "diesel", "gasoline", "hybrid", "cng", "propane", "hydrogen"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["available", "pending", "sold", "reserved"]);
export const listingStatusEnum = pgEnum("listing_status", ["draft", "live", "archived"]);
export const stockStatusEnum = pgEnum("stock_status", ["in_stock", "backorder", "coming_soon"]);
export const leadTypeEnum = pgEnum("lead_type", ["inquiry", "quote", "test_drive", "financing", "trade_in"]);
export const leadSourceEnum = pgEnum("lead_source", ["marketplace", "dealer_site", "private_catalog", "referral", "other"]);
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "converted", "closed"]);
export const bodyEquipmentCategoryEnum = pgEnum("body_equipment_category", [
  "box_body",
  "flatbed",
  "dump_body",
  "refrigerated",
  "service_body",
  "stake_body",
  "van_body",
  "crane",
  "liftgate",
  "toolbox",
  "ladder_rack",
  "shelving",
  "partition",
  "other"
]);
export const bodyEquipmentStockStatusEnum = pgEnum("body_equipment_stock_status", ["in_stock", "backorder", "made_to_order", "discontinued"]);
export const bodyEquipmentStatusEnum = pgEnum("body_equipment_status", ["live", "draft", "archived"]);
export const chargingCategoryEnum = pgEnum("charging_category", [
  "level_1",
  "level_2",
  "dc_fast",
  "depot_charger",
  "portable",
  "accessories"
]);
export const installationTypeEnum = pgEnum("installation_type", ["wall_mount", "pedestal", "overhead", "portable"]);
export const chargingStockStatusEnum = pgEnum("charging_stock_status", ["in_stock", "backorder", "made_to_order", "discontinued"]);
export const chargingStatusEnum = pgEnum("charging_status", ["live", "draft", "archived"]);

/**
 * Core user table backing auth flow.
 * Extended with role-based access control for marketplace stakeholders.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("buyer").notNull(),
  // Profile fields
  phone: varchar("phone", { length: 50 }),
  companyName: varchar("companyName", { length: 255 }),
  companyId: integer("companyId"), // Association with companies table for dealers/upfitters/providers
  address: varchar("address", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),
  avatar: varchar("avatar", { length: 500 }),
  bio: text("bio"),
  // Preferences
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  marketingEmails: boolean("marketingEmails").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Companies/Dealers table for multi-location dealer management
 */
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: companyTypeEnum("type").default("dealer").notNull(),
  description: text("description"),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  logo: varchar("logo", { length: 500 }),
  subscriptionTier: subscriptionTierEnum("subscriptionTier").default("basic").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  // DMS Integration fields
  dmsProvider: varchar("dmsProvider", { length: 100 }), // CDK, Reynolds, Dealertrack, etc.
  dmsApiKey: varchar("dmsApiKey", { length: 500 }),
  dmsLastSync: timestamp("dmsLastSync", { mode: "date" }),
  dmsEnabled: boolean("dmsEnabled").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Dealer locations for multi-rooftop support
 */
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zipCode", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).default("USA").notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index("company_idx").on(table.companyId),
  zipCodeIdx: index("zip_code_idx").on(table.zipCode),
}));

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Company members/employees with role-based permissions
 */
export const companyMembers = pgTable("company_members", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  companyId: integer("companyId").notNull(),
  role: companyMemberRoleEnum("role").default("viewer").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  companyIdx: index("company_idx").on(table.companyId),
}));

export type CompanyMember = typeof companyMembers.$inferSelect;
export type InsertCompanyMember = typeof companyMembers.$inferInsert;

/**
 * Vehicle inventory table - fuel agnostic
 */
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  locationId: integer("locationId"),
  
  // Basic vehicle information
  vin: varchar("vin", { length: 17 }),
  stockNumber: varchar("stockNumber", { length: 100 }),
  condition: conditionEnum("condition").default("new").notNull(),
  year: integer("year").notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  trim: varchar("trim", { length: 100 }),
  
  // Fuel and powertrain
  fuelType: fuelTypeEnum("fuelType").notNull(),
  transmission: varchar("transmission", { length: 100 }),
  drivetrain: varchar("drivetrain", { length: 50 }),
  
  // Vehicle classification
  bodyType: varchar("bodyType", { length: 100 }).notNull(),
  vehicleClass: varchar("vehicleClass", { length: 50 }),
  vocation: varchar("vocation", { length: 100 }),
  
  // Specifications
  gvwr: integer("gvwr"),
  payload: integer("payload"),
  towingCapacity: integer("towingCapacity"),
  cargoVolume: integer("cargoVolume"),
  seatingCapacity: integer("seatingCapacity"),
  
  // Range and efficiency
  range: integer("range"),
  mpg: varchar("mpg", { length: 50 }),
  batteryCapacity: varchar("batteryCapacity", { length: 50 }),
  
  // Pricing
  msrp: integer("msrp"),
  dealerPrice: integer("dealerPrice"),
  salePrice: integer("salePrice"),
  
  // Colors and appearance
  exteriorColor: varchar("exteriorColor", { length: 100 }),
  interiorColor: varchar("interiorColor", { length: 100 }),
  
  // Description and features
  description: text("description"),
  features: text("features"),
  equipment: text("equipment"),
  
  // Status and availability
  status: vehicleStatusEnum("status").default("available").notNull(),
  listingStatus: listingStatusEnum("listingStatus").default("draft").notNull(),
  stockStatus: stockStatusEnum("stockStatus").default("in_stock").notNull(),
  quantityAvailable: integer("quantityAvailable").default(1).notNull(),
  deliveryTimeline: varchar("deliveryTimeline", { length: 100 }),
  isPublished: boolean("isPublished").default(true).notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  
  // Dealer management
  createdBy: integer("createdBy"), // userId who created the listing
  lastEditedBy: integer("lastEditedBy"), // userId who last edited
  dmsVehicleId: varchar("dmsVehicleId", { length: 100 }), // External DMS ID for sync
  dmsLastSync: timestamp("dmsLastSync", { mode: "date" }),
  
  // Analytics
  viewCount: integer("viewCount").default(0).notNull(),
  leadCount: integer("leadCount").default(0).notNull(),
  lastViewedAt: timestamp("lastViewedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index("company_idx").on(table.companyId),
  locationIdx: index("location_idx").on(table.locationId),
  makeIdx: index("make_idx").on(table.make),
  fuelTypeIdx: index("fuel_type_idx").on(table.fuelType),
  bodyTypeIdx: index("body_type_idx").on(table.bodyType),
  statusIdx: index("status_idx").on(table.status),
  yearIdx: index("year_idx").on(table.year),
}));

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = typeof vehicles.$inferInsert;

/**
 * Vehicle images table
 */
export const vehicleImages = pgTable("vehicle_images", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicleId").notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  caption: varchar("caption", { length: 255 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  vehicleIdx: index("vehicle_idx").on(table.vehicleId),
}));

export type VehicleImage = typeof vehicleImages.$inferSelect;
export type InsertVehicleImage = typeof vehicleImages.$inferInsert;

/**
 * Lead management table
 */
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicleId"),
  companyId: integer("companyId").notNull(),
  
  // Lead information
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  
  // Lead details
  message: text("message"),
  leadType: leadTypeEnum("leadType").default("inquiry").notNull(),
  leadSource: leadSourceEnum("leadSource").default("marketplace").notNull(),
  
  // Lead status
  status: leadStatusEnum("status").default("new").notNull(),
  qualityScore: integer("qualityScore").default(0).notNull(),
  
  // Metadata
  ipAddress: varchar("ipAddress", { length: 50 }),
  userAgent: text("userAgent"),
  referrer: varchar("referrer", { length: 500 }),
  
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  vehicleIdx: index("vehicle_idx").on(table.vehicleId),
  companyIdx: index("company_idx").on(table.companyId),
  statusIdx: index("status_idx").on(table.status),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Private enterprise catalogs
 */
export const privateCatalogs = pgTable("private_catalogs", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  customerId: integer("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  accessCode: varchar("accessCode", { length: 100 }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index("company_idx").on(table.companyId),
}));

export type PrivateCatalog = typeof privateCatalogs.$inferSelect;
export type InsertPrivateCatalog = typeof privateCatalogs.$inferInsert;

/**
 * Private catalog vehicles (many-to-many relationship)
 */
export const privateCatalogVehicles = pgTable("private_catalog_vehicles", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalogId").notNull(),
  vehicleId: integer("vehicleId").notNull(),
  customPrice: integer("customPrice"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  catalogIdx: index("catalog_idx").on(table.catalogId),
  vehicleIdx: index("vehicle_idx").on(table.vehicleId),
}));

export type PrivateCatalogVehicle = typeof privateCatalogVehicles.$inferSelect;
export type InsertPrivateCatalogVehicle = typeof privateCatalogVehicles.$inferInsert;

/**
 * Blog posts and content
 */
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: varchar("featuredImage", { length: 500 }),
  authorId: integer("authorId"),
  authorName: varchar("authorName", { length: 255 }),
  category: varchar("category", { length: 100 }),
  tags: text("tags"),
  isPublished: boolean("isPublished").default(false).notNull(),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  viewCount: integer("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("slug_idx").on(table.slug),
  publishedAtIdx: index("published_at_idx").on(table.publishedAt),
}));

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Expert profiles
 */
export const experts = pgTable("experts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  bio: text("bio"),
  photo: varchar("photo", { length: 500 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  linkedin: varchar("linkedin", { length: 255 }),
  expertise: text("expertise"),
  sortOrder: integer("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Expert = typeof experts.$inferSelect;
export type InsertExpert = typeof experts.$inferInsert;

/**
 * Saved vehicles (favorites)
 */
export const savedVehicles = pgTable("saved_vehicles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  vehicleId: integer("vehicleId").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  vehicleIdx: index("vehicle_idx").on(table.vehicleId),
}));

export type SavedVehicle = typeof savedVehicles.$inferSelect;
export type InsertSavedVehicle = typeof savedVehicles.$inferInsert;

/**
 * Newsletter subscriptions
 */
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  interests: text("interests"),
  isActive: boolean("isActive").default(true).notNull(),
  subscribedAt: timestamp("subscribedAt", { mode: "date" }).defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt", { mode: "date" }),
});

export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = typeof newsletterSubscriptions.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  companyMembers: many(companyMembers),
  savedVehicles: many(savedVehicles),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  locations: many(locations),
  vehicles: many(vehicles),
  members: many(companyMembers),
  leads: many(leads),
  privateCatalogs: many(privateCatalogs),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  company: one(companies, {
    fields: [locations.companyId],
    references: [companies.id],
  }),
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  company: one(companies, {
    fields: [vehicles.companyId],
    references: [companies.id],
  }),
  location: one(locations, {
    fields: [vehicles.locationId],
    references: [locations.id],
  }),
  images: many(vehicleImages),
  leads: many(leads),
  savedBy: many(savedVehicles),
  privateCatalogVehicles: many(privateCatalogVehicles),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleImages.vehicleId],
    references: [vehicles.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [leads.vehicleId],
    references: [vehicles.id],
  }),
  company: one(companies, {
    fields: [leads.companyId],
    references: [companies.id],
  }),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  user: one(users, {
    fields: [companyMembers.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [companyMembers.companyId],
    references: [companies.id],
  }),
}));

export const privateCatalogsRelations = relations(privateCatalogs, ({ one, many }) => ({
  company: one(companies, {
    fields: [privateCatalogs.companyId],
    references: [companies.id],
  }),
  vehicles: many(privateCatalogVehicles),
}));

export const privateCatalogVehiclesRelations = relations(privateCatalogVehicles, ({ one }) => ({
  catalog: one(privateCatalogs, {
    fields: [privateCatalogVehicles.catalogId],
    references: [privateCatalogs.id],
  }),
  vehicle: one(vehicles, {
    fields: [privateCatalogVehicles.vehicleId],
    references: [vehicles.id],
  }),
}));

export const savedVehiclesRelations = relations(savedVehicles, ({ one }) => ({
  user: one(users, {
    fields: [savedVehicles.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [savedVehicles.vehicleId],
    references: [vehicles.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
}));

/**
 * Bodies and Upfit Equipment catalog
 */
export const bodiesEquipment = pgTable("bodies_equipment", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  
  // Basic information
  name: varchar("name", { length: 255 }).notNull(),
  category: bodyEquipmentCategoryEnum("category").notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  description: text("description"),
  
  // Pricing
  msrp: integer("msrp"),
  salePrice: integer("salePrice"),
  installationCost: integer("installationCost"),
  
  // Specifications
  dimensions: text("dimensions"), // JSON: length, width, height
  weight: integer("weight"), // in lbs
  capacity: integer("capacity"), // payload capacity in lbs
  material: varchar("material", { length: 255 }),
  color: varchar("color", { length: 100 }),
  
  // Compatibility
  compatibleChassisTypes: text("compatibleChassisTypes"), // JSON array of compatible vehicle types
  compatibleMakes: text("compatibleMakes"), // JSON array of compatible makes
  wheelbaseMin: integer("wheelbaseMin"), // minimum wheelbase in inches
  wheelbaseMax: integer("wheelbaseMax"), // maximum wheelbase in inches
  gvwrMin: integer("gvwrMin"), // minimum GVWR
  gvwrMax: integer("gvwrMax"), // maximum GVWR
  
  // Lead time and availability
  leadTimeDays: integer("leadTimeDays"),
  stockStatus: bodyEquipmentStockStatusEnum("stockStatus").default("in_stock").notNull(),
  
  // Installation
  installationTime: varchar("installationTime", { length: 100 }), // e.g., "2-3 days"
  installationRequirements: text("installationRequirements"),
  
  // Warranty
  warrantyYears: integer("warrantyYears"),
  warrantyDetails: text("warrantyDetails"),
  
  // Configuration options
  configurationOptions: text("configurationOptions"), // JSON array of available options
  
  // Media
  featuredImage: varchar("featuredImage", { length: 500 }),
  
  // Status and analytics
  status: bodyEquipmentStatusEnum("status").default("draft").notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  inquiryCount: integer("inquiryCount").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index("company_idx").on(table.companyId),
  categoryIdx: index("category_idx").on(table.category),
  statusIdx: index("status_idx").on(table.status),
}));

export type BodyEquipment = typeof bodiesEquipment.$inferSelect;
export type InsertBodyEquipment = typeof bodiesEquipment.$inferInsert;

/**
 * Body/Equipment images
 */
export const bodyEquipmentImages = pgTable("body_equipment_images", {
  id: serial("id").primaryKey(),
  bodyEquipmentId: integer("bodyEquipmentId").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  caption: varchar("caption", { length: 255 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  bodyEquipmentIdx: index("body_equipment_idx").on(table.bodyEquipmentId),
}));

export type BodyEquipmentImage = typeof bodyEquipmentImages.$inferSelect;
export type InsertBodyEquipmentImage = typeof bodyEquipmentImages.$inferInsert;

/**
 * Charging Infrastructure catalog
 */
export const chargingInfrastructure = pgTable("charging_infrastructure", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId").notNull(),
  
  // Basic information
  name: varchar("name", { length: 255 }).notNull(),
  category: chargingCategoryEnum("category").notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  description: text("description"),
  
  // Pricing
  msrp: integer("msrp"),
  salePrice: integer("salePrice"),
  installationCost: integer("installationCost"),
  
  // Technical specifications
  inputVoltage: varchar("inputVoltage", { length: 100 }), // e.g., "208-240V AC"
  outputPower: integer("outputPower"), // in kW
  outputCurrent: integer("outputCurrent"), // in amps
  efficiency: integer("efficiency"), // percentage
  
  // Connector types
  connectorTypes: text("connectorTypes"), // JSON array: ["NACS", "SAE J1772", "CCS", "CHAdeMO"]
  numberOfPorts: integer("numberOfPorts").default(1).notNull(),
  simultaneousCharging: boolean("simultaneousCharging").default(false).notNull(),
  
  // Cable specifications
  cableLength: integer("cableLength"), // in feet
  cableType: varchar("cableType", { length: 100 }),
  
  // Installation
  installationType: installationTypeEnum("installationType"),
  installationRequirements: text("installationRequirements"),
  electricalRequirements: text("electricalRequirements"),
  dimensions: text("dimensions"), // JSON: length, width, height, weight
  
  // Features
  networkConnected: boolean("networkConnected").default(false).notNull(),
  paymentCapable: boolean("paymentCapable").default(false).notNull(),
  loadManagement: boolean("loadManagement").default(false).notNull(),
  weatherRating: varchar("weatherRating", { length: 50 }), // e.g., "NEMA 3R", "IP65"
  certifications: text("certifications"), // JSON array of certifications
  
  // Warranty
  warrantyYears: integer("warrantyYears"),
  warrantyDetails: text("warrantyDetails"),
  
  // Availability
  leadTimeDays: integer("leadTimeDays"),
  stockStatus: bodyEquipmentStockStatusEnum("stockStatus").default("in_stock").notNull(),
  
  // Location/deployment (for installed units)
  locationAddress: varchar("locationAddress", { length: 500 }),
  locationCity: varchar("locationCity", { length: 100 }),
  locationState: varchar("locationState", { length: 2 }),
  locationZipCode: varchar("locationZipCode", { length: 10 }),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  isPublicAccess: boolean("isPublicAccess").default(false).notNull(),
  
  // Media
  featuredImage: varchar("featuredImage", { length: 500 }),
  
  // Status and analytics
  status: chargingStatusEnum("status").default("draft").notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  inquiryCount: integer("inquiryCount").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index("company_idx").on(table.companyId),
  categoryIdx: index("category_idx").on(table.category),
  statusIdx: index("status_idx").on(table.status),
  locationIdx: index("location_idx").on(table.locationCity, table.locationState),
}));

export type ChargingInfrastructure = typeof chargingInfrastructure.$inferSelect;
export type InsertChargingInfrastructure = typeof chargingInfrastructure.$inferInsert;

/**
 * Charging infrastructure images
 */
export const chargingInfrastructureImages = pgTable("charging_infrastructure_images", {
  id: serial("id").primaryKey(),
  chargingInfrastructureId: integer("chargingInfrastructureId").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  caption: varchar("caption", { length: 255 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  chargingInfrastructureIdx: index("charging_infrastructure_idx").on(table.chargingInfrastructureId),
}));

export type ChargingInfrastructureImage = typeof chargingInfrastructureImages.$inferSelect;
export type InsertChargingInfrastructureImage = typeof chargingInfrastructureImages.$inferInsert;

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const connection = postgres(DATABASE_URL);
const db = drizzle(connection, { schema });

console.log("🌱 Seeding database with sample data...\n");

// Create sample company
console.log("Creating sample company...");
const [companyResult] = await db.insert(schema.companies).values({
  name: "CommercialX Demo Dealer",
  type: "dealer",
  description: "Premier commercial vehicle dealer serving businesses nationwide",
  website: "https://commercialx.ai",
  email: "sales@commercialx.ai",
  phone: "1-800-266-6372",
  isActive: true,
}).returning({ id: schema.companies.id });

const companyId = companyResult.id;
console.log(`✓ Created company with ID: ${companyId}\n`);

// Create sample location
console.log("Creating sample location...");
await db.insert(schema.locations).values({
  companyId,
  name: "Main Showroom",
  address: "123 Commercial Drive",
  city: "San Francisco",
  state: "CA",
  zipCode: "94105",
  country: "USA",
  phone: "1-800-266-6372",
  email: "sf@commercialx.ai",
  isHeadquarters: true,
  isActive: true,
});
console.log("✓ Created location\n");

// Create sample vehicles
console.log("Creating sample vehicles...");
const vehicles = [
  {
    companyId,
    vin: "1FTFW1E84MFA12345",
    stockNumber: "CV2024-001",
    year: 2024,
    make: "Ford",
    model: "E-Transit",
    trim: "350 HD High Roof Extended",
    bodyType: "Cargo Van",
    fuelType: "electric",
    condition: "new",
    msrp: 62500,
    salePrice: 59900,
    description: "Brand new 2024 Ford E-Transit electric cargo van. Perfect for urban delivery and service operations with zero emissions. Features high roof and extended length for maximum cargo capacity.",
    exteriorColor: "Oxford White",
    interiorColor: "Medium Earth Gray",
    transmission: "Automatic",
    drivetrain: "RWD",
    gvwr: 9500,
    payload: 3880,
    range: 126,
    seatingCapacity: 2,
    features: "Power windows, power locks, backup camera, Bluetooth, cruise control, air conditioning, 68 kWh battery",
    isFeatured: true,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "1GB6G5BL9M1234567",
    stockNumber: "CV2024-002",
    year: 2024,
    make: "Chevrolet",
    model: "Silverado 3500HD",
    trim: "Work Truck",
    bodyType: "Chassis Cab",
    fuelType: "diesel",
    condition: "new",
    msrp: 48500,
    salePrice: 46900,
    description: "Heavy-duty diesel chassis cab ready for upfitting. Duramax 6.6L V8 turbo diesel engine delivers exceptional power and torque for the toughest jobs.",
    exteriorColor: "Summit White",
    interiorColor: "Jet Black",
    transmission: "Allison 10-Speed Automatic",
    drivetrain: "4WD",
    gvwr: 14000,
    payload: 7442,
    towingCapacity: 20000,
    mpg: "15 city / 20 highway",
    seatingCapacity: 3,
    features: "Duramax 6.6L V8 turbo diesel, Allison transmission, trailer brake controller, HD trailering package",
    isFeatured: true,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "3C6TRVDG5NE123456",
    stockNumber: "CV2024-003",
    year: 2024,
    make: "RAM",
    model: "ProMaster 2500",
    trim: "High Roof 159WB",
    bodyType: "Cargo Van",
    fuelType: "gasoline",
    condition: "new",
    msrp: 42800,
    salePrice: 41200,
    description: "Versatile cargo van with best-in-class interior height and width. Front-wheel drive provides excellent traction and fuel economy.",
    exteriorColor: "Bright White",
    interiorColor: "Black",
    transmission: "9-Speed Automatic",
    drivetrain: "FWD",
    gvwr: 9350,
    payload: 4680,
    mpg: "18 city / 24 highway",
    seatingCapacity: 2,
    features: "3.6L V6 engine, backup camera, power windows, power locks, cruise control, air conditioning",
    isFeatured: false,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "1FDUF5HT6MEC12345",
    stockNumber: "CV2024-004",
    year: 2024,
    make: "Ford",
    model: "F-550",
    trim: "XL SuperCab",
    bodyType: "Dump Truck",
    fuelType: "diesel",
    condition: "new",
    msrp: 68900,
    salePrice: 66500,
    description: "Commercial-grade dump truck with 12-foot dump body. Powered by 6.7L Power Stroke diesel for maximum capability.",
    exteriorColor: "Oxford White",
    interiorColor: "Medium Earth Gray",
    transmission: "TorqShift 10-Speed Automatic",
    drivetrain: "4WD",
    gvwr: 19500,
    payload: 12750,
    seatingCapacity: 4,
    features: "6.7L Power Stroke V8 diesel, 12' dump body, backup camera, trailer brake controller, upfitter switches",
    isFeatured: true,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "1HTWGAZT8MJ123456",
    stockNumber: "CV2024-005",
    year: 2024,
    make: "Freightliner",
    model: "M2 106",
    trim: "Medium Duty",
    bodyType: "Box Truck",
    fuelType: "diesel",
    condition: "new",
    msrp: 89500,
    salePrice: 87900,
    description: "26-foot box truck with liftgate. Ideal for delivery and moving services. Cummins diesel engine provides reliable power.",
    exteriorColor: "White",
    interiorColor: "Gray",
    transmission: "Allison 6-Speed Automatic",
    drivetrain: "RWD",
    gvwr: 26000,
    payload: 14000,
    seatingCapacity: 3,
    features: "Cummins 6.7L diesel, 26' box body, Tommy Gate liftgate, air conditioning, air brakes",
    isFeatured: false,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "1GB3GZCG0M1123456",
    stockNumber: "CV2024-006",
    year: 2024,
    make: "GMC",
    model: "Savana 3500",
    trim: "Cutaway",
    bodyType: "Cutaway",
    fuelType: "gasoline",
    condition: "new",
    msrp: 45900,
    salePrice: 44200,
    description: "Cutaway chassis ready for custom body installation. Perfect for shuttle buses, food trucks, or specialty applications.",
    exteriorColor: "Summit White",
    interiorColor: "Medium Pewter",
    transmission: "6-Speed Automatic",
    drivetrain: "RWD",
    gvwr: 12300,
    payload: 6000,
    seatingCapacity: 2,
    features: "6.6L V8 gas engine, dual rear wheels, trailer brake controller, upfitter switches",
    isFeatured: false,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "5TFUY5F18NX123456",
    stockNumber: "CV2024-007",
    year: 2024,
    make: "Isuzu",
    model: "NPR-HD",
    trim: "Gas",
    bodyType: "Box Truck",
    fuelType: "gasoline",
    condition: "new",
    msrp: 62900,
    salePrice: 60500,
    description: "16-foot box truck with low cab forward design for excellent visibility. Gas engine provides lower operating costs.",
    exteriorColor: "White",
    interiorColor: "Gray",
    transmission: "6-Speed Automatic",
    drivetrain: "RWD",
    gvwr: 14500,
    payload: 7000,
    seatingCapacity: 3,
    features: "6.0L V8 gas engine, 16' box body, backup camera, power windows, air conditioning",
    isFeatured: false,
    isPublished: true,
    status: "available",
  },
  {
    companyId,
    vin: "WD3PE07C6MP123456",
    stockNumber: "CV2024-008",
    year: 2024,
    make: "Mercedes-Benz",
    model: "eSprinter",
    trim: "Cargo 144",
    bodyType: "Cargo Van",
    fuelType: "electric",
    condition: "new",
    msrp: 71500,
    salePrice: 68900,
    description: "Premium electric cargo van with advanced technology and superior build quality. Ideal for upscale delivery services.",
    exteriorColor: "Arctic White",
    interiorColor: "Anthracite",
    transmission: "Automatic",
    drivetrain: "FWD",
    gvwr: 9050,
    payload: 2866,
    range: 82,
    seatingCapacity: 2,
    features: "113 kWh battery, MBUX multimedia system, active brake assist, attention assist, crosswind assist",
    isFeatured: true,
    isPublished: true,
    status: "available",
  },
];

for (const vehicle of vehicles) {
  await db.insert(schema.vehicles).values(vehicle);
}
console.log(`✓ Created ${vehicles.length} sample vehicles\n`);

// Create sample experts
console.log("Creating sample experts...");
const experts = [
  {
    name: "John Martinez",
    title: "Senior Fleet Consultant",
    bio: "With over 15 years in commercial vehicle sales and fleet management, John specializes in helping businesses optimize their fleet operations and reduce total cost of ownership.",
    expertise: "Fleet electrification, TCO analysis, alternative fuels",
    email: "john.martinez@commercialx.ai",
    phone: "1-800-266-6372 ext. 101",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Sarah Chen",
    title: "Financing Specialist",
    bio: "Sarah has helped hundreds of businesses secure financing for their commercial vehicle purchases. She works with multiple lenders to find the best rates and terms for each client.",
    expertise: "Commercial vehicle financing, leasing, fleet programs",
    email: "sarah.chen@commercialx.ai",
    phone: "1-800-266-6372 ext. 102",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Michael Thompson",
    title: "Incentives Expert",
    bio: "Michael stays current on all federal, state, and local incentive programs. He's helped clients secure millions in grants and rebates for clean vehicle purchases.",
    expertise: "Federal tax credits, state rebates, utility programs",
    email: "michael.thompson@commercialx.ai",
    phone: "1-800-266-6372 ext. 103",
    isActive: true,
    sortOrder: 3,
  },
];

for (const expert of experts) {
  await db.insert(schema.experts).values(expert);
}
console.log(`✓ Created ${experts.length} sample experts\n`);

// Create sample blog posts
console.log("Creating sample blog posts...");
const blogPosts = [
  {
    title: "The Complete Guide to Commercial Vehicle Financing in 2024",
    slug: "commercial-vehicle-financing-guide-2024",
    excerpt: "Everything you need to know about financing your commercial vehicle purchase, from traditional loans to alternative options.",
    content: "Comprehensive guide content here...",
    authorName: "Sarah Chen",
    isPublished: true,
    publishedAt: new Date("2024-01-15"),
  },
  {
    title: "Electric vs. Diesel: Which is Right for Your Fleet?",
    slug: "electric-vs-diesel-fleet-comparison",
    excerpt: "A detailed comparison of electric and diesel commercial vehicles, including total cost of ownership analysis.",
    content: "Comparison article content here...",
    authorName: "John Martinez",
    isPublished: true,
    publishedAt: new Date("2024-01-20"),
  },
  {
    title: "Maximizing Federal Tax Credits for Commercial Clean Vehicles",
    slug: "federal-tax-credits-commercial-vehicles",
    excerpt: "Learn how to take advantage of the 45W commercial clean vehicle credit and save up to $40,000 per vehicle.",
    content: "Tax credit guide content here...",
    authorName: "Michael Thompson",
    isPublished: true,
    publishedAt: new Date("2024-01-25"),
  },
];

for (const post of blogPosts) {
  await db.insert(schema.blogPosts).values(post);
}
console.log(`✓ Created ${blogPosts.length} sample blog posts\n`);

await connection.end();

console.log("✅ Database seeding completed successfully!");

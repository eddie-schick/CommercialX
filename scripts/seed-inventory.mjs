import { drizzle } from "drizzle-orm/mysql2";
import {
  bodiesEquipment,
  chargingInfrastructure,
  companies,
} from "../drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

async function seedInventory() {
  console.log("Seeding Bodies/Equipment and Infrastructure...");

  // Get a company ID (use the first one or create a default)
  const existingCompanies = await db.select().from(companies).limit(1);
  let companyId = existingCompanies[0]?.id;

  if (!companyId) {
    const [newCompany] = await db
      .insert(companies)
      .values({
        name: "CommercialX Solutions",
        type: "dealer",
        description: "Your trusted commercial vehicle partner",
        website: "https://commercialx.ai",
        phone: "1-800-266-6372",
        email: "info@commercialx.ai",
      })
      .$returningId();
    companyId = newCompany.id;
  }

  // Seed Bodies & Equipment
  const bodiesData = [
    {
      companyId,
      name: "Morgan Dry Freight Box Body 16'",
      category: "box_body",
      manufacturer: "Morgan Truck Body",
      model: "DuraPlate 16",
      description:
        "Heavy-duty 16-foot dry freight box body with reinforced aluminum construction. Perfect for delivery and distribution applications. Features roll-up rear door, side door access, and interior E-track tie-down system.",
      msrp: 18500,
      salePrice: 16900,
      stockStatus: "in_stock",
      leadTimeDays: 30,
      warrantyYears: 5,
      dimensions: "16'L x 8'W x 9'H",
      weight: 1850,
      capacity: 4500,
      material: "Aluminum DuraPlate",
      color: "White",
      compatibleChassisTypes: "Cutaway, Cab Chassis",
      compatibleMakes: "Ford, GM, Ram, Isuzu, Hino",
      wheelbaseMin: 158,
      wheelbaseMax: 178,
      gvwrMin: 12000,
      gvwrMax: 19500,
      installationTime: "4-6 hours",
      installationCost: 1200,
      installationRequirements:
        "Requires chassis prep kit. Professional installation recommended. Electrical hookup for interior lights and rear door opener.",
      featuredImage:
        "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800",
    },
    {
      companyId,
      name: "Reading Service Body 9' Classic II",
      category: "service_body",
      manufacturer: "Reading Truck",
      model: "Classic II Series",
      description:
        "Professional-grade 9-foot service body with multiple compartments for tool and equipment storage. Steel construction with powder-coat finish. Includes adjustable shelving, drawer units, and ladder rack mounting points.",
      msrp: 12800,
      salePrice: 11500,
      stockStatus: "in_stock",
      leadTimeDays: 21,
      warrantyYears: 3,
      dimensions: "9'L x 8'W x 6.5'H",
      weight: 1450,
      capacity: 3200,
      material: "Steel with powder-coat finish",
      color: "White, Black, Red",
      compatibleChassisTypes: "Pickup, Cab Chassis",
      compatibleMakes: "Ford F-350/F-450/F-550, Ram 3500/4500/5500, GM 3500",
      wheelbaseMin: 140,
      wheelbaseMax: 165,
      gvwrMin: 11000,
      gvwrMax: 19500,
      installationTime: "3-4 hours",
      installationCost: 950,
      installationRequirements:
        "Requires removal of existing bed. Bolt-on installation to frame rails. Wiring for compartment lights included.",
      featuredImage:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
    },
    {
      companyId,
      name: "Knapheide Aluminum Flatbed 12'",
      category: "flatbed",
      manufacturer: "Knapheide",
      model: "PGNB Series",
      description:
        "Lightweight aluminum flatbed with integrated toolboxes and stake pockets. Ideal for construction, landscaping, and utility applications. Features non-skid deck surface and LED lighting package.",
      msrp: 9800,
      salePrice: 8900,
      stockStatus: "in_stock",
      leadTimeDays: 14,
      warrantyYears: 5,
      dimensions: "12'L x 8'W x 18\"H",
      weight: 950,
      capacity: 5000,
      material: "Aluminum with steel subframe",
      color: "Natural aluminum",
      compatibleChassisTypes: "Cab Chassis, Pickup",
      compatibleMakes: "Ford, GM, Ram, Isuzu",
      wheelbaseMin: 145,
      wheelbaseMax: 165,
      gvwrMin: 10000,
      gvwrMax: 19500,
      installationTime: "2-3 hours",
      installationCost: 750,
      installationRequirements:
        "Bolt-on installation to frame rails. Requires bed removal on pickup applications. Wiring for LED lights included.",
      featuredImage:
        "https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800",
    },
    {
      companyId,
      name: "Maxon TE Series Liftgate 2000 lb",
      category: "liftgate",
      manufacturer: "Maxon Lift",
      model: "TE20",
      description:
        "Rail-mounted tuckunder liftgate with 2000 lb capacity. Aluminum platform with safety features including platform restraints and emergency lowering system. Ideal for delivery trucks and box bodies.",
      msrp: 5200,
      salePrice: 4750,
      stockStatus: "in_stock",
      leadTimeDays: 10,
      warrantyYears: 2,
      dimensions: "60\"W x 48\"D platform",
      weight: 425,
      capacity: 2000,
      material: "Aluminum platform with steel frame",
      compatibleChassisTypes: "Box truck, Cutaway with box body",
      compatibleMakes: "Universal fit",
      installationTime: "4-5 hours",
      installationCost: 1500,
      installationRequirements:
        "Requires frame mounting and hydraulic pump installation. Electrical connection to chassis battery. Professional installation required.",
      featuredImage:
        "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800",
    },
    {
      companyId,
      name: "Thermo King V-Series Refrigeration Unit",
      category: "refrigerated",
      manufacturer: "Thermo King",
      model: "V-300 MAX",
      description:
        "High-performance refrigeration unit for 16-20 foot bodies. Maintains temperatures from -20°F to +70°F. Fuel-efficient design with multi-speed operation and automatic defrost.",
      msrp: 14500,
      salePrice: 13200,
      stockStatus: "backorder",
      leadTimeDays: 45,
      warrantyYears: 3,
      weight: 385,
      material: "Stainless steel evaporator",
      compatibleChassisTypes: "Box body 16-20 feet",
      installationTime: "6-8 hours",
      installationCost: 2200,
      installationRequirements:
        "Requires insulated box body. Mounting to front wall of box. Fuel line connection to chassis tank. Electrical hookup for controls.",
      featuredImage:
        "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800",
    },
    {
      companyId,
      name: "Weather Guard Aluminum Ladder Rack",
      category: "ladder_rack",
      manufacturer: "Weather Guard",
      model: "Model 1275",
      description:
        "Heavy-duty aluminum ladder rack with 1000 lb capacity. Fits full-size pickups and service bodies. Includes tie-down straps and rubber cushions to protect cargo.",
      msrp: 850,
      salePrice: 725,
      stockStatus: "in_stock",
      leadTimeDays: 5,
      warrantyYears: 3,
      dimensions: "65\"W x 72\"L",
      weight: 95,
      capacity: 1000,
      material: "Aluminum",
      compatibleChassisTypes: "Pickup bed, Service body",
      compatibleMakes: "Ford, GM, Ram (full-size)",
      installationTime: "1-2 hours",
      installationCost: 250,
      installationRequirements:
        "Bolt-on installation to bed rails or service body. No drilling required on most applications.",
      featuredImage:
        "https://images.unsplash.com/photo-1586528116493-a029325540fa?w=800",
    },
  ];

  console.log("Inserting bodies/equipment...");
  await db.insert(bodiesEquipment).values(bodiesData);

  // Seed Charging Infrastructure
  const infrastructureData = [
    {
      companyId,
      name: "ChargePoint CPE250 DC Fast Charger",
      category: "dc_fast",
      manufacturer: "ChargePoint",
      model: "CPE250",
      description:
        "Commercial-grade DC fast charging station with dual CCS connectors. Delivers up to 62.5 kW per port for rapid fleet charging. Cloud-connected with remote monitoring and management capabilities.",
      msrp: 45000,
      salePrice: 42500,
      stockStatus: "in_stock",
      leadTimeDays: 60,
      warrantyYears: 3,
      outputPower: 125,
      inputVoltage: "480V 3-phase",
      cableLength: 18,
      numberOfPorts: 2,
      connectorTypes: JSON.stringify(["CCS", "CHAdeMO"]),
      networkConnected: true,
      paymentCapable: true,
      loadManagement: true,
      installationType: "pedestal",
      weatherRating: "NEMA 3R (outdoor rated)",
      certifications: JSON.stringify(["UL", "Energy Star", "OCPP 1.6"]),
      electricalRequirements:
        "480V 3-phase, 150A service. Requires dedicated circuit breaker and disconnect.",
      installationCost: 12000,
      installationRequirements:
        "Concrete pad 4'x6' required. Electrical service upgrade may be needed. Network connectivity (ethernet or cellular). Permit and utility coordination required.",
      locationAddress: "123 Fleet Way",
      locationCity: "San Francisco",
      locationState: "CA",
      locationZipCode: "94105",
      isPublicAccess: false,
      featuredImage:
        "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800",
    },
    {
      companyId,
      name: "ABB Terra 54 CJG Depot Charger",
      category: "depot_charger",
      manufacturer: "ABB",
      model: "Terra 54 CJG",
      description:
        "Reliable Level 2 depot charging solution for overnight fleet charging. Wall-mounted design saves space. Supports load management for multiple units. OCPP-compliant for fleet management integration.",
      msrp: 3200,
      salePrice: 2850,
      stockStatus: "in_stock",
      leadTimeDays: 21,
      warrantyYears: 3,
      outputPower: 11.5,
      inputVoltage: "208-240V",
      cableLength: 25,
      numberOfPorts: 1,
      connectorTypes: JSON.stringify(["SAE J1772"]),
      networkConnected: true,
      paymentCapable: false,
      loadManagement: true,
      installationType: "wall_mount",
      weatherRating: "NEMA 3R (outdoor rated)",
      certifications: JSON.stringify(["UL", "Energy Star", "OCPP 2.0"]),
      electricalRequirements:
        "208-240V, 48A circuit. Requires 60A breaker and GFCI protection.",
      installationCost: 1200,
      installationRequirements:
        "Wall mounting on concrete or masonry. Electrical conduit run from panel. Network connection recommended.",
      locationAddress: "456 Depot Drive",
      locationCity: "Los Angeles",
      locationState: "CA",
      locationZipCode: "90012",
      isPublicAccess: false,
      featuredImage:
        "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800",
    },
    {
      companyId,
      name: "Tesla Wall Connector (Gen 3)",
      category: "level_2",
      manufacturer: "Tesla",
      model: "Wall Connector Gen 3",
      description:
        "Versatile Level 2 charger with NACS connector. Delivers up to 11.5 kW charging power. Wi-Fi enabled for over-the-air updates and monitoring. Compatible with all Tesla vehicles and other EVs with NACS adapter.",
      msrp: 550,
      salePrice: 475,
      stockStatus: "in_stock",
      leadTimeDays: 7,
      warrantyYears: 4,
      outputPower: 11.5,
      inputVoltage: "208-240V",
      cableLength: 24,
      numberOfPorts: 1,
      connectorTypes: JSON.stringify(["NACS"]),
      networkConnected: true,
      paymentCapable: false,
      loadManagement: true,
      installationType: "wall_mount",
      weatherRating: "NEMA 3R (outdoor rated)",
      certifications: JSON.stringify(["UL"]),
      electricalRequirements:
        "208-240V, 48A circuit. Requires 60A breaker.",
      installationCost: 750,
      installationRequirements:
        "Wall mounting. Electrical run from panel (up to 50 feet included in installation cost). Wi-Fi network access recommended.",
      locationAddress: "789 Innovation Blvd",
      locationCity: "Austin",
      locationState: "TX",
      locationZipCode: "78701",
      isPublicAccess: false,
      featuredImage:
        "https://images.unsplash.com/photo-1593941707445-f2bc9c1c9c5f?w=800",
    },
    {
      companyId,
      name: "Electrify America 350kW Ultra-Fast Charger",
      category: "dc_fast",
      manufacturer: "Electrify America",
      model: "Signet HPC",
      description:
        "Ultra-fast public charging station with up to 350 kW output. Dual cable design with CCS and CHAdeMO connectors. Integrated payment terminal and 27-inch touchscreen display. Perfect for high-traffic commercial locations.",
      msrp: 125000,
      salePrice: 118000,
      stockStatus: "made_to_order",
      leadTimeDays: 120,
      warrantyYears: 5,
      outputPower: 350,
      inputVoltage: "480V 3-phase",
      cableLength: 16,
      numberOfPorts: 2,
      connectorTypes: JSON.stringify(["CCS", "CHAdeMO"]),
      networkConnected: true,
      paymentCapable: true,
      loadManagement: true,
      installationType: "pedestal",
      weatherRating: "NEMA 3R (outdoor rated)",
      certifications: JSON.stringify(["UL", "CE", "OCPP 1.6"]),
      electricalRequirements:
        "480V 3-phase, 500A service. Requires utility-grade transformer and service upgrade.",
      installationCost: 45000,
      installationRequirements:
        "Concrete foundation 6'x8'x3' deep. Major electrical infrastructure upgrade required. Fiber or high-speed internet connection. ADA-compliant site preparation. Extensive permitting and utility coordination.",
      locationAddress: "1000 Highway Plaza",
      locationCity: "Denver",
      locationState: "CO",
      locationZipCode: "80202",
      isPublicAccess: true,
      featuredImage:
        "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800",
    },
    {
      companyId,
      name: "JuiceBox Pro 40 Smart Charger",
      category: "level_2",
      manufacturer: "Enel X",
      model: "JuiceBox Pro 40",
      description:
        "Smart Level 2 charger with 9.6 kW output. Wi-Fi and cellular connectivity for remote management. Supports time-of-use scheduling and load sharing. Great for small fleet or workplace charging.",
      msrp: 750,
      salePrice: 649,
      stockStatus: "in_stock",
      leadTimeDays: 10,
      warrantyYears: 3,
      outputPower: 9.6,
      inputVoltage: "240V",
      cableLength: 25,
      numberOfPorts: 1,
      connectorTypes: JSON.stringify(["SAE J1772"]),
      networkConnected: true,
      paymentCapable: false,
      loadManagement: true,
      installationType: "wall_mount",
      weatherRating: "NEMA 4 (outdoor rated)",
      certifications: JSON.stringify(["UL", "Energy Star"]),
      electricalRequirements: "240V, 40A circuit. Requires 50A breaker.",
      installationCost: 600,
      installationRequirements:
        "Wall or post mounting. Electrical run from panel. Wi-Fi or cellular connectivity for smart features.",
      locationAddress: "2000 Business Park Dr",
      locationCity: "Seattle",
      locationState: "WA",
      locationZipCode: "98101",
      isPublicAccess: false,
      featuredImage:
        "https://images.unsplash.com/photo-1593941707445-f2bc9c1c9c5f?w=800",
    },
    {
      companyId,
      name: "Blink IQ 200 Portable Charger",
      category: "portable",
      manufacturer: "Blink Charging",
      model: "IQ 200",
      description:
        "Portable Level 2 charging solution for temporary installations or mobile service. Includes carrying case and multiple plug adapters. Perfect for emergency charging or special events.",
      msrp: 850,
      salePrice: 725,
      stockStatus: "in_stock",
      leadTimeDays: 5,
      warrantyYears: 2,
      outputPower: 7.2,
      inputVoltage: "240V",
      cableLength: 20,
      numberOfPorts: 1,
      connectorTypes: JSON.stringify(["SAE J1772"]),
      networkConnected: false,
      paymentCapable: false,
      loadManagement: false,
      installationType: "portable",
      weatherRating: "NEMA 4 (outdoor rated)",
      certifications: JSON.stringify(["UL"]),
      electricalRequirements:
        "240V outlet (NEMA 14-50 or 6-50). No hardwiring required.",
      installationCost: 0,
      installationRequirements:
        "Plug-and-play. Requires existing 240V outlet. No installation needed.",
      featuredImage:
        "https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800",
    },
  ];

  console.log("Inserting charging infrastructure...");
  await db.insert(chargingInfrastructure).values(infrastructureData);

  console.log("✅ Seed completed successfully!");
  console.log(`- Added ${bodiesData.length} bodies/equipment items`);
  console.log(`- Added ${infrastructureData.length} charging infrastructure items`);
}

seedInventory()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

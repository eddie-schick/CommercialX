/**
 * Zod validation schema for vehicle listing form
 */

import { z } from "zod";

export const listingSchema = z
  .object({
    // Listing Type
    listingType: z.enum(["stock_unit", "build_to_order"]),

    // Vehicle Data
    vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/, {
      message: "VIN must be 17 characters and cannot contain I, O, or Q",
    }),
    year: z
      .number()
      .int()
      .min(2000)
      .max(new Date().getFullYear() + 1),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    series: z.string().optional(),
    bodyStyle: z.string().optional(),
    fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid", "cng", "propane"]),
    wheelbase: z.number().positive().optional(),
    gvwr: z.number().positive().optional(),
    payload: z.number().positive().optional(),
    engineDescription: z.string().optional(),
    transmission: z.string().optional(),
    driveType: z.enum(["RWD", "AWD", "4WD", "FWD"]).optional(),

    // Equipment Data (conditional)
    hasEquipment: z.boolean(),
    equipmentManufacturer: z.string().optional(),
    equipmentProductLine: z.string().optional(),
    equipmentType: z.string().optional(),
    equipmentLength: z.number().positive().optional(),
    equipmentWidth: z.number().positive().optional(),
    equipmentHeight: z.number().positive().optional(),
    equipmentWeight: z.number().positive().optional(),
    equipmentMaterial: z.string().optional(),
    doorConfiguration: z.string().optional(),
    compartmentCount: z.number().int().positive().optional(),
    hasInteriorLighting: z.boolean().optional(),
    hasExteriorLighting: z.boolean().optional(),

    // Dealer Listing Data
    askingPrice: z.number().positive("Asking price must be greater than 0"),
    specialPrice: z.number().positive().optional(),
    stockNumber: z.string().optional(),
    condition: z.enum(["new", "used", "certified_pre_owned", "demo"]),
    mileage: z.number().nonnegative().optional(),
    exteriorColor: z.string().optional(),
    interiorColor: z.string().optional(),
    description: z.string().optional(),
    locationCity: z.string().optional(),
    locationState: z.string().optional(),
    photos: z.array(z.string().url()).optional(),
    // Additional listing fields
    priceType: z.enum(["negotiable", "fixed", "call_for_price"]).optional(),
    paintCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
    interiorCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
    listingTitle: z.string().optional(),
    keyHighlights: z.string().optional(),
    marketingHeadline: z.string().optional(),
    isFeatured: z.boolean().optional(),
    isHotDeal: z.boolean().optional(),
    isClearance: z.boolean().optional(),
    warrantyType: z.string().optional(),
    warrantyExpiresAt: z.date().optional(),
    previousOwners: z.number().int().nonnegative().optional(),
    accidentHistory: z.string().optional(),
  })
  .refine(
    (data) => {
      // Mileage is required for used vehicles
      if (data.condition === "used" || data.condition === "certified_pre_owned") {
        return data.mileage !== undefined && data.mileage !== null;
      }
      return true;
    },
    {
      message: "Mileage is required for used vehicles",
      path: ["mileage"],
    }
  )
  .refine(
    (data) => {
      // Equipment details required when equipment is installed
      if (data.hasEquipment) {
        return (
          data.equipmentManufacturer !== undefined &&
          data.equipmentManufacturer !== null &&
          data.equipmentManufacturer.length > 0
        );
      }
      return true;
    },
    {
      message: "Equipment manufacturer is required when equipment is installed",
      path: ["equipmentManufacturer"],
    }
  )
  .refine(
    (data) => {
      // Special price must be less than asking price
      if (data.specialPrice !== undefined && data.specialPrice !== null) {
        return data.specialPrice < data.askingPrice;
      }
      return true;
    },
    {
      message: "Special price must be less than asking price",
      path: ["specialPrice"],
    }
  );

export type ListingFormData = z.infer<typeof listingSchema>;


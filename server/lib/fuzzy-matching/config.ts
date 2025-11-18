/**
 * Fuzzy Matching Configuration
 * Configurable tolerance levels for matching vehicle and equipment configurations
 */

export interface FuzzyMatchConfig {
  vehicleConfig: {
    wheelbase_tolerance_inches: number;
    gvwr_tolerance_lbs: number;
    weight_tolerance_percentage: number;
    dimension_tolerance_inches: number;
  };
  equipmentConfig: {
    length_tolerance_inches: number;
    width_tolerance_inches: number;
    height_tolerance_inches: number;
    weight_tolerance_lbs: number;
  };
  stringMatching: {
    similarity_threshold: number; // 0-1, for Levenshtein distance
    case_sensitive: boolean;
  };
}

/**
 * Default fuzzy matching configuration
 */
export const DEFAULT_FUZZY_MATCH_CONFIG: FuzzyMatchConfig = {
  vehicleConfig: {
    wheelbase_tolerance_inches: 1, // Commercial vehicles have precise wheelbase specs
    gvwr_tolerance_lbs: 100, // GVWR is exact for commercial vehicles
    weight_tolerance_percentage: 0.05, // 5% tolerance
    dimension_tolerance_inches: 2
  },
  equipmentConfig: {
    length_tolerance_inches: 6, // Equipment dimensions can vary slightly
    width_tolerance_inches: 6,
    height_tolerance_inches: 6,
    weight_tolerance_lbs: 100
  },
  stringMatching: {
    similarity_threshold: 0.85, // 85% similarity required
    case_sensitive: false
  }
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate string similarity (0-1, where 1 is identical)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

/**
 * Check if two strings match based on similarity threshold
 */
export function stringsMatch(
  str1: string | null | undefined,
  str2: string | null | undefined,
  threshold: number = DEFAULT_FUZZY_MATCH_CONFIG.stringMatching.similarity_threshold
): boolean {
  if (!str1 || !str2) return false;
  return calculateStringSimilarity(str1, str2) >= threshold;
}

/**
 * Check if two numeric values match within tolerance
 */
export function numbersMatch(
  val1: number | null | undefined,
  val2: number | null | undefined,
  tolerance: number
): boolean {
  if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
    return false;
  }
  return Math.abs(val1 - val2) <= tolerance;
}

/**
 * Check if two numeric values match within percentage tolerance
 */
export function numbersMatchPercentage(
  val1: number | null | undefined,
  val2: number | null | undefined,
  tolerancePercentage: number
): boolean {
  if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
    return false;
  }
  if (val1 === 0 && val2 === 0) return true;
  const maxVal = Math.max(Math.abs(val1), Math.abs(val2));
  const tolerance = maxVal * tolerancePercentage;
  return Math.abs(val1 - val2) <= tolerance;
}


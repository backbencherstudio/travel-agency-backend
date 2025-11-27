/**
 * Payment calculation utilities
 * Centralized calculation logic for commission and vendor payouts
 * Pure functions - no database access
 */

// Commission rates (single source of truth)
export const COMMISSION_RATE = 0.2; // 20% platform commission
export const VENDOR_RATE = 0.8; // 80% vendor payout

/**
 * Calculate commission amount from total amount
 * @param amount Total payment amount
 * @param rate Commission rate (default: COMMISSION_RATE)
 * @returns Commission amount
 */
export function calculateCommission(amount: number, rate: number = COMMISSION_RATE): number {
    return amount * rate;
}

/**
 * Calculate vendor payout amount from total amount
 * @param amount Total payment amount
 * @param vendorRate Vendor rate (default: VENDOR_RATE)
 * @returns Vendor payout amount
 */
export function calculateVendorPayout(amount: number, vendorRate: number = VENDOR_RATE): number {
    return amount * vendorRate;
}

/**
 * Calculate both commission and vendor payout from total amount
 * @param amount Total payment amount
 * @returns Object with commission and vendorPayout
 */
export function calculateCommissionAndPayout(amount: number): {
    commission: number;
    vendorPayout: number;
} {
    return {
        commission: calculateCommission(amount),
        vendorPayout: calculateVendorPayout(amount),
    };
}


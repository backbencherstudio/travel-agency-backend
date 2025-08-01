import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';


@Injectable()
export class BookingUtilsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Calculate traveler counts from travelers array
     */
    calculateTravelerCounts(travelers: any[]) {
        const adults_count = travelers.filter(t => t.type === 'adult').length;
        const children_count = travelers.filter(t => t.type === 'child').length;
        const infants_count = travelers.filter(t => t.type === 'infant').length;
        const total_travelers = adults_count + children_count + infants_count;

        return {
            adults_count,
            children_count,
            infants_count,
            total_travelers,
        };
    }

    /**
     * Calculate prices with discounts
     */
    async calculatePrices(checkout_id: string, total_price: number) {
        // For now, return the total price as final price since discounts are already applied
        // in the checkout items' final_price field
        return {
            total_price,
            discount_amount: 0, // Discounts are already applied in checkout items
            final_price: total_price,
        };
    }

    /**
     * Validate package availability
     */
    async validatePackageAvailability(package_id: string, selected_date: string, package_type: string) {
        if (package_type === 'tour') {
            return {
                is_available: true,
                available_slots: 999,
                validation_message: 'Tour packages are always available',
            };
        }

        // For non-tour packages, check if the date is in the future
        const selectedDate = new Date(selected_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            return {
                is_available: false,
                available_slots: 0,
                validation_message: 'Selected date cannot be in the past',
            };
        }

        // For now, assume all future dates are available for non-tour packages
        // This can be enhanced later with specific availability logic
        return {
            is_available: true,
            available_slots: 50, // Default available slots
            validation_message: 'Availability confirmed',
        };
    }

    /**
     * Copy contact information from source to target
     */
    copyContactInfo(source: any, target: any) {
        const contactFields = [
            'email', 'phone_number', 'address1', 'address2',
            'city', 'state', 'zip_code', 'country', 'first_name', 'last_name'
        ];

        contactFields.forEach(field => {
            if (source[field]) {
                target[field] = source[field];
            }
        });

        return target;
    }



    /**
 * Validate traveler ages
 */
    validateTravelerAges(travelers: any[]) {
        const errors = [];

        travelers.forEach((traveller, index) => {
            if (traveller.age !== undefined) {
                if (traveller.type === 'adult' && (traveller.age < 12 || traveller.age > 80)) {
                    errors.push(`Traveler ${index + 1}: Adult age must be between 12-80 years`);
                } else if (traveller.type === 'child' && (traveller.age < 4 || traveller.age > 11)) {
                    errors.push(`Traveler ${index + 1}: Child age must be between 4-11 years`);
                } else if (traveller.type === 'infant' && (traveller.age < 0 || traveller.age > 3)) {
                    errors.push(`Traveler ${index + 1}: Infant age must be between 0-3 years`);
                }
            }
        });

        return errors;
    }

    /**
     * Generate travelers array from counts
     */
    generateTravelersFromCounts(adults_count: number, children_count: number, infants_count: number) {
        const travelers: any[] = [];

        // Add adults
        for (let i = 0; i < adults_count; i++) {
            travelers.push({
                full_name: `Adult ${i + 1}`,
                type: 'adult',
                age: 25, // Default age
            });
        }

        // Add children
        for (let i = 0; i < children_count; i++) {
            travelers.push({
                full_name: `Child ${i + 1}`,
                type: 'child',
                age: 8, // Default age
            });
        }

        // Add infants
        for (let i = 0; i < infants_count; i++) {
            travelers.push({
                full_name: `Infant ${i + 1}`,
                type: 'infant',
                age: 1, // Default age
            });
        }

        return travelers;
    }
} 
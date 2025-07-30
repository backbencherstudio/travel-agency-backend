import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckoutRepository } from '../repository/checkout/checkout.repository';

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
        const discount_data = await CheckoutRepository.calculateCoupon(checkout_id);
        const discount_amount = discount_data[0]?.discount_amount || 0;
        const final_price = total_price - discount_amount;

        return {
            total_price,
            discount_amount,
            final_price,
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

        const availability = await this.prisma.packageAvailability.findFirst({
            where: {
                package_id: package_id,
                OR: [
                    {
                        available_date: new Date(selected_date),
                        is_available: true,
                    },
                    {
                        start_date: { lte: new Date(selected_date) },
                        end_date: { gte: new Date(selected_date) },
                        is_available: true,
                    },
                ],
            },
        });

        if (!availability) {
            return {
                is_available: false,
                available_slots: 0,
                validation_message: 'Selected date is not available for this package',
            };
        }

        return {
            is_available: true,
            available_slots: availability.available_slots || 0,
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
     * Create availability record data
     */
    createAvailabilityData(
        entity_id: string,
        package_id: string,
        selected_date: Date,
        traveler_counts: any,
        price_info: any,
        validation_result: any
    ) {
        return {
            package_id: package_id,
            selected_date: selected_date,
            requested_adults: traveler_counts.adults_count,
            requested_children: traveler_counts.children_count,
            requested_infants: traveler_counts.infants_count,
            requested_total: traveler_counts.total_travelers,
            is_available: validation_result.is_available,
            available_slots: validation_result.available_slots,
            remaining_slots: validation_result.available_slots - traveler_counts.total_travelers,
            price_per_person: price_info.price_per_person,
            total_price: price_info.total_price,
            validation_message: validation_result.validation_message,
        };
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
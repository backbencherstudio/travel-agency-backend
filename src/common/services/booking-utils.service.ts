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
     * Validate package availability against PackageAvailability records
     */
    async validatePackageAvailability(package_id: string, selected_date: string, package_type: string, requested_travelers: number = 1) {
        // For tour packages, always return available
        if (package_type === 'tour') {
            return {
                is_available: true,
                available_slots: 999,
                validation_message: 'Tour packages are always available',
            };
        }

        // For package and cruise types, check PackageAvailability records
        if (package_type === 'package' || package_type === 'cruise') {
            const selectedDate = new Date(selected_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Check if selected date is in the past
            if (selectedDate < today) {
                return {
                    is_available: false,
                    available_slots: 0,
                    validation_message: 'Selected date cannot be in the past',
                };
            }

            // Find matching PackageAvailability records
            const availabilityRecords = await this.prisma.packageAvailability.findMany({
                where: {
                    package_id: package_id,
                    status: 1,
                    deleted_at: null,
                    is_available: true,
                    OR: [
                        // Single date availability
                        {
                            start_date: selectedDate,
                            end_date: null,
                        },
                        // Date range availability (selected date falls within range)
                        {
                            start_date: { lte: selectedDate },
                            end_date: { gte: selectedDate },
                        },
                        // Date range availability (null start_date means from beginning)
                        {
                            start_date: null,
                            end_date: { gte: selectedDate },
                        },
                        // Date range availability (null end_date means until end)
                        {
                            start_date: { lte: selectedDate },
                            end_date: null,
                        },
                        // No date constraints (always available)
                        {
                            start_date: null,
                            end_date: null,
                        },
                    ],
                },
                orderBy: { created_at: 'desc' },
            });

            if (availabilityRecords.length === 0) {
                return {
                    is_available: false,
                    available_slots: 0,
                    validation_message: 'No availability found for the selected date',
                };
            }

            // Find the most relevant availability record
            let bestMatch = availabilityRecords[0];
            let maxSlots = 0;

            for (const record of availabilityRecords) {
                const slots = record.available_slots || 0;
                if (slots > maxSlots) {
                    maxSlots = slots;
                    bestMatch = record;
                }
            }

            // Check if enough slots are available
            if (bestMatch.available_slots < requested_travelers) {
                return {
                    is_available: false,
                    available_slots: bestMatch.available_slots || 0,
                    validation_message: `Only ${bestMatch.available_slots} slots available for selected date`,
                };
            }

            return {
                is_available: true,
                available_slots: bestMatch.available_slots || 0,
                validation_message: 'Availability confirmed',
                availability_id: bestMatch.id,
            };
        }

        // Default fallback for other package types
        return {
            is_available: true,
            available_slots: 50,
            validation_message: 'Availability confirmed',
        };
    }

    /**
     * Reserve slots in PackageAvailability when booking is confirmed
     */
    async reservePackageSlots(package_id: string, selected_date: string, package_type: string, reserved_travelers: number) {
        // Only process for package and cruise types
        if (package_type !== 'package' && package_type !== 'cruise') {
            return { success: true, message: 'No slot reservation needed for this package type' };
        }

        const selectedDate = new Date(selected_date);

        // Find the availability record to update
        const availabilityRecord = await this.prisma.packageAvailability.findFirst({
            where: {
                package_id: package_id,
                status: 1,
                deleted_at: null,
                is_available: true,
                OR: [
                    // Single date availability
                    {
                        start_date: selectedDate,
                        end_date: null,
                    },
                    // Date range availability (selected date falls within range)
                    {
                        start_date: { lte: selectedDate },
                        end_date: { gte: selectedDate },
                    },
                    // Date range availability (null start_date means from beginning)
                    {
                        start_date: null,
                        end_date: { gte: selectedDate },
                    },
                    // Date range availability (null end_date means until end)
                    {
                        start_date: { lte: selectedDate },
                        end_date: null,
                    },
                    // No date constraints (always available)
                    {
                        start_date: null,
                        end_date: null,
                    },
                ],
            },
            orderBy: { created_at: 'desc' },
        });

        if (!availabilityRecord) {
            return { success: false, message: 'No availability record found to update' };
        }

        // Check if enough slots are available
        const currentSlots = availabilityRecord.available_slots || 0;
        if (currentSlots < reserved_travelers) {
            return {
                success: false,
                message: `Insufficient slots. Available: ${currentSlots}, Requested: ${reserved_travelers}`
            };
        }

        // Update the availability record
        const updatedRecord = await this.prisma.packageAvailability.update({
            where: { id: availabilityRecord.id },
            data: {
                available_slots: currentSlots - reserved_travelers,
                updated_at: new Date(),
            },
        });

        return {
            success: true,
            message: `Successfully reserved ${reserved_travelers} slots`,
            remaining_slots: updatedRecord.available_slots,
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
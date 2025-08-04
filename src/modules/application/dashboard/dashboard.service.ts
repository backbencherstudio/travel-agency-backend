import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

@Injectable()
export class DashboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getDashboardStats(user_id: string) {
        try {
            // Get tour statistics
            const tourComplete = await this.prisma.booking.count({
                where: {
                    user_id: user_id,
                    status: 'confirmed',
                    deleted_at: null,
                },
            });

            const tourCanceled = await this.prisma.booking.count({
                where: {
                    user_id: user_id,
                    status: 'cancelled',
                    deleted_at: null,
                },
            });

            const upcoming = await this.prisma.booking.count({
                where: {
                    user_id: user_id,
                    status: 'pending',
                    deleted_at: null,
                },
            });

            return {
                success: true,
                data: {
                    tour_complete: tourComplete,
                    tour_canceled: tourCanceled,
                    upcoming: upcoming,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async getUserBookings(
        user_id: string,
        page: number = 1,
        limit: number = 10,
        status?: string,
        booking_type?: string,
        search?: string,
    ) {
        try {
            const skip = (page - 1) * limit;

            // Build where conditions
            const where: any = {
                user_id: user_id,
                deleted_at: null,
            };

            // Add status filter
            if (status && status !== 'all') {
                where.status = status;
            }

            // Add booking type filter
            if (booking_type && booking_type !== 'all') {
                where.booking_type = booking_type;
            }

            // Add search filter
            if (search) {
                where.OR = [
                    { invoice_number: { contains: search, mode: 'insensitive' } },
                    { booking_items: { some: { package: { name: { contains: search, mode: 'insensitive' } } } } },
                ];
            }

            // Get bookings with pagination
            const bookings = await this.prisma.booking.findMany({
                where,
                orderBy: {
                    created_at: 'desc',
                },
                skip,
                take: limit,
                select: {
                    id: true,
                    invoice_number: true,
                    booking_date_time: true,
                    total_amount: true,
                    status: true,
                    booking_type: true,
                    booking_items: {
                        select: {
                            package: {
                                select: {
                                    id: true,
                                    name: true,
                                    type: true,
                                    package_files: {
                                        select: {
                                            id: true,
                                            file: true,
                                            file_alt: true,
                                        },
                                        take: 1,
                                    },
                                },
                            },
                            selected_date: true,
                            total_travelers: true,
                        },
                    },
                    payment_transactions: {
                        select: {
                            status: true,
                            amount: true,
                            currency: true,
                        },
                        take: 1,
                    },
                    created_at: true,
                    updated_at: true,
                },
            });

            // Get total count for pagination
            const totalBookings = await this.prisma.booking.count({
                where,
            });
           

            // Calculate pagination info
            const totalPages = Math.ceil(totalBookings / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                success: true,
                data: {
                    bookings,
                    pagination: {
                        page: page,
                        limit: limit,
                        total: totalBookings,
                        totalPages: totalPages,
                        hasNextPage: hasNextPage,
                        hasPreviousPage: hasPreviousPage,
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async getBookingDetails(booking_id: string, user_id: string) {
        try {
            const booking = await this.prisma.booking.findFirst({
                where: {
                    id: booking_id,
                    user_id: user_id,
                    deleted_at: null,
                },
                select: {
                    id: true,
                    invoice_number: true,
                    status: true,
                    booking_type: true,
                    total_amount: true,
                    discount_amount: true,
                    final_price: true,
                    booking_date_time: true,
                    email: true,
                    phone_number: true,
                    address1: true,
                    address2: true,
                    city: true,
                    state: true,
                    zip_code: true,
                    country: true,
                    comments: true,
                    booking_items: {
                        select: {
                            selected_date: true,
                            adults_count: true,
                            children_count: true,
                            infants_count: true,
                            total_travelers: true,
                            price_per_person: true,
                            total_price: true,
                            final_price: true,
                            package: {
                                select: {
                                    id: true,
                                    name: true,
                                    description: true,
                                    type: true,
                                    duration: true,
                                    package_files: {
                                        select: {
                                            id: true,
                                            file: true,
                                            file_alt: true,
                                        },
                                    },
                                    package_destinations: {
                                        select: {
                                          destination: {
                                            select: {
                                              name: true,
                                              latitude: true,
                                              longitude: true,
                                              address: true,
                                              country: {
                                                select: {
                                                  name: true,
                                                },
                                              },
                                            },
                                          },
                                        },
                                      },
                                      package_categories: {
                                        select: {
                                          category: {
                                            select: {
                                              name: true,
                                            },
                                          },
                                        },
                                      },
                                      package_languages: {
                                        select: {
                                          language: {
                                            select: {
                                              name: true,
                                            },
                                          },
                                        },
                                      },
                                      package_trip_plans: {
                                        select: {
                                          title: true,
                                          description: true,
                                          duration: true,
                                          duration_type: true,
                                          package_trip_plan_images: {
                                            select: {
                                              image: true,
                                            },
                                          },
                                        },
                                      },
                                },
                            },
                        },
                    },
                    booking_travellers: {
                        select: {
                            full_name: true,
                            type: true,
                            age: true,
                            gender: true,
                            email: true,
                            phone_number: true,
                        },
                    },
                    booking_extra_services: {
                        select: {
                            extra_service: {
                                select: {
                                    name: true,
                                    description: true,
                                    price: true,
                                },
                            },
                            price: true,
                        },
                    },
                    payment_transactions: {
                        select: {
                            status: true,
                            amount: true,
                            currency: true,
                            provider: true,
                            reference_number: true,
                            created_at: true,
                        },
                        orderBy: {
                            created_at: 'desc',
                        },
                    },
                    created_at: true,
                    updated_at: true,
                },
            });

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found',
                };
            }

            // Add image URLs
            for (const item of booking.booking_items) {
                for (const file of item.package.package_files) {
                    if (file.file) {
                        file['package_image'] = SojebStorage.url(
                            appConfig().storageUrl.package + file.file,
                        );
                    }
                }
            }

            // add package trip plan images
            for (const item of booking.booking_items) {
                for (const tripPlan of item.package.package_trip_plans) {
                    for (const image of tripPlan.package_trip_plan_images) {
                        image['package_trip_plan_image'] = SojebStorage.url(
                            appConfig().storageUrl.package + image.image,
                        );
                    }
                }
            }

            return {
                success: true,
                data: booking,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}

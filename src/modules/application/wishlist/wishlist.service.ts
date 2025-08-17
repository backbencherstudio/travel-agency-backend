import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateWishListDto } from './dto/create-wishlist.dto';
import { UpdateWishListDto } from './dto/update-wishlist.dto';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

@Injectable()
export class WishListService {
    constructor(private readonly prisma: PrismaService) { }

    async create(user_id: string, createWishListDto: CreateWishListDto) {
        try {
            // Check if package exists
            const packageExists = await this.prisma.package.findUnique({
                where: { id: createWishListDto.package_id },
            });

            if (!packageExists) {
                return {
                    success: false,
                    message: 'Package not found',
                };
            }

            // Check if already in wishlist
            const existingWishlist = await this.prisma.wishList.findUnique({
                where: {
                    user_id_package_id: {
                        user_id: user_id,
                        package_id: createWishListDto.package_id,
                    },
                },
            });

            if (existingWishlist) {
                return {
                    success: false,
                    message: 'Package already in wishlist',
                };
            }

            return {
                success: true,
                message: 'Package added to wishlist successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async findAll(user_id: string, pagination?: { page?: number; limit?: number }) {
        try {
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const skip = (page - 1) * limit;

            // Get total count
            const total = await this.prisma.wishList.count({
                where: {
                    user_id: user_id,
                    deleted_at: null,
                },
            });

            const wishlists = await this.prisma.wishList.findMany({
                where: {
                    user_id: user_id,
                },
                skip: skip,
                take: limit,
                include: {
                    package: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                            final_price: true,
                            duration: true,
                            duration_type: true,
                            type: true,
                            package_files: {
                                select: {
                                    id: true,
                                    file: true,
                                },
                            },
                            package_destinations: {
                                select: {
                                    destination: {
                                        select: {
                                            id: true,
                                            name: true,
                                            country: {
                                                select: {
                                                    id: true,
                                                    name: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            reviews: {
                                select: {
                                    rating_value: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    created_at: 'desc',
                },
            });

            // Process wishlists to add computed fields
            for (const wishlist of wishlists) {
                // Add file URLs
                if (wishlist.package.package_files) {
                    for (const file of wishlist.package.package_files) {
                        file['file_url'] = SojebStorage.url(
                            appConfig().storageUrl.package + file.file,
                        );
                    }
                }

                // Calculate average rating
                if (wishlist.package.reviews && wishlist.package.reviews.length > 0) {
                    const totalRating = wishlist.package.reviews.reduce(
                        (sum, review) => sum + review.rating_value,
                        0,
                    );
                    wishlist.package['average_rating'] = totalRating / wishlist.package.reviews.length;
                    wishlist.package['review_count'] = wishlist.package.reviews.length;
                } else {
                    wishlist.package['average_rating'] = 0;
                    wishlist.package['review_count'] = 0;
                }

                // Remove reviews array as we've processed it
                delete wishlist.package.reviews;
            }

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                success: true,
                data: wishlists,
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    totalPages: totalPages,
                    hasNextPage: hasNextPage,
                    hasPreviousPage: hasPreviousPage,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async findOne(user_id: string, id: string) {
        try {
            const wishlist = await this.prisma.wishList.findFirst({
                where: {
                    id: id,
                    user_id: user_id,
                    deleted_at: null,
                },
                include: {
                    package: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                            final_price: true,
                            duration: true,
                            duration_type: true,
                            type: true,
                            min_adults: true,
                            max_adults: true,
                            min_children: true,
                            max_children: true,
                            min_infants: true,
                            max_infants: true,
                            package_files: {
                                select: {
                                    id: true,
                                    file: true,
                                },
                            },
                            package_destinations: {
                                select: {
                                    destination: {
                                        select: {
                                            id: true,
                                            name: true,
                                            country: {
                                                select: {
                                                    id: true,
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
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                            reviews: {
                                select: {
                                    rating_value: true,
                                    comment: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!wishlist) {
                return {
                    success: false,
                    message: 'Wishlist item not found',
                };
            }

            // Add file URLs
            if (wishlist.package.package_files) {
                for (const file of wishlist.package.package_files) {
                    file['file_url'] = SojebStorage.url(
                        appConfig().storageUrl.package + file.file,
                    );
                }
            }

            // Calculate average rating
            if (wishlist.package.reviews && wishlist.package.reviews.length > 0) {
                const totalRating = wishlist.package.reviews.reduce(
                    (sum, review) => sum + review.rating_value,
                    0,
                );
                wishlist.package['average_rating'] = totalRating / wishlist.package.reviews.length;
                wishlist.package['review_count'] = wishlist.package.reviews.length;
            } else {
                wishlist.package['average_rating'] = 0;
                wishlist.package['review_count'] = 0;
            }

            // Remove reviews array as we've processed it
            delete wishlist.package.reviews;

            return {
                success: true,
                data: wishlist,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async update(user_id: string, id: string, updateWishListDto: UpdateWishListDto) {
        try {
            const wishlist = await this.prisma.wishList.findFirst({
                where: {
                    id: id,
                    user_id: user_id,
                    deleted_at: null,
                },
            });

            if (!wishlist) {
                return {
                    success: false,
                    message: 'Wishlist item not found',
                };
            }

            const updatedWishlist = await this.prisma.wishList.update({
                where: {
                    id: id,
                },
                data: {
                    note: updateWishListDto.note,
                },
                include: {
                    package: {
                        select: {
                            id: true,
                            name: true,
                            description: true,
                            price: true,
                            final_price: true,
                            duration: true,
                            duration_type: true,
                            package_files: {
                                select: {
                                    id: true,
                                    file: true,
                                },
                            },
                        },
                    },
                },
            });

            // Add file URLs
            if (updatedWishlist.package.package_files) {
                for (const file of updatedWishlist.package.package_files) {
                    file['file_url'] = SojebStorage.url(
                        appConfig().storageUrl.package + file.file,
                    );
                }
            }

            return {
                success: true,
                message: 'Wishlist item updated successfully',
                data: updatedWishlist,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async remove(user_id: string, id: string) {
        try {
            const wishlist = await this.prisma.wishList.findFirst({
                where: {
                    id: id,
                    user_id: user_id,
                    deleted_at: null,
                },
            });

            if (!wishlist) {
                return {
                    success: false,
                    message: 'Wishlist item not found',
                };
            }

            await this.prisma.wishList.delete({
                where: {
                    id: id,
                }
            });

            return {
                success: true,
                message: 'Wishlist item removed successfully',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
} 
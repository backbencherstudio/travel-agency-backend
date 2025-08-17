import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JumioService } from '../../../common/lib/Jumio/JumioService';
import { CreateJumioVerificationDto } from './dto/create-jumio-verification.dto';
import { UpdateJumioVerificationDto } from './dto/update-jumio-verification.dto';
import { QueryJumioVerificationDto } from './dto/query-jumio-verification.dto';
import { ReviewJumioVerificationDto } from './dto/review-jumio-verification.dto';

@Injectable()
export class JumioVerificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jumioService: JumioService
    ) { }

    async create(createJumioVerificationDto: CreateJumioVerificationDto) {
        // Check if user exists
        const user = await this.prisma.user.findUnique({
            where: { id: createJumioVerificationDto.user_id }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        try {
            // Create verification with Jumio API
            const jumioRequest = {
                userReference: createJumioVerificationDto.user_id,
                callbackUrl: createJumioVerificationDto.callback_url,
                verificationType: createJumioVerificationDto.verification_type as 'IDENTITY_VERIFICATION' | 'FACE_VERIFICATION' | 'DOCUMENT_VERIFICATION',
                customerInternalReference: `user_${createJumioVerificationDto.user_id}_${Date.now()}`,
                userConsent: createJumioVerificationDto.user_consent,
                country: createJumioVerificationDto.country,
                documentType: createJumioVerificationDto.document_type as 'ID_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE' | 'VISA',
                enabledFields: createJumioVerificationDto.enabled_fields,
                locale: createJumioVerificationDto.locale,
            };

            const jumioResponse = await this.jumioService.createVerification(jumioRequest);

            // Create verification record in database
            const verification = await this.prisma.jumioVerification.create({
                data: {
                    user_id: createJumioVerificationDto.user_id,
                    verification_type: createJumioVerificationDto.verification_type,
                    jumio_reference_id: jumioResponse.scanReference,
                    jumio_status: 'PENDING',
                    jumio_created_at: new Date(jumioResponse.timestamp),
                    session_expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                    is_completed: false,
                }
            });

            return {
                success: true,
                message: 'Jumio verification created successfully',
                data: {
                    ...verification,
                    jumio_redirect_url: jumioResponse.redirectUrl,
                    jumio_web_url: jumioResponse.web.href,
                    jumio_sdk_url: jumioResponse.sdk.href,
                }
            };
        } catch (error) {
            throw new BadRequestException(`Failed to create Jumio verification: ${error.message}`);
        }
    }

    async findAll(query: QueryJumioVerificationDto) {
        const { page = 1, limit = 10, search, verification_type, jumio_status, is_completed, manually_reviewed, user_id } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            deleted_at: null
        };

        if (search) {
            where.OR = [
                { jumio_reference_id: { contains: search, mode: 'insensitive' } },
                { admin_notes: { contains: search, mode: 'insensitive' } },
                { error_message: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (verification_type) {
            where.verification_type = verification_type;
        }

        if (jumio_status) {
            where.jumio_status = jumio_status;
        }

        if (is_completed !== undefined) {
            where.is_completed = is_completed === 'true';
        }

        if (manually_reviewed !== undefined) {
            where.manually_reviewed = manually_reviewed === 'true';
        }

        if (user_id) {
            where.user_id = user_id;
        }



        // Get total count
        const total = await this.prisma.jumioVerification.count({ where });

        // Get verifications with pagination
        const verifications = await this.prisma.jumioVerification.findMany({
            where,
            skip,
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_documents: {
                    select: {
                        id: true,
                        title: true,
                        document_type: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        const totalPages = Math.ceil(total / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return {
            success: true,
            data: verifications,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage,
                hasPreviousPage
            }
        };
    }

    async findOne(id: string) {
        const jumioVerification = await this.prisma.jumioVerification.findFirst({
            where: {
                id,
                deleted_at: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_documents: {
                    select: {
                        id: true,
                        title: true,
                        document_type: true
                    }
                }
            }
        });

        if (!jumioVerification) {
            throw new NotFoundException('Jumio verification not found');
        }

        return { success: true, data: jumioVerification };
    }

    async update(id: string, updateJumioVerificationDto: UpdateJumioVerificationDto) {
        // Check if verification exists
        const existingVerification = await this.prisma.jumioVerification.findFirst({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!existingVerification) {
            throw new NotFoundException('Jumio verification not found');
        }

        // If user_id is being updated, check if user exists
        if (updateJumioVerificationDto.user_id) {
            const user = await this.prisma.user.findUnique({
                where: { id: updateJumioVerificationDto.user_id }
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }
        }

        const updateData: any = { ...updateJumioVerificationDto };

        const jumioVerification = await this.prisma.jumioVerification.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_documents: {
                    select: {
                        id: true,
                        title: true,
                        document_type: true
                    }
                }
            }
        });

        return { success: true, data: jumioVerification };
    }

    async remove(id: string) {
        const jumioVerification = await this.prisma.jumioVerification.findFirst({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!jumioVerification) {
            throw new NotFoundException('Jumio verification not found');
        }

        // Soft delete
        await this.prisma.jumioVerification.update({
            where: { id },
            data: { deleted_at: new Date() }
        });

        return { success: true, message: 'Jumio verification deleted successfully' };
    }

    async reviewVerification(id: string, reviewDto: ReviewJumioVerificationDto, adminUserId: string) {
        const jumioVerification = await this.prisma.jumioVerification.findFirst({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!jumioVerification) {
            throw new NotFoundException('Jumio verification not found');
        }

        const updateData: any = {
            jumio_status: reviewDto.jumio_status,
            manually_reviewed: reviewDto.manually_reviewed ?? true,
            reviewed_at: new Date(),
            reviewed_by: adminUserId
        };

        if (reviewDto.admin_notes) {
            updateData.admin_notes = reviewDto.admin_notes;
        }

        if (reviewDto.verification_score !== undefined) {
            updateData.verification_score = reviewDto.verification_score;
        }

        if (reviewDto.is_completed !== undefined) {
            updateData.is_completed = reviewDto.is_completed;
            if (reviewDto.is_completed && !jumioVerification.is_completed) {
                updateData.completed_at = new Date();
            }
        }

        const updatedVerification = await this.prisma.jumioVerification.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_documents: {
                    select: {
                        id: true,
                        title: true,
                        document_type: true
                    }
                }
            }
        });

        return { success: true, data: updatedVerification };
    }

    async getVerificationsByUser(userId: string) {
        const verifications = await this.prisma.jumioVerification.findMany({
            where: {
                user_id: userId,
                deleted_at: null
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                legal_documents: {
                    select: {
                        id: true,
                        title: true,
                        document_type: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return { success: true, data: verifications };
    }


    async getVerificationStats(): Promise<{
        total: number;
        pending: number;
        approved: number;
        denied: number;
        error: number;
        expired: number;
        completed: number;
        manually_reviewed: number;
    }> {
        const [
            total,
            pending,
            approved,
            denied,
            error,
            expired,
            completed,
            manually_reviewed
        ] = await Promise.all([
            this.prisma.jumioVerification.count({ where: { deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { jumio_status: 'pending', deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { jumio_status: 'approved', deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { jumio_status: 'denied', deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { jumio_status: 'error', deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { jumio_status: 'expired', deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { is_completed: true, deleted_at: null } }),
            this.prisma.jumioVerification.count({ where: { manually_reviewed: true, deleted_at: null } })
        ]);

        return {
            total,
            pending,
            approved,
            denied,
            error,
            expired,
            completed,
            manually_reviewed
        };
    }

    async getVerificationStatus(verificationId: string) {
        const verification = await this.prisma.jumioVerification.findFirst({
            where: {
                id: verificationId,
                deleted_at: null
            }
        });

        if (!verification) {
            throw new NotFoundException('Verification not found');
        }

        if (!verification.jumio_reference_id) {
            throw new BadRequestException('No Jumio reference ID found');
        }

        try {
            // Get status from Jumio API
            const jumioStatus = await this.jumioService.getVerificationStatus(verification.jumio_reference_id);

            // Update local database with Jumio response
            const updatedVerification = await this.prisma.jumioVerification.update({
                where: { id: verificationId },
                data: {
                    jumio_status: jumioStatus.verification.status,
                    jumio_updated_at: new Date(jumioStatus.timestamp),
                    jumio_result: JSON.stringify(jumioStatus),
                    document_type: jumioStatus.verification.document?.type,
                    document_country: jumioStatus.verification.document?.country,
                    document_number: jumioStatus.verification.document?.number,
                    first_name: jumioStatus.verification.identity?.firstName,
                    last_name: jumioStatus.verification.identity?.lastName,
                    date_of_birth: jumioStatus.verification.identity?.dateOfBirth ? new Date(jumioStatus.verification.identity.dateOfBirth) : null,
                    nationality: jumioStatus.verification.identity?.nationality,
                    verification_score: jumioStatus.verification.verification?.score,
                    verification_confidence: jumioStatus.verification.verification?.confidence,
                    is_completed: true,
                    jumio_completed_at: new Date(),
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    legal_documents: {
                        select: {
                            id: true,
                            title: true,
                            document_type: true
                        }
                    }
                }
            });

            return {
                success: true,
                data: {
                    ...updatedVerification,
                    jumio_status_response: jumioStatus
                }
            };
        } catch (error) {
            throw new BadRequestException(`Failed to get verification status: ${error.message}`);
        }
    }

    async getVerificationDetails(verificationId: string) {
        const verification = await this.prisma.jumioVerification.findFirst({
            where: {
                id: verificationId,
                deleted_at: null
            }
        });

        if (!verification) {
            throw new NotFoundException('Verification not found');
        }

        if (!verification.jumio_reference_id) {
            throw new BadRequestException('No Jumio reference ID found');
        }

        try {
            // Get detailed data from Jumio API
            const jumioDetails = await this.jumioService.getVerificationDetails(verification.jumio_reference_id);

            return {
                success: true,
                data: {
                    verification,
                    jumio_details: jumioDetails
                }
            };
        } catch (error) {
            throw new BadRequestException(`Failed to get verification details: ${error.message}`);
        }
    }

    async deleteVerification(verificationId: string) {
        const verification = await this.prisma.jumioVerification.findFirst({
            where: {
                id: verificationId,
                deleted_at: null
            }
        });

        if (!verification) {
            throw new NotFoundException('Verification not found');
        }

        try {
            // Delete from Jumio API if reference exists
            if (verification.jumio_reference_id) {
                await this.jumioService.deleteVerification(verification.jumio_reference_id);
            }

            // Soft delete from local database
            await this.prisma.jumioVerification.update({
                where: { id: verificationId },
                data: { deleted_at: new Date() }
            });

            return { success: true, message: 'Verification deleted successfully' };
        } catch (error) {
            throw new BadRequestException(`Failed to delete verification: ${error.message}`);
        }
    }
}

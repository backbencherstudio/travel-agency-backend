/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Controller,
    Get,
    Post,
    UseGuards,
    Req,
    Body,
    Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { EscrowService } from './escrow.service';
import { EscrowExceptionsService } from './escrow-exceptions.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { StripeConnect } from '../../../common/lib/Payment/stripe/StripeConnect';
import appConfig from '../../../config/app.config';

@ApiBearerAuth()
@ApiTags('Escrow')
@UseGuards(JwtAuthGuard)
@Controller('escrow')
export class EscrowController {
    constructor(
        private readonly escrowService: EscrowService,
        private readonly escrowExceptionsService: EscrowExceptionsService,
        private readonly prisma: PrismaService,
    ) { }

    @Get('funds')
    async getRetainedFunds(@Req() req: Request) {
        try {
            const user_id = req.user.userId;
            const user = await UserRepository.getUserDetails(user_id);

            if (!user || user.type !== 'vendor') {
                return {
                    success: false,
                    message: 'Only vendors can view retained funds',
                };
            }

            // Get all bookings with held funds for this vendor
            const bookings = await this.prisma.booking.findMany({
                where: {
                    vendor_id: user_id,
                    escrow_status: 'held',
                    payment_status: 'succeeded',
                    deleted_at: null,
                },
                include: {
                    booking_items: {
                        include: {
                            package: {
                                select: {
                                    name: true,
                                    duration: true,
                                    duration_type: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
            });

            const totalHeld = bookings.reduce(
                (sum, booking) => sum + Number(booking.paid_amount || 0),
                0,
            );

            return {
                success: true,
                data: {
                    total_held: totalHeld,
                    bookings_count: bookings.length,
                    bookings: bookings.map((booking) => ({
                        booking_id: booking.id,
                        invoice_number: booking.invoice_number,
                        amount: booking.paid_amount,
                        currency: booking.paid_currency,
                        escrow_status: booking.escrow_status,
                        created_at: booking.created_at,
                        package_name: booking.booking_items[0]?.package?.name,
                    })),
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Get('onboarding-link')
    async getOnboardingLink(@Req() req: Request) {
        try {
            const user_id = req.user.userId;
            const user = await UserRepository.getUserDetails(user_id);

            if (!user || user.type !== 'vendor') {
                return {
                    success: false,
                    message: 'Only vendors can access onboarding link',
                };
            }

            if (!user.stripe_connect_account_id) {
                return {
                    success: false,
                    message: 'Vendor does not have Stripe Connect account. Please contact admin.',
                };
            }

            // Check account status
            const connectAccount = await StripeConnect.getConnectAccount(
                user.stripe_connect_account_id,
            );

            const transfersCapability = connectAccount.capabilities?.transfers;
            const cardPaymentsCapability = connectAccount.capabilities?.card_payments;

            // If already active, no need for onboarding
            if (transfersCapability === 'active' && cardPaymentsCapability === 'active') {
                return {
                    success: true,
                    message: 'Stripe Connect account is already fully onboarded',
                    data: {
                        account_id: user.stripe_connect_account_id,
                        transfers_enabled: true,
                        card_payments_enabled: true,
                        onboarding_required: false,
                    },
                };
            }

            // Create onboarding link
            const baseUrl = appConfig().app.url || 'http://localhost:3000';
            const accountLink = await StripeConnect.createAccountLink(
                user.stripe_connect_account_id,
                `${baseUrl}/vendor/onboarding/return`,
                `${baseUrl}/vendor/onboarding/refresh`,
            );

            return {
                success: true,
                message: 'Onboarding link generated successfully',
                data: {
                    account_id: user.stripe_connect_account_id,
                    onboarding_url: accountLink.url,
                    expires_at: accountLink.expires_at,
                    transfers_enabled: transfersCapability === 'active',
                    card_payments_enabled: cardPaymentsCapability === 'active',
                    onboarding_required: true,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to generate onboarding link',
            };
        }
    }

    @Post('release-partial')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                booking_id: { type: 'string' },
                percentage: { type: 'number', description: 'Percentage to release (e.g., 50 for 50%)' },
            },
            required: ['booking_id', 'percentage'],
        },
    })
    async releasePartial(
        @Req() req: Request,
        @Body() body: { booking_id: string; percentage: number },
    ) {
        try {
            const user_id = req.user.userId;
            const user = await UserRepository.getUserDetails(user_id);

            if (!user || (user.type !== 'admin' && user.type !== 'su_admin')) {
                return {
                    success: false,
                    message: 'Only admins can manually release funds',
                };
            }

            const result = await this.escrowService.releaseFunds(
                body.booking_id,
                body.percentage,
            );

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

 
    @Post('release-final/:bookingId')
    async releaseFinal(@Req() req: Request, @Param('bookingId') bookingId: string) {
        try {
            const user_id = req.user.userId;
            const user = await UserRepository.getUserDetails(user_id);

            if (!user || (user.type !== 'admin' && user.type !== 'su_admin')) {
                return {
                    success: false,
                    message: 'Only admins can trigger final release',
                };
            }

            const result = await this.escrowService.processFinalRelease(bookingId);

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('cancel-client/:bookingId')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                reason: { type: 'string', description: 'Cancellation reason' },
            },
        },
    })
    async handleClientCancellation(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { reason?: string },
    ) {
        try {
            const user_id = req.user.userId;

            // Verify user owns the booking
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId, user_id },
            });

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found or access denied',
                };
            }

            const result = await this.escrowExceptionsService.handleClientCancellation(
                bookingId,
                body.reason,
            );

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }


    @Post('cancel-provider/:bookingId')
    async handleProviderCancellation(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { reason?: string },
    ) {
        try {
            const user_id = req.user.userId;
            const user = await UserRepository.getUserDetails(user_id);

            // Verify user is the vendor for this booking
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId, vendor_id: user_id },
            });

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found or access denied',
                };
            }

            const result =
                await this.escrowExceptionsService.handleProviderCancellation(
                    bookingId,
                    body.reason,
                );

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('dispute/:bookingId')
    async handleDispute(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { reason: string },
    ) {
        try {
            const user_id = req.user.userId;

            // Verify user is client or vendor for this booking
            const booking = await this.prisma.booking.findFirst({
                where: {
                    id: bookingId,
                    OR: [{ user_id }, { vendor_id: user_id }],
                },
            });

            if (!booking) {
                return {
                    success: false,
                    message: 'Booking not found or access denied',
                };
            }

            const result = await this.escrowExceptionsService.handleDispute(
                bookingId,
                body.reason,
            );

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('resolve-dispute/:bookingId')
    async resolveDispute(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { resolution: 'release' | 'refund'; notes?: string },
    ) {
        try {
            const user_id = req.user.userId;
            const user = await UserRepository.getUserDetails(user_id);

            if (!user || (user.type !== 'admin' && user.type !== 'su_admin')) {
                return {
                    success: false,
                    message: 'Only admins can resolve disputes',
                };
            }

            const result = await this.escrowExceptionsService.resolveDispute(
                bookingId,
                body.resolution,
                body.notes,
            );

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}


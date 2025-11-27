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
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { EscrowService } from './escrow.service';

@ApiBearerAuth()
@ApiTags('Escrow')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('escrow')
export class EscrowController {
    constructor(private readonly escrowService: EscrowService) { }

    @Get('funds')
    @Roles(Role.VENDOR)
    async getRetainedFunds(@Req() req: Request) {
        try {
            return await this.escrowService.getRetainedFundsForVendor(
                req.user.userId,
            );
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Get('onboarding-link')
    @Roles(Role.VENDOR)
    async getOnboardingLink(@Req() req: Request) {
        try {
            return await this.escrowService.generateVendorOnboardingLink(
                req.user.userId,
            );
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
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    async releasePartial(
        @Req() req: Request,
        @Body() body: { booking_id: string; percentage: number },
    ) {
        try {
            return await this.escrowService.releasePartialFundsAsAdmin(
                req.user.userId,
                body.booking_id,
                body.percentage,
            );
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }


    @Post('release-final/:bookingId')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    async releaseFinal(@Req() req: Request, @Param('bookingId') bookingId: string) {
        try {
            return await this.escrowService.releaseFinalFundsAsAdmin(
                req.user.userId,
                bookingId,
            );
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
    @Roles(Role.USER)
    async handleClientCancellation(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { reason?: string },
    ) {
        try {
            return await this.escrowService.handleClientCancellationRequest(
                req.user.userId,
                bookingId,
                body.reason,
            );
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }


    @Post('cancel-provider/:bookingId')
    @Roles(Role.VENDOR)
    async handleProviderCancellation(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { reason?: string },
    ) {
        try {
            return await this.escrowService.handleProviderCancellationRequest(
                req.user.userId,
                bookingId,
                body.reason,
            );
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('dispute/:bookingId')
    @Roles(Role.USER, Role.VENDOR)
    async handleDispute(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { reason: string },
    ) {
        try {
            return await this.escrowService.handleDisputeRequest(
                req.user.userId,
                bookingId,
                body.reason,
            );
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('resolve-dispute/:bookingId')
    @Roles(Role.ADMIN, Role.SUPERADMIN)
    async resolveDispute(
        @Req() req: Request,
        @Param('bookingId') bookingId: string,
        @Body() body: { resolution: 'release' | 'refund'; notes?: string },
    ) {
        try {
            return await this.escrowService.resolveDisputeRequest(
                req.user.userId,
                bookingId,
                body.resolution,
                body.notes,
            );
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}


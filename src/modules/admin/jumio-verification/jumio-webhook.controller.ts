import {
    Controller,
    Post,
    Body,
    Headers,
    HttpStatus,
    HttpCode,
    Logger,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import { JumioService } from '../../../common/lib/Jumio/JumioService';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Jumio Webhooks')
@Controller('webhooks/jumio')
export class JumioWebhookController {
    private readonly logger = new Logger(JumioWebhookController.name);

    constructor(
        private readonly jumioService: JumioService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('callback')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle Jumio verification callback' })
    @ApiResponse({
        status: 200,
        description: 'Webhook processed successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid webhook signature or data',
    })
    async handleJumioCallback(
        @Body() payload: any,
        @Headers('authorization') authorization: string,
        @Headers('x-jumio-signature') signature: string,
        @Headers('x-jumio-timestamp') timestamp: string,
    ) {
        try {
            this.logger.log('Received Jumio webhook callback');

            // Validate webhook signature
            const isValidSignature = this.jumioService.validateWebhookSignature(
                JSON.stringify(payload),
                signature,
                timestamp,
            );

            if (!isValidSignature) {
                this.logger.error('Invalid webhook signature');
                throw new Error('Invalid webhook signature');
            }

            // Extract verification data from payload
            const {
                scanReference,
                verification,
                timestamp: jumioTimestamp,
            } = payload;

            if (!scanReference || !verification) {
                throw new Error('Invalid webhook payload');
            }

            // Find verification in database
            const dbVerification = await this.prisma.jumioVerification.findFirst({
                where: {
                    jumio_reference_id: scanReference,
                    deleted_at: null,
                },
            });

            if (!dbVerification) {
                this.logger.error(`Verification not found for scan reference: ${scanReference}`);
                throw new Error('Verification not found');
            }

            // Update verification with Jumio response
            await this.prisma.jumioVerification.update({
                where: { id: dbVerification.id },
                data: {
                    jumio_status: verification.status,
                    jumio_updated_at: new Date(jumioTimestamp),
                    jumio_result: JSON.stringify(payload),
                    document_type: verification.document?.type,
                    document_country: verification.document?.country,
                    document_number: verification.document?.number,
                    first_name: verification.identity?.firstName,
                    last_name: verification.identity?.lastName,
                    date_of_birth: verification.identity?.dateOfBirth
                        ? new Date(verification.identity.dateOfBirth)
                        : null,
                    nationality: verification.identity?.nationality,
                    verification_score: verification.verification?.score,
                    verification_confidence: verification.verification?.confidence,
                    is_completed: true,
                    jumio_completed_at: new Date(),
                    error_message: verification.status.includes('DENIED') || verification.status.includes('ERROR')
                        ? `Jumio verification failed: ${verification.status}`
                        : null,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            this.logger.log(`Verification ${dbVerification.id} updated with status: ${verification.status}`);

            // Here you can add additional logic like:
            // - Send notifications to user
            // - Update user verification status
            // - Trigger other business processes

            return {
                success: true,
                message: 'Webhook processed successfully',
                verification_id: dbVerification.id,
                status: verification.status,
            };
        } catch (error) {
            this.logger.error('Error processing Jumio webhook', error);
            throw error;
        }
    }

    @Post('retrieval')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Handle Jumio data retrieval callback' })
    @ApiResponse({
        status: 200,
        description: 'Data retrieval webhook processed successfully',
    })
    async handleDataRetrieval(
        @Body() payload: any,
        @Headers('authorization') authorization: string,
        @Headers('x-jumio-signature') signature: string,
        @Headers('x-jumio-timestamp') timestamp: string,
    ) {
        try {
            this.logger.log('Received Jumio data retrieval callback');

            // Validate webhook signature
            const isValidSignature = this.jumioService.validateWebhookSignature(
                JSON.stringify(payload),
                signature,
                timestamp,
            );

            if (!isValidSignature) {
                this.logger.error('Invalid webhook signature');
                throw new Error('Invalid webhook signature');
            }

            // Process data retrieval payload
            const { scanReference, verification } = payload;

            if (!scanReference || !verification) {
                throw new Error('Invalid data retrieval payload');
            }

            // Find and update verification with detailed data
            const dbVerification = await this.prisma.jumioVerification.findFirst({
                where: {
                    jumio_reference_id: scanReference,
                    deleted_at: null,
                },
            });

            if (!dbVerification) {
                this.logger.error(`Verification not found for scan reference: ${scanReference}`);
                throw new Error('Verification not found');
            }

            // Update with detailed verification data
            await this.prisma.jumioVerification.update({
                where: { id: dbVerification.id },
                data: {
                    jumio_result: JSON.stringify(payload),
                    // Add any additional fields from the detailed verification data
                },
            });

            this.logger.log(`Data retrieval processed for verification ${dbVerification.id}`);

            return {
                success: true,
                message: 'Data retrieval webhook processed successfully',
                verification_id: dbVerification.id,
            };
        } catch (error) {
            this.logger.error('Error processing Jumio data retrieval webhook', error);
            throw error;
        }
    }
} 
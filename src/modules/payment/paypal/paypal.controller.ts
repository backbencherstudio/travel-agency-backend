import { Controller, Post, Body, Get, Param, UseGuards, Request, HttpStatus, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PayPalService } from './paypal.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request as ExpressRequest, Response } from 'express';

@ApiTags('PayPal Payment')
@Controller('payment/paypal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PayPalController {
    constructor(
        private readonly paypalService: PayPalService
    ) { }

    @Post('create-order')
    @ApiOperation({ summary: 'Create PayPal order' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PayPal order created successfully',
    })
    async createOrder(
        @Request() req,
        @Body() body: {
            amount: number;
            currency: string;
            booking_id: string;
            return_url: string;
            cancel_url: string;
        },
    ) {
        try {
            const userId = req.user.userId || req.user.sub;

            const result = await this.paypalService.createOrder({
                amount: body.amount,
                currency: body.currency,
                booking_id: body.booking_id,
                user_id: userId,
                return_url: body.return_url,
                cancel_url: body.cancel_url,
            });

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                };
            } else {
                return {
                    success: false,
                    message: result.error,
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('capture-order')
    @ApiOperation({ summary: 'Capture PayPal order' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PayPal order captured successfully',
    })
    async captureOrder(
        @Body() body: { order_id: string },
    ) {
        try {
            const result = await this.paypalService.captureOrder(body.order_id);

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                };
            } else {
                return {
                    success: false,
                    message: result.error,
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Get('order/:orderId')
    @ApiOperation({ summary: 'Get PayPal order details' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PayPal order details retrieved successfully',
    })
    async getOrderDetails(
        @Param('orderId') orderId: string,
    ) {
        try {
            const result = await this.paypalService.getOrderDetails(orderId);

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                };
            } else {
                return {
                    success: false,
                    message: result.error,
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('refund')
    @ApiOperation({ summary: 'Refund PayPal payment' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PayPal refund processed successfully',
    })
    async refundPayment(
        @Body() body: {
            capture_id: string;
            amount?: number;
            currency?: string;
        },
    ) {
        try {
            const result = await this.paypalService.refundPayment(
                body.capture_id,
                body.amount,
                body.currency,
            );

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                };
            } else {
                return {
                    success: false,
                    message: result.error,
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('complete-payment')
    @ApiOperation({ summary: 'Complete PayPal payment' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'PayPal payment completed successfully',
    })
    async completePayment(
        @Request() req,
        @Body() body: { order_id: string },
    ) {
        try {
            const userId = req.user.userId || req.user.sub;

            const result = await this.paypalService.completePayPalPayment(body.order_id, userId);

            if (result.success) {
                return {
                    success: true,
                    data: result.data,
                };
            } else {
                return {
                    success: false,
                    message: result.message,
                };
            }
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('webhook')
    async handleWebhook(@Req() req: ExpressRequest, @Res() res: Response) {
        try {
            const event = req.body;

            // Verify webhook signature (recommended for production)
            // const isValid = await this.paypalService.verifyWebhookSignature();
            // if (!isValid) {
            //     console.error('❌ Invalid webhook signature');
            //     return res.status(401).json({ error: 'Invalid signature' });
            // }

            // Handle different webhook events
            switch (event.event_type) {
                case 'PAYMENT.CAPTURE.COMPLETED':
                    await this.paypalService.handlePaymentCompleted(event);
                    break;
                case 'PAYMENT.CAPTURE.DENIED':
                    await this.paypalService.handlePaymentDenied(event);
                    break;
                case 'PAYMENT.CAPTURE.REFUNDED':
                    await this.paypalService.handlePaymentRefunded(event);
                    break;
                case 'CHECKOUT.ORDER.APPROVED':
                    // Handle order approval if needed
                    break;
                case 'CHECKOUT.ORDER.CANCELLED':
                    // Handle order cancellation if needed
                    break;
                default:
                    // Unhandled webhook event type
                    break;
            }

            res.status(200).json({
                received: true,
                event_type: event.event_type,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('PayPal webhook error:', error);
            res.status(500).json({
                error: 'Webhook processing failed',
                message: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

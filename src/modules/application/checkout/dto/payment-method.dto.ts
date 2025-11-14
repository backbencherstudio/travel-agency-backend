import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum } from 'class-validator';

export enum PaymentMethodType {
    STRIPE = 'stripe',
}

export class PaymentDataDto {
    @ApiProperty({ description: 'Payment amount' })
    @IsNumber()
    amount: number;

    @ApiProperty({ description: 'Currency code', default: 'usd' })
    @IsString()
    currency: string = 'usd';
}

export class PaymentMethodDto {
    @ApiProperty({
        description: 'Payment method type',
        enum: PaymentMethodType,
        example: PaymentMethodType.STRIPE
    })
    @IsEnum(PaymentMethodType)
    type: PaymentMethodType;

    @ApiProperty({ description: 'Payment method specific data' })
    data: PaymentDataDto;
}

export class ProcessPaymentDto {
    @ApiProperty({ description: 'Booking ID' })
    @IsString()
    booking_id: string;

    @ApiProperty({ description: 'Payment method details' })
    payment_method: PaymentMethodDto;
} 
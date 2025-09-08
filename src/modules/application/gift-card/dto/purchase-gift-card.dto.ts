import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PurchaseGiftCardDto {
    @ApiProperty({
        description: 'Payment method details',
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['stripe', 'paypal', 'google_pay', 'apple_pay'] },
            data: { type: 'object', additionalProperties: true }
        }
    })
    @IsNotEmpty()
    payment_method: {
        type: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay';
        data: any;
    };
}

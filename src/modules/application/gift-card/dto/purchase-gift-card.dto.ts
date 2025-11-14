import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PurchaseGiftCardDto {
    @ApiProperty({
        description: 'Gift card ID to purchase',
        example: 'cmfp57ncx000wwsvoh2kd3nnv'
    })
    @IsNotEmpty()
    @IsString()
    gift_card_id: string;

    @ApiProperty({
        description: 'Quantity of gift cards to purchase',
        example: 2,
        minimum: 1,
        default: 1
    })
    @IsOptional()
    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @Min(1)
    quantity?: number = 1;

    @ApiProperty({
        description: 'Recipient email address (optional)',
        example: 'recipient@example.com'
    })

    @ApiProperty({
        description: 'Payment method details',
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['stripe'] },
            data: { type: 'object', additionalProperties: true }
        }
    })
    @IsNotEmpty()
    payment_method: {
        type: 'stripe';
        data: any;
    };
}

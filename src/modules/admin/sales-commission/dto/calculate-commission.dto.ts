import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CalculateCommissionDto {
    @ApiProperty({
        description: 'Booking ID to calculate commission for',
        example: 'clx1234567890abcdef'
    })
    @IsString()
    booking_id: string;

    @ApiProperty({
        description: 'Recipient user ID (vendor, sales agent, etc.)',
        example: 'clx1234567890abcdef'
    })
    @IsString()
    recipient_user_id: string;

    @ApiProperty({
        description: 'Commission rate ID to use (optional - will find best match if not provided)',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    commission_rate_id?: string;

    @ApiProperty({
        description: 'Base amount for commission calculation (optional - will use booking amount if not provided)',
        required: false,
        example: 1000
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    base_amount?: number;

    @ApiProperty({
        description: 'Notes for the commission calculation',
        required: false,
        example: 'Commission for successful booking completion'
    })
    @IsOptional()
    @IsString()
    notes?: string;
} 
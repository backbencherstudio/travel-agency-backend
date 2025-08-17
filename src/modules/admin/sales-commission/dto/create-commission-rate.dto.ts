import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommissionRateDto {
    @ApiProperty({
        description: 'Commission rate name',
        example: 'Standard Vendor Commission'
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Commission rate description',
        required: false,
        example: 'Standard commission rate for all vendors'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Commission type',
        enum: ['percentage', 'fixed', 'tiered'],
        example: 'percentage'
    })
    @IsEnum(['percentage', 'fixed', 'tiered'])
    commission_type: string;

    @ApiProperty({
        description: 'Commission rate (percentage or fixed amount)',
        example: 10.5
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    @Type(() => Number)
    rate: number;

    @ApiProperty({
        description: 'Minimum amount required for commission',
        required: false,
        example: 100
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    min_amount?: number;

    @ApiProperty({
        description: 'Maximum commission amount (cap)',
        required: false,
        example: 1000
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    max_commission_amount?: number;

    @ApiProperty({
        description: 'Tiered commission structure (JSON)',
        required: false,
        example: '[{"min": 0, "max": 1000, "rate": 5}, {"min": 1000, "max": 5000, "rate": 10}]'
    })
    @IsOptional()
    @IsString()
    tiered_rates?: string;

    @ApiProperty({
        description: 'Applicable user types',
        enum: ['vendor', 'sales_agent', 'affiliate', 'partner'],
        example: 'vendor'
    })
    @IsEnum(['vendor', 'sales_agent', 'affiliate', 'partner'])
    @IsOptional()
    applicable_user_type: string;

    @ApiProperty({
        description: 'Specific user ID (if commission is user-specific)',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    user_id?: string;

    @ApiProperty({
        description: 'Package-specific commission (if applicable)',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    package_id?: string;

    @ApiProperty({
        description: 'Category-specific commission (if applicable)',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    category_id?: string;

    @ApiProperty({
        description: 'Commission status',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiProperty({
        description: 'Effective from date',
        required: false,
        example: '2024-01-01T00:00:00.000Z'
    })
    @IsOptional()
    @IsDateString()
    effective_from?: string;

    @ApiProperty({
        description: 'Effective until date',
        required: false,
        example: '2024-12-31T23:59:59.000Z'
    })
    @IsOptional()
    @IsDateString()
    effective_until?: string;
} 
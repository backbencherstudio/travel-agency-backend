import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCommissionRateDto {
    @ApiProperty({
        description: 'Page number',
        required: false,
        example: 1
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiProperty({
        description: 'Number of items per page',
        required: false,
        example: 10
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number = 10;

    @ApiProperty({
        description: 'Search term for name or description',
        required: false,
        example: 'vendor'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        description: 'Filter by commission type',
        enum: ['percentage', 'fixed', 'tiered'],
        required: false,
        example: 'percentage'
    })
    @IsOptional()
    @IsEnum(['percentage', 'fixed', 'tiered'])
    commission_type?: string;

    @ApiProperty({
        description: 'Filter by applicable user type',
        enum: ['vendor', 'sales_agent', 'affiliate', 'partner'],
        required: false,
        example: 'vendor'
    })
    @IsOptional()
    @IsEnum(['vendor', 'sales_agent', 'affiliate', 'partner'])
    applicable_user_type?: string;

    @ApiProperty({
        description: 'Filter by active status',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    @ApiProperty({
        description: 'Filter by specific user ID',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    user_id?: string;

    @ApiProperty({
        description: 'Filter by package ID',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    package_id?: string;

    @ApiProperty({
        description: 'Filter by category ID',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    category_id?: string;
} 
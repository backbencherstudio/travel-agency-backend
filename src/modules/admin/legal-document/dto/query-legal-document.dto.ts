import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryLegalDocumentDto {
    @ApiProperty({
        description: 'Page number for pagination',
        required: false,
        default: 1,
        example: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({
        description: 'Number of items per page',
        required: false,
        default: 10,
        example: 10
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiProperty({
        description: 'Search term for document title or description',
        required: false,
        example: 'passport'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        description: 'Filter by document type',
        enum: ['passport', 'drivers_license', 'national_id', 'visa', 'other'],
        required: false,
        example: 'passport'
    })
    @IsOptional()
    @IsEnum(['passport', 'drivers_license', 'national_id', 'visa', 'other'])
    document_type?: string;

    @ApiProperty({
        description: 'Filter by verification status',
        enum: ['pending', 'approved', 'rejected', 'expired'],
        required: false,
        example: 'pending'
    })
    @IsOptional()
    @IsEnum(['pending', 'approved', 'rejected', 'expired'])
    verification_status?: string;

    @ApiProperty({
        description: 'Filter by user ID',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    user_id?: string;

    @ApiProperty({
        description: 'Filter by active status',
        required: false,
        example: true
    })
    @IsOptional()
    @IsString()
    is_active?: string;
} 
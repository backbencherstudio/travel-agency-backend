import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryJumioVerificationDto {
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
        description: 'Search term for jumio_reference_id, admin_notes, or error_message',
        required: false,
        example: 'verification'
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        description: 'Filter by verification type',
        enum: ['IDENTITY_VERIFICATION', 'FACE_VERIFICATION', 'DOCUMENT_VERIFICATION'],
        required: false,
        example: 'IDENTITY_VERIFICATION'
    })
    @IsOptional()
    @IsEnum(['IDENTITY_VERIFICATION', 'FACE_VERIFICATION', 'DOCUMENT_VERIFICATION'])
    verification_type?: string;

    @ApiProperty({
        description: 'Filter by Jumio status',
        enum: ['PENDING', 'APPROVED_VERIFIED', 'DENIED_FRAUD', 'DENIED_UNSUPPORTED_ID_TYPE', 'DENIED_UNSUPPORTED_ID_COUNTRY', 'ERROR_NOT_READABLE_ID', 'NO_ID_UPLOADED'],
        required: false,
        example: 'PENDING'
    })
    @IsOptional()
    @IsEnum(['PENDING', 'APPROVED_VERIFIED', 'DENIED_FRAUD', 'DENIED_UNSUPPORTED_ID_TYPE', 'DENIED_UNSUPPORTED_ID_COUNTRY', 'ERROR_NOT_READABLE_ID', 'NO_ID_UPLOADED'])
    jumio_status?: string;

    @ApiProperty({
        description: 'Filter by completion status',
        required: false,
        example: 'true'
    })
    @IsOptional()
    @IsString()
    is_completed?: string;

    @ApiProperty({
        description: 'Filter by manual review status',
        required: false,
        example: 'false'
    })
    @IsOptional()
    @IsString()
    manually_reviewed?: string;

    @ApiProperty({
        description: 'Filter by user ID',
        required: false,
        example: 'clx1234567890abcdef'
    })
    @IsOptional()
    @IsString()
    user_id?: string;

    @ApiProperty({
        description: 'Filter by document type',
        enum: ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'VISA'],
        required: false,
        example: 'PASSPORT'
    })
    @IsOptional()
    @IsEnum(['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'VISA'])
    document_type?: string;

    @ApiProperty({
        description: 'Filter by document country',
        required: false,
        example: 'US'
    })
    @IsOptional()
    @IsString()
    document_country?: string;
} 
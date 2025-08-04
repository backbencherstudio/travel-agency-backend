import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export class CreateLegalDocumentDto {
    @ApiProperty({
        description: 'User ID who owns the document',
        example: 'clx1234567890abcdef'
    })
    @IsString()
    user_id: string;

    @ApiProperty({
        description: 'Type of legal document',
        enum: ['passport', 'drivers_license', 'national_id', 'visa', 'other'],
        example: 'passport'
    })
    @IsEnum(['passport', 'drivers_license', 'national_id', 'visa', 'other'])
    document_type: string;

    @ApiProperty({
        description: 'Document title/name',
        example: 'My Passport'
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Document description or notes',
        required: false,
        example: 'Valid passport for international travel'
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Document expiration date',
        required: false,
        example: '2025-12-31T23:59:59.000Z'
    })
    @IsOptional()
    @IsDateString()
    expires_at?: string;

    @ApiProperty({
        description: 'Whether the document is currently active',
        default: true,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
} 
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';

export class CreateJumioVerificationDto {
    @ApiProperty({
        description: 'User ID for the verification',
        example: 'clx1234567890abcdef'
    })
    @IsString()
    user_id: string;

    @ApiProperty({
        description: 'Verification type',
        enum: ['IDENTITY_VERIFICATION', 'FACE_VERIFICATION', 'DOCUMENT_VERIFICATION'],
        example: 'IDENTITY_VERIFICATION'
    })
    @IsEnum(['IDENTITY_VERIFICATION', 'FACE_VERIFICATION', 'DOCUMENT_VERIFICATION'])
    verification_type: string;

    @ApiProperty({
        description: 'Country code for document verification',
        required: false,
        example: 'US'
    })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiProperty({
        description: 'Document type',
        enum: ['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'VISA'],
        required: false,
        example: 'PASSPORT'
    })
    @IsOptional()
    @IsEnum(['ID_CARD', 'PASSPORT', 'DRIVERS_LICENSE', 'VISA'])
    document_type?: string;

    @ApiProperty({
        description: 'Custom callback URL',
        required: false,
        example: 'https://yourapp.com/webhook/jumio'
    })
    @IsOptional()
    @IsString()
    callback_url?: string;

    @ApiProperty({
        description: 'User consent for verification',
        required: false,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    user_consent?: boolean;

    @ApiProperty({
        description: 'Locale for the verification interface',
        required: false,
        example: 'en-US'
    })
    @IsOptional()
    @IsString()
    locale?: string;

    @ApiProperty({
        description: 'Enabled fields for verification',
        required: false,
        example: ['firstName', 'lastName', 'dateOfBirth']
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    enabled_fields?: string[];
} 
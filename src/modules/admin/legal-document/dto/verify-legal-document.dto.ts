import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class VerifyLegalDocumentDto {
    @ApiProperty({
        description: 'Verification status',
        enum: ['approved', 'rejected', 'pending'],
        example: 'approved'
    })
    @IsEnum(['approved', 'rejected', 'pending'])
    verification_status: string;

    @ApiProperty({
        description: 'Admin notes for verification',
        required: false,
        example: 'Document verified successfully. All information matches.'
    })
    @IsOptional()
    @IsString()
    admin_notes?: string;

    @ApiProperty({
        description: 'Verification score (0-100)',
        required: false,
        minimum: 0,
        maximum: 100,
        example: 95
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    verification_score?: number;
} 
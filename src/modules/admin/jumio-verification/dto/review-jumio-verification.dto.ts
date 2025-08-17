import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, IsBoolean } from 'class-validator';

export class ReviewJumioVerificationDto {
    @ApiProperty({
        description: 'Jumio verification status',
        enum: ['pending', 'approved', 'denied', 'error', 'expired'],
        example: 'approved'
    })
    @IsEnum(['pending', 'approved', 'denied', 'error', 'expired'])
    jumio_status: string;

    @ApiProperty({
        description: 'Admin notes for the review',
        required: false,
        example: 'Verification manually approved after review'
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

    @ApiProperty({
        description: 'Whether verification is completed',
        default: true,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    is_completed?: boolean;

    @ApiProperty({
        description: 'Whether verification was manually reviewed',
        default: true,
        example: true
    })
    @IsOptional()
    @IsBoolean()
    manually_reviewed?: boolean;
} 
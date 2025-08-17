import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CompleteVerificationDto {
    @ApiProperty({
        description: 'Document quality assessment',
        enum: ['high', 'medium', 'low'],
        example: 'high'
    })
    @IsEnum(['high', 'medium', 'low'])
    document_quality: string;

    @ApiProperty({
        description: 'Face match result',
        example: true
    })
    @IsBoolean()
    face_match: boolean;

    @ApiProperty({
        description: 'Information consistency check',
        example: true
    })
    @IsBoolean()
    info_consistent: boolean;

    @ApiProperty({
        description: 'Additional verification notes',
        required: false,
        example: 'All documents verified successfully'
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({
        description: 'Document images captured during verification',
        required: false,
        example: ['base64_image_1', 'base64_image_2']
    })
    @IsOptional()
    @IsString({ each: true })
    captured_images?: string[];
} 
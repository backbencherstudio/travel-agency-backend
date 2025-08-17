import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ApproveCommissionDto {
    @ApiProperty({
        description: 'Commission status to set',
        enum: ['pending', 'approved', 'paid', 'cancelled', 'disputed'],
        example: 'approved'
    })
    @IsEnum(['pending', 'approved', 'paid', 'cancelled', 'disputed'])
    status: string;

    @ApiProperty({
        description: 'Admin notes for the approval',
        required: false,
        example: 'Commission approved after review'
    })
    @IsOptional()
    @IsString()
    admin_notes?: string;

    @ApiProperty({
        description: 'Dispute reason (if status is disputed)',
        required: false,
        example: 'Incorrect calculation basis'
    })
    @IsOptional()
    @IsString()
    dispute_reason?: string;
} 
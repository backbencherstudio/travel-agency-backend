import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetBookingsDto {
    @ApiProperty({
        description: 'Page number',
        example: 1,
        required: false,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({
        description: 'Items per page',
        example: 10,
        required: false,
        default: 10,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiProperty({
        description: 'Filter by booking status',
        example: 'confirmed',
        required: false,
        enum: ['all', 'pending', 'confirmed', 'cancelled', 'processing'],
    })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiProperty({
        description: 'Filter by booking type',
        example: 'book',
        required: false,
        enum: ['book', 'reserve'],
    })
    @IsOptional()
    @IsString()
    booking_type?: string;

    @ApiProperty({
        description: 'Search by invoice number or package name',
        example: 'Family Pack',
        required: false,
    })
    @IsOptional()
    @IsString()
    search?: string;
} 
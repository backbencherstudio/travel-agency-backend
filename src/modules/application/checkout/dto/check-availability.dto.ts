import { IsString, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
    @ApiProperty({
        description: 'Package ID to check availability for',
        example: 'cmdjv9jnt0001wsp06u01j38r',
    })
    @IsString()
    package_id: string;

    @ApiProperty({
        description: 'Selected date for the booking (YYYY-MM-DD format)',
        example: '2025-03-15',
    })
    @IsDateString()
    selected_date: string;

    @ApiProperty({
        description: 'Number of adult travelers',
        example: 2,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    adults_count: number;

    @ApiProperty({
        description: 'Number of child travelers',
        example: 1,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    children_count: number;

    @ApiProperty({
        description: 'Number of infant travelers',
        example: 0,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    infants_count: number;
} 
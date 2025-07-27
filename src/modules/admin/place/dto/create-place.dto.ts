import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreatePlaceDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: 'Place name',
        example: 'Eiffel Tower',
    })
    name: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Place address',
        example: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
        required: false,
    })
    address?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Place description',
        example: 'Iconic iron lattice tower',
        required: false,
    })
    description?: string;

    @IsOptional()
    @IsNumber()
    @ApiProperty({
        description: 'Latitude coordinate',
        example: 48.8584,
        required: false,
    })
    latitude?: number;

    @IsOptional()
    @IsNumber()
    @ApiProperty({
        description: 'Longitude coordinate',
        example: 2.2945,
        required: false,
    })
    longitude?: number;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Place type',
        example: 'landmark',
        enum: ['landmark', 'hotel', 'restaurant', 'station', 'museum', 'park', 'shopping', 'other'],
        required: false,
    })
    type?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'City where place is located',
        example: 'Paris',
        required: false,
    })
    city?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Country where place is located',
        example: 'France',
        required: false,
    })
    country?: string;
}

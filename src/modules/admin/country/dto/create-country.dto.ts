import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCountryDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty({
        description: 'Country name',
        example: 'United States',
    })
    name: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Country code',
        example: 'US',
        required: false,
    })
    country_code?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Dial code',
        example: '+1',
        required: false,
    })
    dial_code?: string;

    @IsOptional()
    @IsString()
    @ApiProperty({
        description: 'Country flag image URL',
        example: 'https://example.com/flag.png',
        required: false,
    })
    flag?: string;
}

export class BatchCreateCountryDto {
    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCountryDto)
    @ApiProperty({
        description: 'Array of countries to create',
        type: [CreateCountryDto],
        example: [
            {
                name: 'United States',
                country_code: 'US',
                dial_code: '+1',
                flag: 'https://example.com/us-flag.png',
            },
            {
                name: 'United Kingdom',
                country_code: 'GB',
                dial_code: '+44',
                flag: 'https://example.com/gb-flag.png',
            },
        ],
    })
    countries: CreateCountryDto[];
}


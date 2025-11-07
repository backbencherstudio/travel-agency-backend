import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDestinationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Destination name',
    example: 'Paris',
  })
  name: string;

  @ApiProperty({
    description: 'Destination description',
    example: 'Paris is the capital of France',
  })
  description: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 48.8566,
    required: false,
  })
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    description: 'Longitude coordinate',
    example: 2.3522,
    required: false,
  })
  longitude?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Full address of the destination',
    example: 'Paris, France',
    required: false,
  })
  address?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'City name',
    example: 'Paris',
    required: false,
  })
  city?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'State/Province name',
    example: 'Île-de-France',
    required: false,
  })
  state?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Postal/ZIP code',
    example: '75001',
    required: false,
  })
  zip_code?: string;

  @ApiProperty({
    description: 'Destination images',
    example: ['image1.jpg', 'image2.jpg'],
  })
  destination_images: string[];

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Country id',
    example: '1',
  })
  country_id: string;
}

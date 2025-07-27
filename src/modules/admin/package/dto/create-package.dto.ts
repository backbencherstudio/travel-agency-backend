import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export interface TripPlan {
  title: string;
  description: string;
  images?: Express.Multer.File[];
}

export enum PackageStatus {
  Active = 0,
  Deactive = 1,
}

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Package Name',
    example: 'Package Name',
  })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Package Description',
    example: 'Package Description',
  })
  description: string;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value)) // Converts string to number
  @IsNumber()
  @ApiProperty({
    description: 'Package price',
    example: 150,
  })
  price: number;

  @ApiProperty({
    description: 'Price type: general or special_offer',
    example: 'general',
    enum: ['general', 'special_offer'],
    required: false,
  })
  price_type?: string;

  @ApiProperty({
    description: 'Discount percentage (e.g., 10 for 10%)',
    example: 10,
    required: false,
  })
  @Transform(({ value }) => (value ? parseInt(value) : undefined)) // Converts string to number
  @IsOptional()
  @IsNumber()
  discount_percent?: number;

  @ApiProperty({
    description: 'Fixed discount amount',
    example: 15,
    required: false,
  })
  @Transform(({ value }) => (value ? parseInt(value) : undefined)) // Converts string to number
  @IsOptional()
  @IsNumber()
  discount_amount?: number;

  @ApiProperty({
    description: 'Final price (auto-calculated)',
    example: 135,
    required: false,
  })
  final_price?: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value)) // Converts string to number
  @IsNumber()
  @ApiProperty({
    description: 'Package duration',
    example: 5,
  })
  duration: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Package duration type. e.g. days, hours, minutes',
    example: 'days',
  })
  duration_type?: string;

  @IsString()
  @ApiProperty({
    description: 'Package type. e.g. tour, cruise',
    example: 'tour',
    enum: ['tour', 'cruise'],
  })
  type?: string;

  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value)) // Converts string to number
  @IsNumber()
  @ApiProperty({ example: 1 })
  min_capacity?: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value)) // Converts string to number
  @IsNumber()
  @ApiProperty({ example: 10 })
  max_capacity: number;

  @IsString()
  @ApiProperty()
  cancellation_policy_id?: string;

  @ApiProperty({
    description: 'Destination array object with stringyfied ids',
    example: [
      {
        id: '1',
      },
      {
        id: '2',
      },
    ],
  })
  destinations: string;

  @IsNotEmpty()
  @ApiProperty()
  package_category: string;

  @ApiProperty()
  included_packages: string;

  @ApiProperty()
  excluded_packages: string;

  @ApiProperty()
  traveller_types?: string;

  // @IsNotEmpty()
  @ApiProperty()
  // trip_plans: {
  //   title: string;
  //   description: string;
  //   images?: Express.Multer.File[];
  // }[];
  trip_plans: string;

  @ApiProperty()
  status?: PackageStatus;

  @ApiProperty({
    description: 'Trip plans images object',
  })
  trip_plans_images?: any;

  @ApiProperty({
    description: 'Package images object',
  })
  // [{ id: '1' }, { id: '2' }]
  package_files?: any;

  @ApiProperty()
  extra_services?: any;

  @ApiProperty({
    description: 'Package array object with stringyfied ids',
    example: [
      {
        id: '1',
      },
      {
        id: '2',
      },
    ],
  })
  languages?: string;

  @ApiProperty({
    description: 'Package availabilities array with stringified objects',
    example: [
      {
        available_date: '2024-01-15',
        available_slots: 10,
        is_available: true,
      },
      {
        available_date: '2024-01-16',
        available_slots: 8,
        is_available: true,
      },
    ],
    required: false,
  })
  package_availabilities?: string;

  @ApiProperty({
    description: 'Package places array with stringified objects',
    example: [
      {
        place_id: 'place123',
        type: 'meeting_point',
      },
      {
        place_id: 'place456',
        type: 'pickup_point',
      },
    ],
    required: false,
  })
  package_places?: string;
}

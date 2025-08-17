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

  @ApiProperty({
    description: 'Minimum number of adults allowed',
    example: 1,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  min_adults?: number;

  @ApiProperty({
    description: 'Maximum number of adults allowed',
    example: 10,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  max_adults?: number;

  @ApiProperty({
    description: 'Minimum number of children allowed',
    example: 0,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  min_children?: number;

  @ApiProperty({
    description: 'Maximum number of children allowed',
    example: 9,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  max_children?: number;

  @ApiProperty({
    description: 'Minimum number of infants allowed',
    example: 0,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  min_infants?: number;

  @ApiProperty({
    description: 'Maximum number of infants allowed',
    example: 2,
    required: false,
  })
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsOptional()
  max_infants?: number;

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
  @ApiProperty({
    description: 'Trip plans array with stringified objects',
    example: [
      {
        title: 'Day 1 - Arrival',
        description: 'Meet at the designated location and start the tour',
        duration: 1,
        duration_type: 'days',
        destinations: [
          { id: 'dest123' },
          { id: 'dest456' }
        ]
      },
      {
        title: 'Day 2 - Exploration',
        description: 'Explore the main attractions and landmarks',
        duration: 1,
        duration_type: 'days',
        destinations: [
          { id: 'dest789' }
        ]
      },
      {
        title: 'Half-Day Tour',
        description: 'Quick city overview',
        duration: 4,
        duration_type: 'hours',
        destinations: [
          { id: 'dest101' }
        ]
      }
    ],
  })
  // trip_plans: {
  //   title: string;
  //   description: string;
  //   images?: Express.Multer.File[];
  //   destinations?: { id: string }[];
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

  @ApiProperty({
    description: 'Package additional information array with stringified objects',
    example: [
      {
        type: 'accessibility',
        title: 'Wheelchair Access',
        description: 'Not wheelchair accessible',
        is_important: true,
        sort_order: 0,
      },
      {
        type: 'restrictions',
        title: 'Age Restrictions',
        description: 'Infants must sit on laps',
        is_important: false,
        sort_order: 1,
      },
      {
        type: 'requirements',
        title: 'Physical Fitness',
        description: 'Travelers should have a moderate physical fitness level',
        is_important: false,
        sort_order: 2,
      },
    ],
    required: false,
  })
  package_additional_info?: string;

  @ApiProperty({
    description: 'Package availability array with stringified objects',
    example: [
      {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        is_available: true,
        available_slots: 50,
      },
      {
        start_date: '2025-06-01',
        end_date: '2025-08-31',
        is_available: true,
        available_slots: 100,
      },
    ],
    required: false,
  })
  package_availability?: string;
}

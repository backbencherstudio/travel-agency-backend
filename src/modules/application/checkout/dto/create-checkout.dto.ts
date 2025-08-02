import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export interface IBookingTraveller {
  full_name: string;
  type: string;
  age?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  gender?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

export interface ICheckoutTraveller {
  full_name: string;
  type: string;
  age?: number;
  gender?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  address1?: string;
  address2?: string;
  email?: string;
}

export interface IPaymentMethod {
  id?: string;
  number?: string;
  name?: string;
  expiry_date?: string;
  // exp_month?: number;
  // exp_year?: number;
  cvc?: string;
}

export interface ICoupon {
  code: string;
}

export interface IExtraService {
  id: string;
}

export class CreateCheckoutDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The id of the package',
  })
  package_id: string;

  @IsNotEmpty()
  @IsDateString()
  @ApiProperty({
    description: 'Selected date for the tour/package',
    example: '2025-04-11',
  })
  selected_date: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiProperty({
    description: 'Number of adults',
    example: 5,
    required: false,
  })
  adults_count?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiProperty({
    description: 'Number of children',
    example: 0,
    required: false,
  })
  children_count?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @ApiProperty({
    description: 'Number of infants',
    example: 0,
    required: false,
  })
  infants_count?: number;

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @ApiProperty({
    description: 'Discount amount applied',
    example: 0,
    required: false,
  })
  discount_amount?: number;

  @ApiProperty({
    description: 'Included packages (JSON string)',
    required: false,
  })
  included_packages?: string;

  @ApiProperty({
    description: 'Excluded packages (JSON string)',
    required: false,
  })
  excluded_packages?: string;

  // Note: booking_travellers is not used in checkout phase
  // Traveler details are collected during booking phase
  // @IsOptional()
  // @ApiProperty({
  //   description: 'The booking travellers (JSON string or array)',
  //   required: false,
  // })
  // booking_travellers?: any;

  @ApiProperty({
    description: 'Extra services (JSON string or array)',
    required: false,
  })
  extra_services?: any;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'Start date for multi-day packages',
    example: '2025-04-11',
    required: false,
  })
  start_date?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    description: 'End date for multi-day packages',
    example: '2025-04-15',
    required: false,
  })
  end_date?: string;

  // Contact information
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'First name',
    required: false,
  })
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Last name',
    required: false,
  })
  last_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Email address',
    required: false,
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Phone number',
    required: false,
  })
  phone_number?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Address line 1',
    required: false,
  })
  address1?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Address line 2',
    required: false,
  })
  address2?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'City',
    required: false,
  })
  city?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'State/Province',
    required: false,
  })
  state?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'ZIP/Postal code',
    required: false,
  })
  zip_code?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Country',
    required: false,
  })
  country?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Checkout travelers information',
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        type: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string' },
      },
    },
  })
  checkout_travellers?: ICheckoutTraveller[];
}

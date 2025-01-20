import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export interface IBookingTraveller {
  full_name: string;
  type: string;
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

  @ApiProperty()
  included_packages: string;

  @ApiProperty()
  excluded_packages: string;

  @IsOptional()
  // @IsString()
  @ApiProperty({
    description: 'The booking travellers',
  })
  booking_travellers: any;

  @ApiProperty()
  extra_services: any;

  @ApiProperty()
  start_date: Date;

  @ApiProperty()
  end_date: Date;

  // @ApiProperty({
  //   description: 'The coupons,  data format: ICoupon[], in stringified format',
  // })
  // coupons: any;

  // contact details
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The phone number',
    example: '+233543212345',
  })
  phone_number?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The email',
    example: 'example@gmail.com',
  })
  email?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description:
      'The address1 for flat, house no, building, company, apartment',
    example: '123 Main St, Accra, Ghana',
  })
  address1?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The address2 for area, colony, street, sector, village',
    example: 'Accra, Ghana',
  })
  address2?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The city',
    example: 'Accra',
  })
  city?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The zip code',
    example: '123456',
  })
  zip_code?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The state',
    example: 'Greater Accra',
  })
  state?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The country',
    example: 'Ghana',
  })
  country?: string;
}

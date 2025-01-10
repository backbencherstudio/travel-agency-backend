import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export interface BookingTraveller {
  full_name: string;
  type: string;
}

export class CreateBookingDto {
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
  @IsString()
  @ApiProperty({
    description: 'The booking travellers',
  })
  booking_travellers: any;
}

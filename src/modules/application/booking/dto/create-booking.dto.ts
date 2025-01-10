import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The ID of the package',
  })
  package_id: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The booking travellers',
  })
  booking_travellers: any;
}

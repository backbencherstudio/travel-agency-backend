import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The ID of the package',
  })
  package_id: string;
}

import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  phone_number: string;

  @ApiProperty({
    description: 'Address',
    example: 'New York, USA',
  })
  address: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { IsArray } from 'class-validator';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Package Name' })
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: 'Package Description' })
  description: string;

  @IsNotEmpty()
  // @IsNumber()
  @ApiProperty({ example: 100 })
  price: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '5 days, 4 nights' })
  duration: string;

  @IsNotEmpty()
  // @IsNumber()
  @ApiProperty({ example: 1 })
  capacity: number;

  // @IsNotEmpty()
  // @IsString()
  @ApiProperty()
  cancellation_policy_id: string;

  // @IsNotEmpty()
  // @IsString()
  @ApiProperty()
  distination_id: string;

  // @IsNotEmpty()
  // @IsArray()
  @ApiProperty()
  package_categories: string;

  // @IsNotEmpty()
  // @IsArray()
  @ApiProperty()
  package_tags: string;
}

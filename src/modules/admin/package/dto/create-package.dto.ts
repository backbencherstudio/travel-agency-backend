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
  @IsNumber()
  @ApiProperty({ example: 100 })
  price: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ example: '5 days, 4 nights' })
  duration: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty({ example: 1 })
  capacity: number;

  @IsString()
  @ApiProperty()
  cancellation_policy_id?: string;

  @IsString()
  @ApiProperty()
  distination_id?: string;

  @IsNotEmpty()
  @IsArray()
  @ApiProperty()
  package_categories: {
    id: string;
  }[];

  @IsArray()
  @ApiProperty()
  package_tags: {
    id: string;
  }[];

  @IsNotEmpty()
  @IsArray()
  @ApiProperty()
  trip_plans: {
    title: string;
    description: string;
    images?: Express.Multer.File[];
  }[];
}

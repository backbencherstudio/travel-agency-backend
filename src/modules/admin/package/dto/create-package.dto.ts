import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

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
  min_capacity?: number;

  @IsNotEmpty()
  // @IsNumber()
  @ApiProperty({ example: 10 })
  max_capacity: number;

  @IsString()
  @ApiProperty()
  cancellation_policy_id?: string;

  @IsString()
  @ApiProperty()
  distination_id?: string;

  @IsNotEmpty()
  @ApiProperty()
  package_category: string;

  @ApiProperty()
  included_packages: string;

  @ApiProperty()
  excluded_packages: string;

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
}

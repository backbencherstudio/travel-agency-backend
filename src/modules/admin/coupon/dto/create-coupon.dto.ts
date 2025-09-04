import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({
    description: 'The name of the coupon',
    example: '10% off',
  })
  name?: string;

  @ApiProperty({
    description: 'The code of the coupon',
    example: 'TEST10',
  })
  code?: string;

  @ApiProperty({
    description: 'The description of the coupon',
    example: '10% off on all orders',
  })
  description?: string;

  @ApiProperty({
    description: 'The type of the coupon',
    example: 'percentage',
    enum: ['percentage', 'fixed'],
  })
  amount_type?: string;

  @ApiProperty({
    description: 'The amount of the coupon',
    example: 10,
  })
  amount?: number;

  @ApiProperty({
    description: 'The maximum number of uses of the coupon',
    example: 100,
  })
  max_uses?: number;

  @ApiProperty({
    description: 'The maximum number of uses of the coupon per user',
    example: 10,
  })
  max_uses_per_user?: number;

  @ApiProperty({
    description: 'The start date of the coupon',
    example: '2025-01-01',
  })
  starts_at?: Date;

  @ApiProperty({
    description: 'The status of the coupon',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  status?: number;

  @ApiProperty({
    description: 'The end date of the coupon',
    example: '2025-01-01',
  })
  expires_at?: Date;

  @ApiProperty({
    description: 'The minimum type of the coupon',
    example: 'amount',
    enum: ['none', 'amount', 'quantity'],
  })
  min_type?: string;

  @ApiProperty({
    description: 'The minimum amount of the coupon',
    example: 10,
  })
  min_amount?: number;

  @ApiProperty({
    description: 'The minimum quantity of the coupon',
    example: 10,
  })
  min_quantity?: number;
}

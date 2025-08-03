import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWishListDto {
    @ApiProperty({
        description: 'Package ID to add to wishlist',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsNotEmpty()
    package_id: string;

    @ApiProperty({
        description: 'Optional note about this wishlist item',
        example: 'Want to book this for summer vacation',
        required: false,
    })
    @IsOptional()
    @IsString()
    note?: string;
} 
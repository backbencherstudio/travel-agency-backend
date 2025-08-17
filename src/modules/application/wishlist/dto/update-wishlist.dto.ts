import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateWishListDto {
    @ApiProperty({
        description: 'Optional note about this wishlist item',
        example: 'Updated note: Planning for next year',
        required: false,
    })
    @IsOptional()
    @IsString()
    note?: string;
} 
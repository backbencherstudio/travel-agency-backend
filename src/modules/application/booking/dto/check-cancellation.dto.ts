import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CheckCancellationDto {

    @ApiProperty({
        description: 'Booking ID',
        example: '123e4567-e89b-12d3-a456-426614174001',
    })
    @IsNotEmpty()
    booking_id: string;
} 
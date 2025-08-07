import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

export interface IBookingTraveller {
    full_name: string;
    type: string; // adult, child, infant
    age?: number;
    gender?: string; // male, female, other
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    price_per_person?: number;
    discount_amount?: number;
    final_price?: number;
}

export class CreateBookingDto {
    @IsNotEmpty() @IsString() @ApiProperty({ description: 'The id of the checkout' })
    checkout_id: string;

    @IsOptional() @IsString() @ApiProperty({ description: 'Additional comments for the booking', required: false })
    comments?: string;

    @IsOptional() @IsString() @ApiProperty({
        description: 'Booking type: "book" for immediate payment, "reserve" for deferred payment',
        example: 'book',
        enum: ['book', 'reserve'],
        required: false
    })
    booking_type?: string;

    @IsOptional() @IsString() @ApiProperty({ description: 'Package type: tour, cruise, etc.', example: 'tour', required: false })
    type?: string;

    @IsOptional() @Transform(({ value }) => parseFloat(value)) @IsNumber() @ApiProperty({ description: 'Additional discount amount', example: 0, required: false })
    additional_discount?: number;

    @IsOptional() @ApiProperty({ description: 'Extra services (JSON string or array)', required: false })
    extra_services?: any;

}

import { ApiProperty } from '@nestjs/swagger';

export class BookingItemDto {
    @ApiProperty({
        description: 'Booking ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Invoice number',
        example: '#3066',
    })
    invoice_number: string;

    @ApiProperty({
        description: 'Booking date',
        example: '2022-01-06T00:00:00.000Z',
    })
    date: Date;

    @ApiProperty({
        description: 'Package name/booking type',
        example: 'Family Pack',
    })
    booking_type: string;

    @ApiProperty({
        description: 'Booking amount',
        example: 2999,
    })
    booking_amount: number;

    @ApiProperty({
        description: 'Booking status',
        example: 'upcoming',
        enum: ['pending', 'confirmed', 'cancelled', 'processing', 'upcoming'],
    })
    status: string;

    @ApiProperty({
        description: 'Number of travelers',
        example: 4,
    })
    travelers: number;

    @ApiProperty({
        description: 'Selected tour date',
        example: '2022-01-15T00:00:00.000Z',
    })
    selected_date: Date;

    @ApiProperty({
        description: 'Package type',
        example: 'tour',
        enum: ['tour', 'package', 'cruise'],
    })
    package_type: string;

    @ApiProperty({
        description: 'Payment status',
        example: 'succeeded',
        enum: ['pending', 'succeeded', 'failed', 'cancelled', 'refunded'],
    })
    payment_status: string;

    @ApiProperty({
        description: 'Created at timestamp',
        example: '2022-01-06T00:00:00.000Z',
    })
    created_at: Date;

    @ApiProperty({
        description: 'Updated at timestamp',
        example: '2022-01-06T00:00:00.000Z',
    })
    updated_at: Date;
}

export class PaginationDto {
    @ApiProperty({
        description: 'Current page number',
        example: 1,
    })
    page: number;

    @ApiProperty({
        description: 'Items per page',
        example: 10,
    })
    limit: number;

    @ApiProperty({
        description: 'Total number of items',
        example: 100,
    })
    total: number;

    @ApiProperty({
        description: 'Total number of pages',
        example: 10,
    })
    totalPages: number;

    @ApiProperty({
        description: 'Whether there is a next page',
        example: true,
    })
    hasNextPage: boolean;

    @ApiProperty({
        description: 'Whether there is a previous page',
        example: false,
    })
    hasPreviousPage: boolean;
}

export class UserBookingsResponseDto {
    @ApiProperty({
        description: 'Success status',
        example: true,
    })
    success: boolean;

    // @ApiProperty({
    //     description: 'Response data',
    //     type: 'object',
    //     properties: {
    //         bookings: {
    //             type: 'array',
    //             items: { $ref: '#/components/schemas/BookingItemDto' },
    //         },
    //         pagination: { $ref: '#/components/schemas/PaginationDto' },
    //     },
    // })
    data: {
        bookings: BookingItemDto[];
        pagination: PaginationDto;
    };
} 
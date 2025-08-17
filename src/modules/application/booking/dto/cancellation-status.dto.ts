import { ApiProperty } from '@nestjs/swagger';

export class CancellationStatusDto {
    @ApiProperty({
        description: 'Whether free cancellation is available',
        example: true,
    })
    can_cancel: boolean;

    @ApiProperty({
        description: 'Cancellation deadline in destination timezone',
        example: '2025-05-24T09:15:00.000Z',
    })
    cancellation_deadline?: string;

    @ApiProperty({
        description: 'Cancellation deadline formatted for display',
        example: 'May 24, 2025 at 9:15 AM (Mexico Time)',
    })
    cancellation_deadline_display?: string;

    @ApiProperty({
        description: 'Hours remaining until cancellation deadline',
        example: 23.5,
    })
    hours_remaining?: number;

    @ApiProperty({
        description: 'Whether the booking is non-refundable',
        example: false,
    })
    is_non_refundable: boolean;

    @ApiProperty({
        description: 'Cancellation policy description',
        example: 'Free cancellation up to 24 hours before tour start time',
    })
    policy_description: string;

    @ApiProperty({
        description: 'Tour start time in destination timezone',
        example: '2025-05-25T09:15:00.000Z',
    })
    tour_start_time?: string;

    @ApiProperty({
        description: 'Destination timezone used for calculations',
        example: 'America/Mexico_City',
    })
    destination_timezone?: string;

    @ApiProperty({
        description: 'Booking status',
        example: 'confirmed',
    })
    booking_status: string;

    @ApiProperty({
        description: 'Package name',
        example: 'Mexico City Cultural Tour',
    })
    package_name?: string;
} 
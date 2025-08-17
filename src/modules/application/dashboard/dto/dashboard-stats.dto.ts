import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
    @ApiProperty({
        description: 'Number of completed tours',
        example: 84,
    })
    tour_complete: number;

    @ApiProperty({
        description: 'Number of cancelled tours',
        example: 21,
    })
    tour_canceled: number;

    @ApiProperty({
        description: 'Number of upcoming tours',
        example: 56,
    })
    upcoming: number;
}

export class DashboardStatsResponseDto {
    @ApiProperty({
        description: 'Success status',
        example: true,
    })
    success: boolean;

    @ApiProperty({
        description: 'Dashboard statistics data',
        type: DashboardStatsDto,
    })
    data: DashboardStatsDto;
} 
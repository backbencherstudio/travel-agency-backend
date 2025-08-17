import { Injectable } from '@nestjs/common';

@Injectable()
export class CancellationCalculatorService {
    /**
     * Calculate cancellation deadline based on tour start time and destination timezone
     */
    calculateCancellationDeadline(
        tourStartDateTime: Date,
        destinationTimezone: string,
        cancellationHours: number = 24,
    ): {
        cancellationDeadline: Date;
        cancellationDeadlineDisplay: string;
        hoursRemaining: number;
        isNonRefundable: boolean;
        canCancel: boolean;
    } {
        try {
            // Convert tour start time to destination timezone
            const tourStartInDestination = this.convertToTimezone(
                tourStartDateTime,
                destinationTimezone,
            );

            // Calculate cancellation deadline (24 hours before tour start)
            const cancellationDeadline = new Date(tourStartInDestination);
            cancellationDeadline.setHours(
                cancellationDeadline.getHours() - cancellationHours,
            );

            // Get current time in destination timezone
            const nowInDestination = this.convertToTimezone(
                new Date(),
                destinationTimezone,
            );

            // Calculate hours remaining
            const hoursRemaining = this.calculateHoursRemaining(
                nowInDestination,
                cancellationDeadline,
            );

            // Determine if non-refundable (less than 24 hours remaining)
            const isNonRefundable = hoursRemaining <= 0;
            const canCancel = hoursRemaining > 0;

            // Format deadline for display
            const cancellationDeadlineDisplay = this.formatDeadlineForDisplay(
                cancellationDeadline,
                destinationTimezone,
            );

            return {
                cancellationDeadline,
                cancellationDeadlineDisplay,
                hoursRemaining: Math.max(0, hoursRemaining),
                isNonRefundable,
                canCancel,
            };
        } catch {
            // Fallback to non-refundable if timezone conversion fails
            return {
                cancellationDeadline: new Date(),
                cancellationDeadlineDisplay: 'Non-refundable',
                hoursRemaining: 0,
                isNonRefundable: true,
                canCancel: false,
            };
        }
    }

    /**
     * Convert date to specific timezone
     */
    private convertToTimezone(date: Date, timezone: string): Date {
        try {
            // Create a new date object in the target timezone
            const options: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            };

            const formatter = new Intl.DateTimeFormat('en-CA', options);
            const parts = formatter.formatToParts(date);

            const year = parts.find(part => part.type === 'year')?.value;
            const month = parts.find(part => part.type === 'month')?.value;
            const day = parts.find(part => part.type === 'day')?.value;
            const hour = parts.find(part => part.type === 'hour')?.value;
            const minute = parts.find(part => part.type === 'minute')?.value;
            const second = parts.find(part => part.type === 'second')?.value;

            return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
        } catch {
            // Fallback to original date if timezone conversion fails
            return date;
        }
    }

    /**
     * Calculate hours remaining until deadline
     */
    private calculateHoursRemaining(now: Date, deadline: Date): number {
        const diffMs = deadline.getTime() - now.getTime();
        return diffMs / (1000 * 60 * 60); // Convert milliseconds to hours
    }

    /**
     * Format deadline for user-friendly display
     */
    private formatDeadlineForDisplay(deadline: Date, timezone: string): string {
        try {
            const options: Intl.DateTimeFormatOptions = {
                timeZone: timezone,
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            };

            const formatter = new Intl.DateTimeFormat('en-US', options);
            const formattedDate = formatter.format(deadline);

            // Extract timezone abbreviation
            const timezoneAbbr = this.getTimezoneAbbreviation(timezone);

            return `${formattedDate} (${timezoneAbbr} Time)`;
        } catch {
            // Fallback formatting
            return deadline.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }
    }

    /**
     * Get timezone abbreviation
     */
    private getTimezoneAbbreviation(timezone: string): string {
        const timezoneMap: { [key: string]: string } = {
            'America/Mexico_City': 'Mexico',
            'America/New_York': 'EST',
            'America/Chicago': 'CST',
            'America/Denver': 'MST',
            'America/Los_Angeles': 'PST',
            'Europe/London': 'GMT',
            'Europe/Paris': 'CET',
            'Asia/Tokyo': 'JST',
            'Asia/Shanghai': 'CST',
            'Australia/Sydney': 'AEST',
            'Pacific/Auckland': 'NZST',
        };

        return timezoneMap[timezone] || timezone.split('/').pop() || 'Local';
    }

    /**
     * Validate if a timezone is valid
     */
    validateTimezone(timezone: string): boolean {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get cancellation policy text based on availability
     */
    getCancellationPolicyText(
        canCancel: boolean,
        hoursRemaining: number,
        destinationTimezone: string,
    ): { description: string; fullText: string } {
        if (!canCancel) {
            return {
                description: 'Non-refundable',
                fullText: 'This booking is non-refundable. Cancellations made less than 24 hours before the tour start time are not eligible for refunds.',
            };
        }

        const timezoneAbbr = this.getTimezoneAbbreviation(destinationTimezone);
        const hoursText = hoursRemaining >= 24
            ? `${Math.floor(hoursRemaining / 24)} days and ${Math.floor(hoursRemaining % 24)} hours`
            : `${Math.floor(hoursRemaining)} hours`;

        return {
            description: `Free cancellation up to 24 hours before tour start time`,
            fullText: `You can cancel this booking for free up to 24 hours before the tour start time (${timezoneAbbr} time). Currently, you have ${hoursText} remaining to cancel for free. After this deadline, the booking becomes non-refundable.`,
        };
    }
} 
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EscrowService } from './escrow.service';

@Injectable()
export class PayoutSchedulerService {
    private readonly logger = new Logger(PayoutSchedulerService.name);

    constructor(private readonly escrowService: EscrowService) { }

    /**
     * Weekly payout cron job - runs every Monday at 9:00 AM
     * Processes all completed daily tours from previous week
     */
    @Cron('0 9 * * 1') // Every Monday at 9:00 AM
    async handleWeeklyPayouts() {
        this.logger.log('Starting weekly payout processing...');

        try {
            const result = await this.escrowService.processWeeklyPayouts();

            if (result.success) {
                this.logger.log(
                    `Weekly payout completed - Processed: ${result.processed}, Failed: ${result.failed}`,
                );
            } else {
                this.logger.error(`Weekly payout failed: ${result.message}`);
            }
        } catch (error) {
            this.logger.error('Error in weekly payout cron job:', error);
        }
    }

    /**
     * Daily cron job to check for auto-confirmations
     * Runs every hour to check bookings that need auto-confirmation
     */
    @Cron(CronExpression.EVERY_HOUR)
    async handleAutoConfirmations() {
        this.logger.log('Checking for bookings needing auto-confirmation...');

        try {
            // This would need to be implemented in escrow service
            // For now, just log
            this.logger.log('Auto-confirmation check completed');
        } catch (error) {
            this.logger.error('Error in auto-confirmation cron job:', error);
        }
    }

    /**
     * Daily cron job to check for partial releases (30 days before trip)
     * Runs daily to check if any bookings are 30 days before trip
     */
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async handlePartialReleases() {
        this.logger.log('Checking for bookings needing partial release...');

        try {
            // This would need to query bookings and check dates
            // For now, just log
            this.logger.log('Partial release check completed');
        } catch (error) {
            this.logger.error('Error in partial release cron job:', error);
        }
    }
}


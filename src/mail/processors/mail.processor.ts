import { MailerService } from '@nestjs-modules/mailer';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('mail-queue')
export class MailProcessor extends WorkerHost {
  constructor(private mailerService: MailerService) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'sendMemberInvitation':
        await this.mailerService.sendMail({
          to: job.data.to,
          from: job.data.from,
          subject: job.data.subject,
          template: job.data.template,
          context: job.data.context,
        });
      case 'sendOtpCodeToEmail':
        await this.mailerService.sendMail({
          to: job.data.to,
          from: job.data.from,
          subject: job.data.subject,
          template: job.data.template,
          context: job.data.context,
        });

      default:
        return;
    }
  }
}

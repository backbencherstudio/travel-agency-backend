import { Injectable } from '@nestjs/common';
import appConfig from '../config/app.config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MailService {
  constructor(@InjectQueue('mail-queue') private queue: Queue) {}

  async sendMemberInvitation({ user, member, url }) {
    const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
    const subject = `${user.fname} is inviting you to ${appConfig().app.name}`;

    // add to queue
    await this.queue.add('sendMemberInvitation', {
      to: member.email,
      from: from,
      subject: subject,
      template: 'member-invitation',
      context: {
        user: user,
        member: member,
        url: url,
      },
    });
  }

  // send otp code for email verification
  async sendOtpCodeToEmail({ name, email, otp }) {
    const from = `${process.env.APP_NAME} <${appConfig().mail.from}>`;
    const subject = 'Email Verification';

    // add to queue
    await this.queue.add('sendOtpCodeToEmail', {
      to: email,
      from: from,
      subject: subject,
      template: 'email-verification',
      context: {
        name: name,
        otp: otp,
      },
    });
  }
}

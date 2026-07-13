import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { OtpCodeTemplate } from './templates/otp-code.template';
import { InvitationTemplate } from './templates/invitation.template';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY!);

  private readonly from = 'Football tournament <no-reply@crm-core.space>';

  async sendLoginCode(email: string, otp: string) {
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: `Ваш код входу: ${otp}`,
      html: OtpCodeTemplate(otp),
    });
  }

  async sendInvitation(email: string, token: string) {
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Invitation',
      html: InvitationTemplate(token),
    });
  }
}

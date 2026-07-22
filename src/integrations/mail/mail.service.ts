import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { InvitationTemplate } from './templates/invitation.template';

@Injectable()
export class MailService {
  private resend = new Resend(process.env.RESEND_API_KEY!);

  private readonly from = 'Football tournament <no-reply@crm-core.space>';

  async sendInvitation(email: string, token: string) {
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Invitation',
      html: InvitationTemplate(token),
    });
  }
}

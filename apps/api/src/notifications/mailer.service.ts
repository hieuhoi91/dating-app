import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailerService implements OnModuleDestroy {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  onModuleDestroy(): void {
    this.transporter?.close();
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const url = new URL('/auth/verify', this.requireConfig('WEB_APP_URL'));
    url.searchParams.set('token', token);
    await this.send({
      to,
      subject: 'Xác thực email DATING APP',
      text: `Mở liên kết sau để xác thực email của bạn: ${url.toString()}\nLiên kết có hiệu lực trong 24 giờ.`,
      html: `<p>Vui lòng xác thực email để hoàn tất đăng ký DATING.</p><p><a href="${url.toString()}">Xác thực email</a></p><p>Liên kết có hiệu lực trong 24 giờ.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const url = new URL(
      '/auth/reset-password',
      this.requireConfig('WEB_APP_URL'),
    );
    url.searchParams.set('token', token);
    await this.send({
      to,
      subject: 'Đặt lại mật khẩu DATING',
      text: `Mở liên kết sau để đặt lại mật khẩu: ${url.toString()}\nLiên kết có hiệu lực trong 30 phút.`,
      html: `<p>Bạn đã yêu cầu đặt lại mật khẩu DATING.</p><p><a href="${url.toString()}">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    });
  }

  private async send(message: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<void> {
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.requireConfig('SMTP_FROM');
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, ...message }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw Object.assign(
          new Error(
            `Resend email API rejected the message (HTTP ${response.status}).`,
          ),
          { status: response.status },
        );
      }
      return;
    }

    const transporter = this.getTransporter();
    await transporter.sendMail({ from, ...message });
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';
    if (!host || !port || !user || !password) {
      throw new ServiceUnavailableException(
        'Mailer chưa được cấu hình đầy đủ. Hãy thiết lập SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD và SMTP_FROM.',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
    });
    return this.transporter;
  }

  private requireConfig(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new ServiceUnavailableException(
        `Mailer chưa được cấu hình đầy đủ. Hãy thiết lập ${name}.`,
      );
    }
    return value;
  }
}

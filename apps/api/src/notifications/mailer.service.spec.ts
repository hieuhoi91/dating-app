import { ConfigService } from '@nestjs/config';
import { MailerService } from './mailer.service.js';

describe('MailerService Resend delivery', () => {
  const configValues: Record<string, string> = {
    RESEND_API_KEY: 're_test_key',
    SMTP_FROM: 'DATING <hello@example.com>',
    WEB_APP_URL: 'https://dating.example.com',
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createMailer(): MailerService {
    const config = {
      get: vi.fn((name: string) => configValues[name]),
    } as unknown as ConfigService;
    return new MailerService(config);
  }

  it('sends verification email through the Resend HTTPS API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await createMailer().sendVerificationEmail('person@example.com', 'token-value');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      Authorization: 'Bearer re_test_key',
      'Content-Type': 'application/json',
    });
    if (typeof options.body !== 'string') {
      throw new Error('Expected a JSON request body.');
    }
    expect(JSON.parse(options.body)).toMatchObject({
      from: 'DATING <hello@example.com>',
      to: 'person@example.com',
      subject: 'Xác thực email DATING APP',
      text: expect.stringContaining(
        'https://dating.example.com/auth/verify?token=token-value',
      ),
    });
  });

  it('surfaces the Resend HTTP status when delivery fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );

    await expect(
      createMailer().sendVerificationEmail('person@example.com', 'token-value'),
    ).rejects.toMatchObject({
      message: 'Resend email API rejected the message (HTTP 403).',
      status: 403,
    });
  });
});

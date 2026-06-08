import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as querystring from 'querystring'; 

interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

@Injectable()
export class SmsService implements SmsProvider {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  async send(to: string, body: string): Promise<void> {
    const provider = this.configService.get<string>('SMS_PROVIDER', 'console');

    try {
      if (provider === 'twilio') {
        await this.sendViaTwilio(to, body);
      } else {
        this.logger.log(`[SMS Console] To: ${to} | Body: ${body}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send SMS to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private sendViaTwilio(to: string, body: string): Promise<void> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
    const authToken  = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    const from       = this.configService.get<string>('TWILIO_FROM_NUMBER', '');

    if (!accountSid || !authToken || !from) {
      this.logger.warn('Twilio credentials not configured, falling back to console');
      this.logger.log(`[SMS Console] To: ${to} | Body: ${body}`);
      return Promise.resolve();
    }

    const postData = querystring.stringify({ To: to, From: from, Body: body });
    const auth     = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    return new Promise<void>((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.twilio.com',
          path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            Authorization: `Basic ${auth}`,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: string) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`Twilio error ${res.statusCode}: ${data}`));
            } else {
              resolve();
            }
          });
        },
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async sendBulk(recipients: string[], body: string): Promise<void> {
    await Promise.allSettled(recipients.map((to) => this.send(to, body)));
  }
}

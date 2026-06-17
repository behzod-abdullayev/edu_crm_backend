import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly appName: string;
  private readonly appUrl: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('APP_NAME', 'EduCRM');
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  // ─── Base layout ────────────────────────────────────────────────────────────
  private baseLayout(content: string, previewText = ''): string {
    return `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${this.appName}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #f1f5f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
    .email-wrapper { background-color: #f1f5f9; padding: 40px 16px; }
    .email-container { max-width: 580px; margin: 0 auto; }
    .email-header { text-align: center; margin-bottom: 24px; }
    .email-header .logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
    .email-header .logo-icon { width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; }
    .email-header .logo-text { font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px; }
    .email-card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05); }
    .card-banner { height: 6px; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%); }
    .card-body { padding: 40px 40px 36px; }
    .email-footer { text-align: center; margin-top: 24px; padding: 0 16px; }
    .email-footer p { font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .email-footer a { color: #64748b; text-decoration: none; }
    .email-footer a:hover { color: #3b82f6; }
    .footer-divider { border: none; border-top: 1px solid #e2e8f0; margin: 8px auto; max-width: 200px; }
    h1.greeting { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 12px; letter-spacing: -0.3px; }
    p.subtitle { font-size: 15px; color: #475569; line-height: 1.65; margin-bottom: 20px; }
    .divider { border: none; border-top: 1px solid #f1f5f9; margin: 28px 0; }
    .btn { display: inline-block; padding: 13px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center; cursor: pointer; }
    .btn-primary { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff !important; box-shadow: 0 4px 14px rgba(59,130,246,0.4); }
    .btn-center { text-align: center; margin: 28px 0; }
    .info-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #475569; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #1e293b; min-width: 130px; }
    .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; display: flex; gap: 10px; margin-top: 20px; }
    .warning-box .icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .warning-box p { font-size: 13px; color: #92400e; line-height: 1.5; }
    .success-badge { display: inline-flex; align-items: center; gap: 6px; background: #ecfdf5; color: #065f46; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 20px; border: 1px solid #a7f3d0; margin-bottom: 20px; }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <div class="email-wrapper">
    <div class="email-container">

      <!-- Header / Logo -->
      <div class="email-header">
        <a href="${this.appUrl}" class="logo">
          <span class="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3L22 8.5V15.5L12 21L2 15.5V8.5L12 3Z" fill="white" opacity="0.9"/>
              <path d="M12 8L16 10.5V15L12 17L8 15V10.5L12 8Z" fill="white" opacity="0.5"/>
            </svg>
          </span>
          <span class="logo-text">${this.appName}</span>
        </a>
      </div>

      <!-- Card -->
      <div class="email-card">
        <div class="card-banner"></div>
        <div class="card-body">
          ${content}
        </div>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>Ushbu xabar <strong>${this.appName}</strong> tizimi tomonidan avtomatik yuborildi.</p>
        <hr class="footer-divider">
        <p>
          <a href="${this.appUrl}">Tizimga kirish</a>
          &nbsp;·&nbsp;
          <a href="${this.appUrl}/help">Yordam</a>
          &nbsp;·&nbsp;
          <a href="mailto:${this.configService.get('EMAIL_FROM', 'support@educrm.com')}">Bog'lanish</a>
        </p>
        <p style="margin-top:8px;">© ${new Date().getFullYear()} ${this.appName}. Barcha huquqlar himoyalangan.</p>
      </div>

    </div>
  </div>
</body>
</html>`;
  }

  // ─── OTP / Forgot Password ────────────────────────────────────────────────
  async sendOtpEmail(email: string, otpCode: string, name?: string): Promise<boolean> {
    const content = `
      <h1 class="greeting">Parolni tiklash 🔐</h1>
      <p class="subtitle">
        Salom${name ? `, <strong>${name}</strong>` : ''}! Siz parolni tiklash so'rovini yubordingiz.<br>
        Quyidagi bir martalik kodni tizimga kiriting:
      </p>

      <!-- OTP Block — triple-click to select all -->
      <div style="background:linear-gradient(135deg,#eff6ff 0%,#eef2ff 100%);border:1.5px solid #bfdbfe;border-radius:14px;padding:32px 24px;text-align:center;margin:8px 0 24px;">

        <p style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:0 0 20px;">Tasdiqlash kodi</p>

        <!-- Single big copyable code block -->
        <div style="background:#0f172a;border-radius:12px;padding:22px 32px;display:inline-block;cursor:text;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:700;color:#ffffff;letter-spacing:10px;margin:0;user-select:all;-webkit-user-select:all;">${otpCode}</p>
        </div>

        <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;color:#94a3b8;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Kodni nusxa olish uchun ustiga <strong>bir marta bosing</strong>
        </p>

        <!-- Timer -->
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #bfdbfe;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style="font-size:13px;color:#94a3b8;vertical-align:middle;">Ushbu kod <strong style="color:#dc2626;">15 daqiqa</strong> amal qiladi</span>
        </div>
      </div>

      <div class="warning-box">
        <span class="icon">⚠️</span>
        <p>Agar siz bu so'rovni yubormagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring va parolingizni o'zgartiring. Kodingizni hech kimga bermang.</p>
      </div>

      <hr class="divider">
      <p style="font-size:13px;color:#94a3b8;line-height:1.6;">
        Yordam kerakmi? <a href="mailto:${this.configService.get('EMAIL_FROM', 'support@educrm.com')}" style="color:#3b82f6;text-decoration:none;font-weight:500;">Biz bilan bog'laning</a>
      </p>
    `;

    return this.send(email, `Parolni tiklash kodi: ${otpCode} — ${this.appName}`, content, `Tasdiqlash kodingiz: ${otpCode}`);
  }

  // ─── Invite Email ────────────────────────────────────────────────────────
  async sendInviteEmail(email: string, name: string, inviteUrl: string, tempPassword: string): Promise<boolean> {
    const content = `
      <div class="success-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Sizga taklif yuborildi
      </div>

      <h1 class="greeting">Xush kelibsiz, ${name}!</h1>
      <p class="subtitle">
        Siz <strong>${this.appName}</strong> tizimiga taklif qilindingiz.<br>
        Quyida sizning akkauntingiz uchun vaqtinchalik parol ko'rsatilgan.
      </p>

      <!-- Parol bloki -->
      <div style="background:linear-gradient(135deg,#eff6ff 0%,#eef2ff 100%);border:1.5px solid #bfdbfe;border-radius:14px;padding:28px 24px;text-align:center;margin:8px 0 20px;">
        <p style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Sizning vaqtinchalik parolingiz</p>
        <div style="background:#0f172a;border-radius:12px;padding:18px 28px;display:inline-block;cursor:text;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:6px;margin:0;user-select:all;-webkit-user-select:all;">${tempPassword}</p>
        </div>
        <p style="font-size:12px;color:#64748b;margin:14px 0 0;">Parolni <strong>nusxa oling</strong> — quyidagi tugmani bosgandan so'ng to'g'ridan-to'g'ri login sahifasiga o'tasiz</p>
      </div>

      <!-- Muhim ogohlantirish -->
      <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:14px 16px;display:flex;gap:10px;margin-bottom:20px;">
        <span style="font-size:20px;flex-shrink:0;">⚠️</span>
        <p style="font-size:13px;color:#9a3412;line-height:1.6;margin:0;">
          <strong>Muhim:</strong> Quyidagi "Taklifni qabul qilish" tugmasini bosishdan <strong>OLDIN</strong> yuqoridagi parolni nusxalab oling!
          Tugmani bosganingizda siz to'g'ridan-to'g'ri <strong>login sahifasiga</strong> o'tasiz va o'sha parol bilan kirishingiz kerak bo'ladi.
        </p>
      </div>

      <div class="btn-center">
        <a href="${inviteUrl}" class="btn btn-primary">Taklifni qabul qilish →</a>
      </div>

      <hr class="divider">

      <!-- Kirish ma'lumotlari -->
      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin-bottom:20px;">
        <p style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Kirish ma'lumotlari</p>
        <div class="info-row">
          <span class="info-label">📧 Email:</span>
          <span style="color:#1e293b;font-weight:500;">${email}</span>
        </div>
        <div class="info-row" style="border-bottom:none;">
          <span class="info-label">🔑 Parol:</span>
          <code style="background:#1e293b;color:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:14px;letter-spacing:1px;">${tempPassword}</code>
        </div>
      </div>

      <!-- Maslahat -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;display:flex;gap:10px;">
        <span style="font-size:18px;flex-shrink:0;">💡</span>
        <p style="font-size:13px;color:#14532d;line-height:1.6;margin:0;">
          Tizimga kirganingizdan so'ng, xavfsizlik uchun vaqtinchalik parolni esda qoladigan parolga o'zgartirishni tavsiya qilamiz.
        </p>
      </div>
    `;

    return this.send(email, `${this.appName} — Sizga taklif yuborildi, ${name}!`, content, `Parolingiz: ${tempPassword} — ${this.appName} taklifini qabul qiling`);
  }

  // ─── Welcome Email ────────────────────────────────────────────────────────
  async sendWelcomeEmail(email: string, name: string, password: string): Promise<boolean> {
    const content = `
      <div class="success-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Hisob muvaffaqiyatli yaratildi
      </div>

      <h1 class="greeting">Xush kelibsiz, ${name}! 🎉</h1>
      <p class="subtitle">
        <strong>${this.appName}</strong> tizimiga qo'shildingiz. Quyidagi ma'lumotlar bilan tizimga kiring:
      </p>

      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:8px 0 24px;">
        <div class="info-row">
          <span class="info-label">📧 Email:</span>
          <span style="color:#1e293b;font-weight:500;">${email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">🔑 Vaqtinchalik parol:</span>
          <code style="background:#1e293b;color:#f1f5f9;padding:4px 10px;border-radius:6px;font-size:14px;letter-spacing:1px;">${password}</code>
        </div>
      </div>

      <div class="btn-center">
        <a href="${this.appUrl}/login" class="btn btn-primary">Tizimga kirish →</a>
      </div>

      <div class="warning-box">
        <span class="icon">🔒</span>
        <p>Xavfsizlik uchun tizimga kirgandan so'ng darhol parolingizni o'zgartiring. Vaqtinchalik parolni hech kimga bermang.</p>
      </div>
    `;

    return this.send(email, `${this.appName} tizimiga xush kelibsiz, ${name}!`, content, `${this.appName} tizimiga muvaffaqiyatli ro'yxatdan o'tdingiz`);
  }

  // ─── Password Changed Confirmation ───────────────────────────────────────
  async sendPasswordChangedEmail(email: string, name: string): Promise<boolean> {
    const now = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });

    const content = `
      <h1 class="greeting">Parol o'zgartirildi ✅</h1>
      <p class="subtitle">
        Salom, <strong>${name}</strong>! Hisobingiz paroli muvaffaqiyatli o'zgartirildi.
      </p>

      <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin:8px 0 24px;">
        <div class="info-row">
          <span class="info-label">📅 Sana va vaqt:</span>
          <span style="color:#1e293b;">${now}</span>
        </div>
        <div class="info-row">
          <span class="info-label">📧 Email:</span>
          <span style="color:#1e293b;">${email}</span>
        </div>
      </div>

      <div class="warning-box">
        <span class="icon">⚠️</span>
        <p>Agar siz bu o'zgarishni amalga oshirmagan bo'lsangiz, <a href="mailto:${this.configService.get('EMAIL_FROM', 'support@educrm.com')}" style="color:#92400e;font-weight:600;">darhol biz bilan bog'laning</a>.</p>
      </div>
    `;

    return this.send(email, `Parol o'zgartirildi — ${this.appName}`, content, 'Hisobingiz paroli muvaffaqiyatli o\'zgartirildi');
  }

  // ─── Payment Confirmation ─────────────────────────────────────────────────
  async sendPaymentConfirmationEmail(
    email: string,
    name: string,
    amount: number,
    invoiceNumber: string,
    courseName?: string,
  ): Promise<boolean> {
    const formattedAmount = new Intl.NumberFormat('uz-UZ').format(amount);

    const content = `
      <h1 class="greeting">To'lov tasdiqlandi 💳</h1>
      <p class="subtitle">
        Salom, <strong>${name}</strong>! To'lovingiz muvaffaqiyatli qabul qilindi.
      </p>

      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:20px 24px;margin:8px 0 24px;">
        <div class="info-row">
          <span class="info-label">🧾 Invoice №:</span>
          <code style="background:#1e293b;color:#f1f5f9;padding:3px 8px;border-radius:5px;font-size:13px;">${invoiceNumber}</code>
        </div>
        ${courseName ? `
        <div class="info-row">
          <span class="info-label">📚 Kurs:</span>
          <span style="color:#1e293b;font-weight:500;">${courseName}</span>
        </div>` : ''}
        <div class="info-row" style="border-bottom:none;">
          <span class="info-label">💰 Summa:</span>
          <span style="font-size:18px;font-weight:700;color:#059669;">${formattedAmount} so'm</span>
        </div>
      </div>

      <div class="btn-center">
        <a href="${this.appUrl}/payments" class="btn btn-primary">To'lovlarni ko'rish</a>
      </div>
    `;

    return this.send(email, `To'lov tasdiqlandi: ${invoiceNumber} — ${this.appName}`, content, `${formattedAmount} so'm to'lov qabul qilindi`);
  }

  // ─── General / Custom ────────────────────────────────────────────────────
  async sendGeneral(to: string, subject: string, html: string): Promise<boolean> {
    return this.send(to, subject, html);
  }

  // ─── Internal send helper ─────────────────────────────────────────────────
  private async send(to: string, subject: string, content: string, previewText = ''): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        html: this.baseLayout(content, previewText),
      });
      this.logger.log(`✉️  Email yuborildi → ${to} | ${subject}`);
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Email xatolik (${to}): ${error.message}`, error.stack);
      return false;
    }
  }

async sendPasswordReset(email: string, name: string, resetUrl: string): Promise<boolean> {
    return this.send(
      email,
      'Password Reset Request',
      `<h1>Password Reset</h1><p>Hello ${name},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      'Reset your password',
    );
  }

  async sendHomeworkAssigned(email: string, name: string, homework: any): Promise<boolean> {
    return this.send(
      email,
      `New Homework: ${homework.title}`,
      `<h1>New Homework Assigned</h1><p>Hello ${name},</p><p>A new homework "${homework.title}" has been assigned. Due: ${homework.dueDate}.</p>`,
      'New homework assignment',
    );
  }

  async sendExamReminder(email: string, name: string, exam: any): Promise<boolean> {
    return this.send(
      email,
      `Exam Reminder: ${exam.title}`,
      `<h1>Upcoming Exam</h1><p>Hello ${name},</p><p>Reminder: "${exam.title}" is scheduled for ${exam.startAt}. Duration: ${exam.duration} minutes.</p>`,
      'Exam reminder',
    );
  }


  async sendPlainEmail(to: string, subject: string, html: string): Promise<boolean> {
    return this.send(to, subject, html, subject);
  }

}

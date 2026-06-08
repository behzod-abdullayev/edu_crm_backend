import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Certificate } from './entities/certificate.entity';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificate) private certRepo: Repository<Certificate>,
    private configService: ConfigService,
  ) {}

  private generateCertNumber(_tenantId: string): string {
    return `CERT-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  async issue(dto: Partial<Certificate>, tenantId: string, issuedBy: string): Promise<Certificate> {
    const certificateNumber = this.generateCertNumber(tenantId);
    const verificationCode = uuidv4().replace(/-/g, '').toUpperCase();

    const cert = this.certRepo.create({
      ...dto, tenantId, issuedBy, certificateNumber, verificationCode, issuedAt: new Date(),
    });
    const saved = await this.certRepo.save(cert);

    const pdfUrl = await this.generatePdf(saved);
    await this.certRepo.update(saved.id, { fileUrl: pdfUrl });
    saved.fileUrl = pdfUrl;
    return saved;
  }

  async generatePdf(cert: Certificate): Promise<string> {
    const dir = path.join('./uploads', cert.tenantId, 'certificates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `${cert.certificateNumber}.pdf`;
    const filePath = path.join(dir, fileName);

    const appUrl = this.configService.get<string>('APP_URL', 'http://localhost:4001');
    const verifyUrl = `${appUrl}/api/v1/certificates/${cert.id}/verify`;

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ layout: 'landscape', size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8f9fa');
      // Border
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#2c3e50');

      // Title
      doc.fontSize(36).font('Helvetica-Bold').fill('#2c3e50')
        .text('CERTIFICATE OF COMPLETION', { align: 'center' });
      doc.moveDown();

      doc.fontSize(18).font('Helvetica').fill('#555')
        .text('This is to certify that', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(28).font('Helvetica-Bold').fill('#e74c3c')
        .text('Student Name', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(14).font('Helvetica').fill('#555')
        .text('has successfully completed the course', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(22).font('Helvetica-Bold').fill('#2c3e50')
        .text('Course Name', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(10).fill('#888')
        .text(`Certificate No: ${cert.certificateNumber}`, { align: 'center' })
        .text(`Verification Code: ${cert.verificationCode}`, { align: 'center' })
        .text(`Issued: ${cert.issuedAt.toLocaleDateString()}`, { align: 'center' });

      // QR code at bottom-right corner
      try {
        doc.image(qrBuffer, doc.page.width - 150, doc.page.height - 150, { width: 100 });
        doc.fontSize(8).fill('#888').text(
          'Scan to verify',
          doc.page.width - 150,
          doc.page.height - 50,
          { width: 100, align: 'center' },
        );
      } catch (_e) {
        // QR embed failed — continue without it
      }

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const pdfUrl = `/uploads/${cert.tenantId}/certificates/${fileName}`;
    await this.certRepo.update(cert.id, { fileUrl: pdfUrl, qrCodeUrl: verifyUrl });
    return pdfUrl;
  }

  async findAll(tenantId: string): Promise<Certificate[]> {
    return this.certRepo.find({ where: { tenantId }, relations: ['student', 'student.user', 'course'] });
  }

  async findByStudent(studentId: string, tenantId: string): Promise<Certificate[]> {
    return this.certRepo.find({ where: { studentId, tenantId }, relations: ['course'] });
  }

  async verify(verificationCode: string): Promise<Certificate | null> {
    return this.certRepo.findOne({ where: { verificationCode }, relations: ['student', 'student.user', 'course'] });
  }

  async revoke(id: string, tenantId: string): Promise<Certificate> {
    const cert = await this.certRepo.findOne({ where: { id, tenantId } });
    if (!cert) throw new NotFoundException('Certificate not found');
    cert.isValid = false;
    return this.certRepo.save(cert);
  }
}

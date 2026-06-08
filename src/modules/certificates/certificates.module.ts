import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificatesRepository } from './certificates.repository';
import { Certificate } from './entities/certificate.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../courses/entities/course.entity';
import { FilesModule } from '../files/files.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, Student, Course]), FilesModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificatesRepository],
  exports: [CertificatesService],
})
export class CertificatesModule {}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Security & Performance
  app.use(helmet());
  app.use(compression());

  // Body parsers
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Stripe webhook uchun raw body
  app.use('/api/v1/payments/webhook/stripe', json({ type: 'application/json' }));

  // CORS — supports multi-tenant subdomains
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      const allowed = configService
        .get<string>('CORS_ORIGINS', 'http://localhost:3000')
        .split(',')
        .map((s) => s.trim());
      const rootDomain = configService.get<string>('ROOT_DOMAIN', 'localhost:3000');
      if (!origin || allowed.includes(origin) || origin.endsWith(`.${rootDomain}`)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'Accept-Language',
      'X-Request-ID',
    ],
  });

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/ready', 'health/live'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors & filters
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(logger),
  );

  // Static files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  // Swagger — always enabled so orval can fetch the schema in any environment
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduCRM API')
    .setDescription('Enterprise-grade CRM + LMS Backend')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'TenantID')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document, {
    jsonDocumentUrl: 'api/v1/docs-json',
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>('PORT', 4001);
  await app.listen(port);

  logger.log(`🚀 Server running on: http://localhost:${port}`, 'Bootstrap');
  logger.log(`📚 Swagger UI:   http://localhost:${port}/api/v1/docs`, 'Bootstrap');
  logger.log(`📄 Swagger JSON: http://localhost:${port}/api/v1/docs-json`, 'Bootstrap');
}

bootstrap();

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  status: 'ok' | 'error';

  @ApiProperty()
  timestamp: string;
}

export class ReadinessResponseDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  status: 'ok' | 'error';

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ enum: ['connected', 'disconnected'] })
  database: 'connected' | 'disconnected';
}

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Basic liveness check' })
  @ApiResponse({ status: 200, type: HealthResponseDto, description: 'Service is alive' })
  check(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  @ApiResponse({ status: 200, type: HealthResponseDto, description: 'Service is alive' })
  live(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe — checks DB connection' })
  @ApiResponse({ status: 200, type: ReadinessResponseDto, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready (DB unavailable)' })
  async ready(): Promise<ReadinessResponseDto> {
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const response: ReadinessResponseDto = {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };

    if (dbStatus === 'disconnected') {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return response;
  }
}

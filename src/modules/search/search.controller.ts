import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Search')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across students, teachers, and courses (Cmd+K)' })
  @ApiResponse({ status: 200, type: SearchResponseDto })
  search(
    @Query() query: SearchQueryDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: User,
  ): Promise<SearchResponseDto> {
    return this.searchService.search(tenantId, user.role, query);
  }
}

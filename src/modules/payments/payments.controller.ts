import {
  Controller, Get, Post, Body, Patch, Param,
  UseGuards, Query, ParseUUIDPipe, Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { ApplyDiscountDto, CreateDiscountDto } from './dto/apply-discount.dto';
import { RefundDto } from './dto/refund.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { DebtSummaryResponseDto } from './dto/debt-summary-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../shared/enums';
import { Discount } from './entities/discount.entity';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiExtraModels(PaymentResponseDto)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── 1. POST / ────────────────────────────────────────────────────────────
  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create payment invoice' })
  @ApiResponse({ status: 201, type: PaymentResponseDto, description: 'Payment created' })
  create(@Body() dto: CreatePaymentDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.paymentsService.create(dto, tenantId, user.id);
  }

  // ─── 2. GET / ─────────────────────────────────────────────────────────────
  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List payments with filters' })
  @ApiPaginatedResponse(PaymentResponseDto)
  findAll(@Query() query: QueryPaymentsDto, @TenantId() tenantId: string) {
    return this.paymentsService.findAll(tenantId, query);
  }

  // ─── 3. GET /report/revenue ───────────────────────────────────────────────
  @Get('report/revenue')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Revenue report by date range' })
  @ApiResponse({ status: 200, description: 'Revenue report data' })
  getRevenueReport(@TenantId() tenantId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.paymentsService.getRevenueReport(tenantId, new Date(from), new Date(to));
  }

  // ─── 4. GET /report/debtors ───────────────────────────────────────────────
  @Get('report/debtors')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List students with overdue payments' })
  @ApiResponse({ status: 200, description: 'List of debtors', isArray: true })
  getDebtors(@TenantId() tenantId: string) {
    return this.paymentsService.getDebtors(tenantId);
  }

  // ─── 5. GET /invoices ─────────────────────────────────────────────────────
  @Get('invoices')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all invoices with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of invoices',
  })
  findAllInvoices(
    @TenantId() tenantId: string,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.paymentsService.findAllInvoices(tenantId, query);
  }

  // ─── 6. GET /subscriptions ────────────────────────────────────────────────
  @Get('subscriptions')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all recurring payment subscriptions' })
  @ApiResponse({
    status: 200,
    description: 'List of recurring payments acting as subscriptions',
    isArray: true,
  })
  getSubscriptions(@TenantId() tenantId: string) {
    return this.paymentsService.getSubscriptions(tenantId);
  }

  // ─── 7. POST /discounts ───────────────────────────────────────────────────
  @Post('discounts')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create discount code' })
  @ApiResponse({ status: 201, description: 'Discount created' })
  createDiscount(@Body() dto: CreateDiscountDto, @TenantId() tenantId: string, @CurrentUser() user: User) {
    return this.paymentsService.createDiscount(dto as unknown as Partial<Discount>, tenantId, user.id);
  }

  // ─── 8. POST /apply-discount ──────────────────────────────────────────────
  @Post('apply-discount')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Apply discount code to payment' })
  @ApiResponse({ status: 200, description: 'Discount applied' })
  applyDiscount(@Body() dto: ApplyDiscountDto, @TenantId() tenantId: string) {
    return this.paymentsService.applyDiscount(dto, tenantId);
  }

  // ─── 9. GET /debt/:studentId ──────────────────────────────────────────────
  @Get('debt/:studentId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get debt summary for a student' })
  @ApiResponse({
    status: 200,
    type: DebtSummaryResponseDto,
    description: 'Debt summary with overdue payment breakdown',
  })
  @ApiResponse({ status: 404, description: 'Student not found' })
  getDebtSummary(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @TenantId() tenantId: string,
  ) {
    return this.paymentsService.getDebtSummary(studentId, tenantId);
  }

  // ─── 10. GET /webhook/stripe (GET) ────────────────────────────────────────
  // NOTE: There is no existing GET /webhook/stripe in the original file.
  // The original only has POST /webhook/stripe. Keeping POST below at position 19.

  // ─── 11. GET /:id ─────────────────────────────────────────────────────────
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, type: PaymentResponseDto, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.paymentsService.findOne(id, tenantId);
  }

  // ─── 12. GET /invoices/:id ────────────────────────────────────────────────
  @Get('invoices/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get single invoice by ID' })
  @ApiResponse({
    status: 200,
    description: 'Invoice detail',
  })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOneInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
  ) {
    return this.paymentsService.findOneInvoice(id, tenantId);
  }

  // ─── 13. PATCH /:id ───────────────────────────────────────────────────────
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update payment' })
  @ApiResponse({ status: 200, type: PaymentResponseDto, description: 'Payment updated' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePaymentDto, @TenantId() tenantId: string) {
    return this.paymentsService.update(id, dto, tenantId);
  }

  // ─── 14. POST /:id/pay ────────────────────────────────────────────────────
  @Post(':id/pay')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm payment as paid' })
  @ApiResponse({ status: 200, type: PaymentResponseDto, description: 'Payment confirmed as paid' })
  pay(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.paymentsService.pay(id, tenantId);
  }

  // ─── 15. POST /:id/refund ─────────────────────────────────────────────────
  @Post(':id/refund')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Process refund' })
  @ApiResponse({ status: 200, type: PaymentResponseDto, description: 'Refund processed' })
  refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundDto,
    @TenantId() tenantId: string,
  ) {
    return this.paymentsService.refund(id, dto, tenantId);
  }

  // ─── 16. GET /:id/receipt ─────────────────────────────────────────────────
  @Get(':id/receipt')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Download payment receipt PDF' })
  @ApiResponse({ status: 200, description: 'PDF receipt file', content: { 'application/pdf': {} } })
  async getReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.paymentsService.generateReceipt(id, tenantId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="receipt-${id}.pdf"` });
    res.send(buffer);
  }

  // ─── 17. GET /:id/invoice ─────────────────────────────────────────────────
  @Get(':id/invoice')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get invoice record for payment' })
  @ApiResponse({ status: 200, description: 'Invoice record' })
  getInvoice(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string) {
    return this.paymentsService.getInvoice(id, tenantId);
  }

  // ─── 18. GET /:id/invoice/pdf ─────────────────────────────────────────────
  @Get(':id/invoice/pdf')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Download invoice PDF' })
  @ApiResponse({ status: 200, description: 'PDF invoice file', content: { 'application/pdf': {} } })
  async getInvoicePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.paymentsService.generateInvoicePdf(id, tenantId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="invoice-${id}.pdf"` });
    res.send(buffer);
  }

  // ─── 19. POST /webhook/stripe ─────────────────────────────────────────────
  @Post('webhook/stripe')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  handleStripeWebhook(@Body() _payload: Record<string, unknown>, @Res() res: Response) {
    res.json({ received: true });
  }
}

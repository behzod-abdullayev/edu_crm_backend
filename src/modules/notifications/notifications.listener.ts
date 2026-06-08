import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { User } from '../users/entities/user.entity';
import { NotificationChannel } from '../../shared/enums';
import { InjectRepository } from '@nestjs/typeorm';

interface AuthLoginEvent { userId: string; ip: string; }
interface UserCreatedEvent { user: User; }
interface EnrollmentCreatedEvent { enrollment: { studentId: string; tenantId: string }; course: { title: string } }
interface PaymentCreatedEvent { payment: { studentId: string; tenantId: string; invoiceNumber: string; totalAmount: number } }
interface PaymentPaidEvent { payment: { studentId: string; tenantId: string; invoiceNumber: string } }

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private notificationsService: NotificationsService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @OnEvent('auth.login')
  async handleAuthLogin(event: AuthLoginEvent): Promise<void> {
    this.logger.debug(`User ${event.userId} logged in from ${event.ip}`);
  }

  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: event.user.id,
        tenantId: event.user.tenantId,
        channel: NotificationChannel.IN_APP,
        title: 'Welcome to EduCRM!',
        body: `Hello ${event.user.firstName}, your account has been created successfully.`,
      });
    } catch (err) {
      this.logger.error('Failed to send welcome notification', err);
    }
  }

  @OnEvent('enrollment.created')
  async handleEnrollmentCreated(event: EnrollmentCreatedEvent): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: event.enrollment.studentId } });
      if (!user) return;
      await this.notificationsService.send({
        userId: event.enrollment.studentId,
        tenantId: event.enrollment.tenantId,
        channel: NotificationChannel.IN_APP,
        title: 'Course Enrollment',
        body: `You have been enrolled in "${event.course.title}".`,
      });
    } catch (err) {
      this.logger.error('Failed to send enrollment notification', err);
    }
  }

  @OnEvent('payment.created')
  async handlePaymentCreated(event: PaymentCreatedEvent): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: event.payment.studentId,
        tenantId: event.payment.tenantId,
        channel: NotificationChannel.IN_APP,
        title: 'Payment Invoice',
        body: `Invoice ${event.payment.invoiceNumber} for ${event.payment.totalAmount} UZS has been created.`,
      });
    } catch (err) {
      this.logger.error('Failed to send payment notification', err);
    }
  }

  @OnEvent('payment.paid')
  async handlePaymentPaid(event: PaymentPaidEvent): Promise<void> {
    try {
      await this.notificationsService.send({
        userId: event.payment.studentId,
        tenantId: event.payment.tenantId,
        channel: NotificationChannel.IN_APP,
        title: 'Payment Confirmed',
        body: `Payment for invoice ${event.payment.invoiceNumber} has been confirmed. Thank you!`,
      });
    } catch (err) {
      this.logger.error('Failed to send payment confirmation', err);
    }
  }

  @OnEvent('stripe.payment.succeeded')
  async handleStripePaymentSucceeded(event: { paymentIntentId: string; metadata: Record<string, string> }): Promise<void> {
    this.logger.log(`Stripe payment succeeded: ${event.paymentIntentId}`);
    if (event.metadata?.paymentId) {
      // Could link to internal payment record here
      this.logger.debug(`Linked to internal payment: ${event.metadata.paymentId}`);
    }
  }
}

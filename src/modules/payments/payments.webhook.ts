import { Controller, Post, Headers, Body, RawBodyRequest, Req, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Public } from '../../common/decorators/public.decorator';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('payments/webhook')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY', ''),
      { apiVersion: '2025-02-24.acacia' },
    );
  }

  @Public()
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ): Promise<{ received: boolean }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    if (!webhookSecret) {
      this.logger.warn('Stripe webhook secret not configured');
      return { received: true };
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        sig,
        webhookSecret,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Stripe webhook signature verification failed: ${message}`);
      throw new BadRequestException(`Webhook Error: ${message}`);
    }

    this.logger.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.eventEmitter.emit('stripe.payment.succeeded', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          metadata: paymentIntent.metadata,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.eventEmitter.emit('stripe.payment.failed', {
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        this.eventEmitter.emit('stripe.subscription.updated', {
          subscriptionId: subscription.id,
          status: subscription.status,
          metadata: subscription.metadata,
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        this.eventEmitter.emit('stripe.subscription.cancelled', {
          subscriptionId: subscription.id,
          metadata: subscription.metadata,
        });
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }
}

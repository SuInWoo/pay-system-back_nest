import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { AppException } from '../../../common/errors/app.exception';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { PreparePaymentDto } from '../dto/prepare-payment.dto';
import { OrderRepository } from '../../oms/repositories/order.repository';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { PaymentCreatedEvent } from '../events/payment-created.event';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentResult } from './payment.types';

@Injectable()
export class PaymentService {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
  ) {}

  async createPayment(params: {
    orderId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<PaymentResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existingSucceeded = await this.paymentRepo.findByIdempotencyKeyAndStatus(
        params.idempotencyKey,
        PaymentStatus.SUCCEEDED,
        queryRunner.manager,
      );
      if (existingSucceeded) {
        await queryRunner.commitTransaction();
        return this.toResult(existingSucceeded);
      }

      const payment = queryRunner.manager.create(Payment, {
        orderId: params.orderId,
        amount: params.amount,
        idempotencyKey: params.idempotencyKey,
        status: PaymentStatus.SUCCEEDED,
      });

      const saved = await queryRunner.manager.save(Payment, payment);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit(
        'payment.created',
        new PaymentCreatedEvent({
          orderId: saved.orderId,
          paymentId: saved.id,
          amount: saved.amount,
          occurredAt: new Date().toISOString(),
        }),
      );

      return this.toResult(saved);
    } catch (e: any) {
      await queryRunner.rollbackTransaction();

      // Postgres unique_violation
      if (e?.code === '23505') {
        const existing = await this.paymentRepo.findByIdempotencyKey(params.idempotencyKey);
        if (existing) return this.toResult(existing);
      }

      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async listPayments(params?: { order_id?: string }): Promise<PaymentResult[]> {
    const rows = await this.paymentRepo.findAll({
      orderId: params?.order_id,
    });
    return rows.map((p) => this.toResult(p));
  }

  async preparePayment(dto: PreparePaymentDto) {
    const order = await this.orderRepo.findByOrderId(dto.order_id);
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    if (order.totalAmount !== dto.amount) throw new AppException('PAYMENT_AMOUNT_MISMATCH');

    const existingByIdem = await this.paymentRepo.findByIdempotencyKey(dto.idempotency_key);
    if (
      existingByIdem &&
      (existingByIdem.orderId !== dto.order_id || existingByIdem.amount !== dto.amount)
    ) {
      throw new AppException('PAYMENT_IDEMPOTENCY_CONFLICT');
    }

    const existingByOrder = await this.paymentRepo.findByOrderId(dto.order_id);
    if (existingByOrder?.status === PaymentStatus.SUCCEEDED) {
      throw new AppException('PAYMENT_ALREADY_CONFIRMED');
    }

    return {
      orderId: order.orderId,
      amount: order.totalAmount,
      orderName: `상품 ${order.totalQuantity}건`,
      customerKey: order.ordererUserId ?? `guest-${order.orderId}`,
    };
  }

  async confirmPayment(dto: ConfirmPaymentDto) {
    const order = await this.orderRepo.findByOrderId(dto.orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    if (order.totalAmount !== dto.amount) throw new AppException('PAYMENT_AMOUNT_MISMATCH');

    const existingByOrder = await this.paymentRepo.findByOrderId(dto.orderId);
    if (existingByOrder?.status === PaymentStatus.SUCCEEDED) {
      throw new AppException('PAYMENT_ALREADY_CONFIRMED');
    }

    const toss = await this.confirmWithToss(dto);
    const payment = this.paymentRepo.create({
      orderId: dto.orderId,
      amount: dto.amount,
      idempotencyKey: `toss:${dto.paymentKey}`,
      paymentKey: dto.paymentKey,
      status: toss.status === 'DONE' ? PaymentStatus.SUCCEEDED : PaymentStatus.PENDING,
      method: toss.method ?? null,
      providerStatus: toss.status,
      approvedAt: toss.approvedAt ? new Date(toss.approvedAt) : null,
    });
    const saved = await this.paymentRepo.save(payment);

    this.eventEmitter.emit(
      'payment.created',
      new PaymentCreatedEvent({
        orderId: saved.orderId,
        paymentId: saved.id,
        amount: saved.amount,
        occurredAt: new Date().toISOString(),
      }),
    );

    return {
      id: saved.id,
      order_id: saved.orderId,
      amount: saved.amount,
      status: toss.status,
      method: saved.method,
      approved_at: saved.approvedAt?.toISOString() ?? null,
    };
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.paymentRepo.findByOrderId(orderId);
    if (!payment) throw new AppException('ORDER_NOT_FOUND');
    return this.toResult(payment);
  }

  handleTossWebhook(payload: Record<string, unknown>) {
    // 웹훅은 추후 서명검증/이벤트 타입 분기 추가 예정
    return { ok: true, received: true, eventType: String(payload.type ?? 'unknown') };
  }

  private toResult(p: Payment): PaymentResult {
    return {
      id: p.id,
      order_id: p.orderId,
      amount: p.amount,
      status: p.status,
      idempotency_key: p.idempotencyKey,
      payment_key: p.paymentKey ?? undefined,
      provider_status: p.providerStatus ?? undefined,
      method: p.method ?? undefined,
      approved_at: p.approvedAt?.toISOString(),
    };
  }

  private async confirmWithToss(dto: ConfirmPaymentDto): Promise<{
    status: string;
    method: string | null;
    approvedAt: string | null;
  }> {
    const secret = this.config.get<string>('TOSS_SECRET_KEY');
    const apiVersion = this.config.get<string>('TOSS_API_VERSION') ?? '2024-06-01';
    if (!secret) {
      throw new AppException('PAYMENT_PROVIDER_FAILED', {
        detail: 'TOSS_SECRET_KEY is not configured',
      });
    }

    const auth = Buffer.from(`${secret}:`).toString('base64');
    let response: Response;
    try {
      response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'TossPayments-Api-Version': apiVersion,
        },
        body: JSON.stringify({
          paymentKey: dto.paymentKey,
          orderId: dto.orderId,
          amount: dto.amount,
        }),
      });
    } catch {
      throw new AppException('PAYMENT_PROVIDER_FAILED');
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new AppException('PAYMENT_PROVIDER_FAILED', { detail });
    }

    const body = (await response.json()) as {
      status?: string;
      method?: string;
      approvedAt?: string;
    };
    return {
      status: body.status ?? 'PENDING',
      method: body.method ?? null,
      approvedAt: body.approvedAt ?? null,
    };
  }
}


import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppException } from '../../../common/errors/app.exception';
import { ProductRepository } from '../../master/repositories/product.repository';
import { PaymentCreatedEvent } from '../../payment/events/payment-created.event';
import { CreateOrderDetailDto } from '../dto/create-order-detail.dto';
import { OrderDetail } from '../entities/order-detail.entity';
import { DeliveryStatus, Order } from '../entities/order.entity';
import { OrderDetailRepository } from '../repositories/order-detail.repository';
import { OrderRepository } from '../repositories/order.repository';

@Injectable()
export class OmsService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly orderDetailRepo: OrderDetailRepository,
    private readonly productRepo: ProductRepository,
  ) {}

  @OnEvent('payment.created')
  async onPaymentCreated(event: PaymentCreatedEvent) {
    const existing = await this.orderRepo.findByOrderId(event.orderId);
    if (existing) return existing;

    const order = this.orderRepo.create({
      orderId: event.orderId,
      deliveryCodeType: 'DELIVERY_STATUS',
      deliveryStatus: DeliveryStatus.WAITING,
      address: '',
      totalQuantity: 0,
      totalAmount: 0,
    });
    return this.orderRepo.save(order);
  }

  async getOrderWithDetails(orderId: string) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    const details = await this.orderDetailRepo.findByOrderIdOrderByLineSeq(orderId);
    return {
      order_id: order.orderId,
      delivery_status: order.deliveryStatus,
      address: order.address,
      total_quantity: order.totalQuantity,
      total_amount: order.totalAmount,
      orderer_user_id: order.ordererUserId ?? undefined,
      orderer_name: order.ordererName ?? undefined,
      orderer_phone: order.ordererPhone ?? undefined,
      orderer_email: order.ordererEmail ?? undefined,
      details: details.map((d) => ({
        line_seq: d.lineSeq,
        client_company_id: d.clientCompanyId,
        sku: d.sku,
        product_name: d.productName,
        quantity: d.quantity,
        unit_price: d.unitPrice,
        line_amount: d.quantity * d.unitPrice,
      })),
    };
  }

  async addOrderDetails(orderId: string, dto: CreateOrderDetailDto) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');

    let nextSeq = (await this.orderDetailRepo.getMaxLineSeq(orderId)) + 1;

    const saved: OrderDetail[] = [];
    for (const item of dto.items) {
      const product = await this.productRepo.findByClientCompanyIdAndSku(
        item.client_company_id,
        item.sku,
      );
      if (!product) throw new AppException('PRODUCT_NOT_FOUND');

      const detail = this.orderDetailRepo.create({
        orderId,
        lineSeq: nextSeq++,
        clientCompanyId: product.clientCompanyId,
        sku: product.sku,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      saved.push(await this.orderDetailRepo.save(detail));
    }

    const agg = await this.orderDetailRepo.getOrderTotals(orderId);
    await this.orderRepo.update(orderId, {
      totalQuantity: agg.totalQuantity,
      totalAmount: agg.totalAmount,
    });

    return saved.map((d) => ({
      order_id: d.orderId,
      line_seq: d.lineSeq,
      client_company_id: d.clientCompanyId,
      sku: d.sku,
      product_name: d.productName,
      quantity: d.quantity,
      unit_price: d.unitPrice,
      line_amount: d.quantity * d.unitPrice,
    }));
  }
}


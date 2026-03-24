import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppException } from '../../../common/errors/app.exception';
import { ProductRepository } from '../../master/repositories/product.repository';
import { PaymentCreatedEvent } from '../../payment/events/payment-created.event';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderDetailDto } from '../dto/create-order-detail.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
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

  async createOrder(dto: CreateOrderDto) {
    const existing = await this.orderRepo.findByOrderId(dto.order_id);
    if (existing) throw new AppException('ORDER_ALREADY_EXISTS');

    const order = this.orderRepo.create({
      orderId: dto.order_id,
      deliveryCodeType: 'DELIVERY_STATUS',
      deliveryStatus: DeliveryStatus.WAITING,
      address: dto.address ?? '',
      totalQuantity: 0,
      totalAmount: 0,
      ordererUserId: dto.orderer_user_id ?? null,
      ordererName: dto.orderer_name ?? null,
      ordererPhone: dto.orderer_phone ?? null,
      ordererEmail: dto.orderer_email ?? null,
    });
    const saved = await this.orderRepo.save(order);

    if (dto.items?.length) {
      let nextSeq = 1;
      for (const item of dto.items) {
        const product = await this.productRepo.findByClientCompanyIdAndSku(
          item.client_company_id,
          item.sku,
        );
        if (!product) throw new AppException('PRODUCT_NOT_FOUND');

        const detail = this.orderDetailRepo.create({
          orderId: saved.orderId,
          lineSeq: nextSeq++,
          clientCompanyId: product.clientCompanyId,
          sku: product.sku,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
        });
        await this.orderDetailRepo.save(detail);
      }
      const agg = await this.orderDetailRepo.getOrderTotals(saved.orderId);
      await this.orderRepo.update(saved.orderId, {
        totalQuantity: agg.totalQuantity,
        totalAmount: agg.totalAmount,
      });
    }

    return this.getOrderWithDetails(saved.orderId);
  }

  async updateOrder(orderId: string, dto: UpdateOrderDto) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');

    const partial: Partial<Order> = {};
    if (dto.address !== undefined) partial.address = dto.address;
    if (dto.orderer_name !== undefined) partial.ordererName = dto.orderer_name;
    if (dto.orderer_phone !== undefined) partial.ordererPhone = dto.orderer_phone;
    if (dto.orderer_email !== undefined) partial.ordererEmail = dto.orderer_email;
    if (dto.delivery_status !== undefined) partial.deliveryStatus = dto.delivery_status;

    if (Object.keys(partial).length > 0) {
      await this.orderRepo.update(orderId, partial);
    }

    return this.getOrderWithDetails(orderId);
  }

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
      ordererUserId: null,
      ordererName: null,
      ordererPhone: null,
      ordererEmail: null,
    });
    return this.orderRepo.save(order);
  }

  async listOrders(params?: { orderer_user_id?: string }) {
    const rows = params?.orderer_user_id
      ? await this.orderRepo.findByOrdererUserId(params.orderer_user_id)
      : await this.orderRepo.findAll();
    return Promise.all(rows.map((o) => this.getOrderWithDetails(o.orderId)));
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
    let order = await this.orderRepo.findByOrderId(orderId);
    if (!order) {
      // 주문이 없으면 자동 생성 (클라이언트 생성 order_id 플로우 지원)
      const newOrder = this.orderRepo.create({
        orderId,
        deliveryCodeType: 'DELIVERY_STATUS',
        deliveryStatus: DeliveryStatus.WAITING,
        address: '',
        totalQuantity: 0,
        totalAmount: 0,
        ordererUserId: null,
        ordererName: null,
        ordererPhone: null,
        ordererEmail: null,
      });
      order = await this.orderRepo.save(newOrder);
    }

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


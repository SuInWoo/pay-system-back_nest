import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppException } from '../../../common/errors/app.exception';
import { Product } from '../../master/entities/product.entity';
import { PaymentCreatedEvent } from '../../payment/events/payment-created.event';
import { OrderDetail } from '../entities/order-detail.entity';
import { DeliveryStatus, Order } from '../entities/order.entity';
import { CreateOrderDetailDto } from '../dto/create-order-detail.dto';

@Injectable()
export class OmsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderDetail)
    private readonly orderDetailRepo: Repository<OrderDetail>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  @OnEvent('payment.created')
  async onPaymentCreated(event: PaymentCreatedEvent) {
    const existing = await this.orderRepo.findOne({
      where: { orderId: event.orderId },
    });
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
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    const details = await this.orderDetailRepo.find({
      where: { orderId },
      order: { lineSeq: 'ASC' },
    });
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
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new AppException('ORDER_NOT_FOUND');

    const maxSeq = await this.orderDetailRepo
      .createQueryBuilder('d')
      .select('COALESCE(MAX(d.line_seq), 0)', 'max')
      .where('d.order_id = :orderId', { orderId })
      .getRawOne<{ max: string }>();
    let nextSeq = parseInt(maxSeq?.max ?? '0', 10) + 1;

    const saved: OrderDetail[] = [];
    for (const item of dto.items) {
      const product = await this.productRepo.findOne({
        where: { clientCompanyId: item.client_company_id, sku: item.sku },
      });
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

    const agg = await this.orderDetailRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.quantity), 0)', 'totalQuantity')
      .addSelect('COALESCE(SUM(d.quantity * d.unit_price), 0)', 'totalAmount')
      .where('d.order_id = :orderId', { orderId })
      .getRawOne<{ totalQuantity: string; totalAmount: string }>();
    await this.orderRepo.update(
      { orderId },
      {
        totalQuantity: parseInt(agg?.totalQuantity ?? '0', 10),
        totalAmount: parseInt(agg?.totalAmount ?? '0', 10),
      },
    );

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


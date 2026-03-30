import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { AppException } from '../../../common/errors/app.exception';
import { ProductRepository } from '../../master/repositories/product.repository';
import { ROLE_CODE } from '../../users/entities/role.entity';
import { PaymentCreatedEvent } from '../../payment/events/payment-created.event';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderDetailDto, OrderDetailLineDto } from '../dto/create-order-detail.dto';
import { CreateShipmentDto } from '../dto/create-shipment.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderDetail } from '../entities/order-detail.entity';
import { DeliveryStatus, Order } from '../entities/order.entity';
import { ShipmentStatus } from '../entities/shipment.entity';
import { OrderStatusHistoryRepository } from '../repositories/order-status-history.repository';
import { OutboxEventRepository } from '../repositories/outbox-event.repository';
import { OrderDetailRepository } from '../repositories/order-detail.repository';
import { OrderRepository } from '../repositories/order.repository';
import { ShipmentItemRepository } from '../repositories/shipment-item.repository';
import { ShipmentRepository } from '../repositories/shipment.repository';

@Injectable()
export class OmsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepo: OrderRepository,
    private readonly orderDetailRepo: OrderDetailRepository,
    private readonly orderStatusHistoryRepo: OrderStatusHistoryRepository,
    private readonly outboxEventRepo: OutboxEventRepository,
    private readonly productRepo: ProductRepository,
    private readonly shipmentRepo: ShipmentRepository,
    private readonly shipmentItemRepo: ShipmentItemRepository,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const orderGroupId = await this.generateOrderGroupId();

    // 회사별로 라인을 분리해 주문을 생성하여 고객사 단위 조회/정산 기준을 일치시킵니다.
    const groupedItems = await this.groupItemsByCompany(dto.items);
    const companyIds = Array.from(groupedItems.keys());
    const createdOrderIds: string[] = [];
    for (let i = 0; i < companyIds.length; i += 1) {
      const companyId = companyIds[i];
      const orderId = this.buildSplitOrderId(orderGroupId, i, companyIds.length);
      const saved = await this.createSingleOrder(orderId, dto, groupedItems.get(companyId) ?? []);
      createdOrderIds.push(saved.orderId);
    }

    const orders = await Promise.all(createdOrderIds.map((orderId) => this.getOrderWithDetails(orderId)));
    const total_amount = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const total_quantity = orders.reduce((sum, order) => sum + order.total_quantity, 0);
    return {
      order_group_id: orderGroupId,
      total_amount,
      total_quantity,
      orders,
    };
  }

  private async createSingleOrder(
    orderId: string,
    dto: Pick<
      CreateOrderDto,
      'address' | 'orderer_user_id' | 'orderer_name' | 'orderer_phone' | 'orderer_email'
    >,
    items: Array<{
      clientCompanyId: string;
      sku: string;
      productName: string;
      quantity: number;
      unitPrice: number;
    }>,
  ): Promise<Order> {
    const existing = await this.orderRepo.findByOrderId(orderId);
    if (existing) throw new AppException('ORDER_ALREADY_EXISTS');

    const order = this.orderRepo.create({
      orderId,
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
    await this.appendOrderHistory({
      orderId: saved.orderId,
      fromStatus: null,
      toStatus: 'CREATED',
      reason: 'order created',
    });
    await this.enqueueOutboxEvent({
      aggregateId: saved.orderId,
      eventType: 'OrderCreated',
      dedupeKey: `order-created:${saved.orderId}`,
      payload: {
        orderId: saved.orderId,
        occurredAt: new Date().toISOString(),
      },
    });

    if (items.length === 0) return saved;

    let nextSeq = 1;
    for (const item of items) {
      const detail = this.orderDetailRepo.create({
        orderId: saved.orderId,
        lineSeq: nextSeq++,
        clientCompanyId: item.clientCompanyId,
        sku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      await this.orderDetailRepo.save(detail);
    }
    const agg = await this.orderDetailRepo.getOrderTotals(saved.orderId);
    await this.orderRepo.update(saved.orderId, {
      totalQuantity: agg.totalQuantity,
      totalAmount: agg.totalAmount,
    });
    return saved;
  }

  private async groupItemsByCompany(items: OrderDetailLineDto[]) {
    const grouped = new Map<
      string,
      Array<{
        clientCompanyId: string;
        sku: string;
        productName: string;
        quantity: number;
        unitPrice: number;
      }>
    >();
    for (const item of items) {
      const product = await this.productRepo.findByClientCompanyIdAndSku(item.client_company_id, item.sku);
      if (!product) throw new AppException('PRODUCT_NOT_FOUND');
      const bucket = grouped.get(product.clientCompanyId) ?? [];
      bucket.push({
        clientCompanyId: product.clientCompanyId,
        sku: product.sku,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: product.price,
      });
      grouped.set(product.clientCompanyId, bucket);
    }
    return grouped;
  }

  private buildSplitOrderId(baseOrderId: string, idx: number, totalGroups: number): string {
    if (totalGroups <= 1) return baseOrderId;
    const suffix = String(idx + 1).padStart(2, '0');
    const splitId = `${baseOrderId}-${suffix}`;
    if (splitId.length > 64) {
      throw new AppException('INVALID_QUERY', { detail: 'order_id is too long for split mode' });
    }
    return splitId;
  }

  private async generateOrderGroupId(): Promise<string> {
    const rows = await this.dataSource.query("SELECT nextval('order_seq') AS seq");
    const seq = Number(rows?.[0]?.seq ?? 0);
    if (!Number.isFinite(seq) || seq <= 0) {
      throw new AppException('INTERNAL_ERROR');
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const n = String(seq).padStart(6, '0');
    return `ORD-${y}${m}${d}-${n}`;
  }

  async updateOrder(orderId: string, dto: UpdateOrderDto) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    const beforeDeliveryStatus = order.deliveryStatus;

    const partial: Partial<Order> = {};
    if (dto.address !== undefined) partial.address = dto.address;
    if (dto.orderer_name !== undefined) partial.ordererName = dto.orderer_name;
    if (dto.orderer_phone !== undefined) partial.ordererPhone = dto.orderer_phone;
    if (dto.orderer_email !== undefined) partial.ordererEmail = dto.orderer_email;
    if (dto.delivery_status !== undefined) partial.deliveryStatus = dto.delivery_status;

    if (Object.keys(partial).length > 0) {
      await this.orderRepo.update(orderId, partial);
    }
    if (dto.delivery_status !== undefined && dto.delivery_status !== beforeDeliveryStatus) {
      await this.appendOrderHistory({
        orderId,
        fromStatus: beforeDeliveryStatus,
        toStatus: dto.delivery_status,
        reason: 'delivery status updated',
      });
      await this.enqueueOutboxEvent({
        aggregateId: orderId,
        eventType: 'OrderDeliveryStatusChanged',
        dedupeKey: `order-delivery:${orderId}:${dto.delivery_status}`,
        payload: {
          orderId,
          fromStatus: beforeDeliveryStatus,
          toStatus: dto.delivery_status,
          occurredAt: new Date().toISOString(),
        },
      });
    }

    return this.getOrderWithDetails(orderId);
  }

  @OnEvent('payment.created')
  async onPaymentCreated(event: PaymentCreatedEvent) {
    const existing = await this.orderRepo.findByOrderId(event.orderId);
    if (existing) {
      await this.appendOrderHistory({
        orderId: event.orderId,
        fromStatus: 'PAYMENT_PENDING',
        toStatus: 'PAYMENT_CONFIRMED',
        reason: `paymentId=${event.paymentId}`,
      });
      await this.enqueueOutboxEvent({
        aggregateId: event.orderId,
        eventType: 'PaymentConfirmed',
        dedupeKey: `payment-confirmed:${event.paymentId}`,
        payload: {
          orderId: event.orderId,
          paymentId: event.paymentId,
          amount: event.amount,
          occurredAt: event.occurredAt,
        },
      });
      return existing;
    }

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
    const saved = await this.orderRepo.save(order);
    await this.appendOrderHistory({
      orderId: saved.orderId,
      fromStatus: null,
      toStatus: 'CREATED_BY_PAYMENT_EVENT',
      reason: `paymentId=${event.paymentId}`,
    });
    await this.enqueueOutboxEvent({
      aggregateId: saved.orderId,
      eventType: 'OrderCreatedByPaymentEvent',
      dedupeKey: `order-created-payment:${event.paymentId}`,
      payload: {
        orderId: saved.orderId,
        paymentId: event.paymentId,
        amount: event.amount,
        occurredAt: event.occurredAt,
      },
    });
    return saved;
  }

  async listOrdersForScope(params: {
    userId: string;
    role: string;
    clientCompanyId?: string;
    page?: number;
    limit?: number;
    scope?: 'my' | 'company' | 'all';
    orderId?: string;
    keyword?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const scope = params.scope ?? 'my';
    const role = params.role;
    const keyword = params.keyword?.trim();

    this.assertScopePermission(scope, role);

    const hasKeyword = !!keyword;
    const [rows, total] = hasKeyword
      ? await this.searchWithKeyword({
          scope,
          userId: params.userId,
          clientCompanyId: params.clientCompanyId,
          orderId: params.orderId,
          keyword: keyword!,
          skip,
          take: limit,
        })
      : await this.findByScope({
          scope,
          userId: params.userId,
          clientCompanyId: params.clientCompanyId,
          orderId: params.orderId,
          skip,
          take: limit,
        });

    const summaries = await this.toOrderSummaries(rows);
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    return {
      items: summaries,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasPrev: page > 1 && totalPages > 0,
        hasNext: totalPages > 0 && page < totalPages,
      },
    };
  }

  private async findByScope(params: {
    scope: 'my' | 'company' | 'all';
    userId: string;
    clientCompanyId?: string;
    orderId?: string;
    skip: number;
    take: number;
  }): Promise<[Order[], number]> {
    if (params.scope === 'my') {
      return this.orderRepo.findPageByOrdererUserIdWithFilter({
        ordererUserId: params.userId,
        orderId: params.orderId,
        skip: params.skip,
        take: params.take,
      });
    }
    if (params.scope === 'company') {
      if (!params.clientCompanyId) {
        throw new AppException('FORBIDDEN_SCOPE');
      }
      return this.orderRepo.findPageByClientCompanyId({
        clientCompanyId: params.clientCompanyId,
        orderId: params.orderId,
        skip: params.skip,
        take: params.take,
      });
    }
    return this.orderRepo.findPageAll({
      orderId: params.orderId,
      skip: params.skip,
      take: params.take,
    });
  }

  private async searchWithKeyword(params: {
    scope: 'my' | 'company' | 'all';
    userId: string;
    clientCompanyId?: string;
    orderId?: string;
    keyword: string;
    skip: number;
    take: number;
  }): Promise<[Order[], number]> {
    let scopedRows: Order[] = [];
    if (params.scope === 'my') {
      scopedRows = await this.orderRepo.findByOrdererUserIdWithFilter({
        ordererUserId: params.userId,
        orderId: params.orderId,
      });
    } else if (params.scope === 'company') {
      if (!params.clientCompanyId) {
        throw new AppException('FORBIDDEN_SCOPE');
      }
      scopedRows = await this.orderRepo.findByClientCompanyIdWithFilter({
        clientCompanyId: params.clientCompanyId,
        orderId: params.orderId,
      });
    } else {
      scopedRows = await this.orderRepo.findAllWithFilter({ orderId: params.orderId });
    }

    const lowered = params.keyword.toLowerCase();
    const filtered = scopedRows.filter((o) =>
      [o.orderId, o.ordererName ?? '', o.ordererEmail ?? '']
        .some((v) => v.toLowerCase().includes(lowered)),
    );
    return [filtered.slice(params.skip, params.skip + params.take), filtered.length];
  }

  private assertScopePermission(scope: 'my' | 'company' | 'all', role: string): void {
    const isAdmin = role === 'ADMIN' || role === ROLE_CODE.DEVELOPER;
    if (isAdmin) return;
    if (role === ROLE_CODE.CUSTOMER && scope !== 'my') {
      throw new AppException('FORBIDDEN_SCOPE');
    }
    if (role === ROLE_CODE.CLIENT_ADMIN && scope !== 'company') {
      throw new AppException('FORBIDDEN_SCOPE');
    }
    if (role !== ROLE_CODE.CUSTOMER && role !== ROLE_CODE.CLIENT_ADMIN) {
      throw new AppException('FORBIDDEN_SCOPE');
    }
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

  async getOrderStatusHistory(orderId: string) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    const rows = await this.orderStatusHistoryRepo.findByOrderId(orderId);
    return rows.map((row) => ({
      id: row.id,
      order_id: row.orderId,
      from_status: row.fromStatus ?? undefined,
      to_status: row.toStatus,
      changed_by_type: row.changedByType,
      changed_by_id: row.changedById ?? undefined,
      reason: row.reason ?? undefined,
      changed_at: row.changedAt,
    }));
  }

  async addOrderDetails(orderId: string, dto: CreateOrderDetailDto, requesterUserId?: string) {
    let order = await this.orderRepo.findByOrderId(orderId);
    if (!order) {
      // 주문이 없으면 자동 생성 (클라이언트 생성 order_id 플로우 지원)
      const newOrder = this.orderRepo.create({
        orderId,
        deliveryCodeType: 'DELIVERY_STATUS',
        deliveryStatus: DeliveryStatus.WAITING,
        address: dto.address ?? '',
        totalQuantity: 0,
        totalAmount: 0,
        ordererUserId: dto.orderer_user_id ?? requesterUserId ?? null,
        ordererName: dto.orderer_name ?? null,
        ordererPhone: dto.orderer_phone ?? null,
        ordererEmail: dto.orderer_email ?? null,
      });
      order = await this.orderRepo.save(newOrder);
      await this.appendOrderHistory({
        orderId,
        fromStatus: null,
        toStatus: 'CREATED',
        reason: 'auto created by addOrderDetails',
      });
      await this.enqueueOutboxEvent({
        aggregateId: orderId,
        eventType: 'OrderCreated',
        dedupeKey: `order-created:${orderId}`,
        payload: {
          orderId,
          occurredAt: new Date().toISOString(),
        },
      });
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
    const partialForOrder: Partial<Order> = {
      totalQuantity: agg.totalQuantity,
      totalAmount: agg.totalAmount,
    };
    if (dto.orderer_name !== undefined) partialForOrder.ordererName = dto.orderer_name;
    if (dto.orderer_phone !== undefined) partialForOrder.ordererPhone = dto.orderer_phone;
    if (dto.orderer_email !== undefined) partialForOrder.ordererEmail = dto.orderer_email;
    if (dto.orderer_user_id !== undefined) {
      partialForOrder.ordererUserId = dto.orderer_user_id;
    } else if (!order.ordererUserId && requesterUserId) {
      partialForOrder.ordererUserId = requesterUserId;
    }
    if (dto.address !== undefined) partialForOrder.address = dto.address;
    await this.orderRepo.update(orderId, partialForOrder);

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

  async createShipment(orderId: string, dto: CreateShipmentDto) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');

    const orderDetails = await this.orderDetailRepo.findByOrderIdOrderByLineSeq(orderId);
    if (orderDetails.length === 0) throw new AppException('ORDER_NOT_FOUND');

    const bySku = new Map(orderDetails.map((d) => [d.sku, d]));
    for (const item of dto.items) {
      const base = bySku.get(item.sku);
      if (!base) {
        throw new AppException('OMS_SHIPMENT_INVALID_SKU');
      }
      const alreadyShipped = await this.shipmentItemRepo.sumShippedQuantityByOrderAndSku(orderId, item.sku);
      if (alreadyShipped + item.quantity > base.quantity) {
        throw new AppException('OMS_SHIPMENT_QUANTITY_EXCEEDED');
      }
    }

    const shipment = this.shipmentRepo.create({
      orderId,
      status: ShipmentStatus.READY,
      carrier: dto.carrier,
      trackingNo: dto.tracking_no,
      dispatchedAt: null,
    });
    const savedShipment = await this.shipmentRepo.save(shipment);

    let seq = 1;
    for (const item of dto.items) {
      const row = this.shipmentItemRepo.create({
        shipmentId: savedShipment.id,
        lineSeq: seq++,
        orderId,
        sku: item.sku,
        quantity: item.quantity,
      });
      await this.shipmentItemRepo.save(row);
    }

    await this.appendOrderHistory({
      orderId,
      fromStatus: 'PAYMENT_CONFIRMED',
      toStatus: 'READY_TO_SHIP',
      reason: `shipmentId=${savedShipment.id}`,
    });
    await this.enqueueOutboxEvent({
      aggregateId: orderId,
      eventType: 'ShipmentCreated',
      dedupeKey: `shipment-created:${savedShipment.id}`,
      payload: {
        orderId,
        shipmentId: savedShipment.id,
        carrier: dto.carrier,
        trackingNo: dto.tracking_no,
        occurredAt: new Date().toISOString(),
      },
    });

    return {
      id: savedShipment.id,
      order_id: savedShipment.orderId,
      status: savedShipment.status,
      carrier: savedShipment.carrier,
      tracking_no: savedShipment.trackingNo,
    };
  }

  async dispatchShipment(orderId: string, shipmentId: string) {
    const order = await this.orderRepo.findByOrderId(orderId);
    if (!order) throw new AppException('ORDER_NOT_FOUND');
    const shipment = await this.shipmentRepo.findById(shipmentId);
    if (!shipment || shipment.orderId !== orderId) throw new AppException('OMS_SHIPMENT_NOT_FOUND');
    if (shipment.status === ShipmentStatus.DISPATCHED) {
      return {
        id: shipment.id,
        order_id: shipment.orderId,
        status: shipment.status,
        dispatched_at: shipment.dispatchedAt,
      };
    }

    shipment.status = ShipmentStatus.DISPATCHED;
    shipment.dispatchedAt = new Date();
    await this.shipmentRepo.save(shipment);
    await this.orderRepo.update(orderId, { deliveryStatus: DeliveryStatus.SHIPPING });

    await this.appendOrderHistory({
      orderId,
      fromStatus: 'READY_TO_SHIP',
      toStatus: 'SHIPPED',
      reason: `shipmentId=${shipment.id}`,
    });
    await this.enqueueOutboxEvent({
      aggregateId: orderId,
      eventType: 'ShipmentDispatched',
      dedupeKey: `shipment-dispatched:${shipment.id}`,
      payload: {
        orderId,
        shipmentId: shipment.id,
        trackingNo: shipment.trackingNo,
        carrier: shipment.carrier,
        occurredAt: shipment.dispatchedAt.toISOString(),
      },
    });

    return {
      id: shipment.id,
      order_id: shipment.orderId,
      status: shipment.status,
      dispatched_at: shipment.dispatchedAt,
    };
  }

  private async appendOrderHistory(params: {
    orderId: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string;
    changedByType?: string;
    changedById?: string | null;
  }) {
    const history = this.orderStatusHistoryRepo.create({
      orderId: params.orderId,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      reason: params.reason,
      changedByType: params.changedByType ?? 'SYSTEM',
      changedById: params.changedById ?? null,
    });
    await this.orderStatusHistoryRepo.save(history);
  }

  private async enqueueOutboxEvent(params: {
    aggregateId: string;
    eventType: string;
    dedupeKey: string;
    payload: Record<string, unknown>;
  }) {
    // 비즈니스 이벤트는 재처리 시 중복 생성될 수 있어 dedupe_key 유니크 제약 위반은 무해하게 처리합니다.
    const event = this.outboxEventRepo.create({
      aggregateType: 'ORDER',
      aggregateId: params.aggregateId,
      eventType: params.eventType,
      dedupeKey: params.dedupeKey,
      payload: params.payload,
    });
    try {
      await this.outboxEventRepo.save(event);
    } catch (e: any) {
      if (e?.code !== '23505') throw e;
    }
  }

  private async toOrderSummaries(rows: Order[]) {
    if (rows.length === 0) return [];
    const orderIds = rows.map((r) => r.orderId);
    const paymentRows = await this.dataSource
      .createQueryBuilder()
      .select('p.order_id', 'orderId')
      .addSelect('p.status', 'status')
      .from('payments', 'p')
      .where('p.order_id IN (:...orderIds)', { orderIds })
      .getRawMany<{ orderId: string; status: string }>();
    const paidSet = new Set(
      paymentRows.filter((p) => p.status === 'SUCCEEDED').map((p) => p.orderId),
    );

    const firstCompanyRows = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT ON (od.order_id) od.order_id', 'orderId')
      .addSelect('od.client_company_id', 'clientCompanyId')
      .from('order_detail', 'od')
      .where('od.order_id IN (:...orderIds)', { orderIds })
      .orderBy('od.order_id', 'ASC')
      .addOrderBy('od.line_seq', 'ASC')
      .getRawMany<{ orderId: string; clientCompanyId: string }>();
    const companyMap = new Map(firstCompanyRows.map((r) => [r.orderId, r.clientCompanyId]));

    return rows.map((o) => ({
      order_id: o.orderId,
      status: paidSet.has(o.orderId) ? 'PAID' : 'PENDING',
      amount: o.totalAmount,
      created_at: o.createdAt,
      client_company_id: companyMap.get(o.orderId),
      orderer_name: o.ordererName ?? undefined,
      orderer_email: o.ordererEmail ?? undefined,
    }));
  }
}


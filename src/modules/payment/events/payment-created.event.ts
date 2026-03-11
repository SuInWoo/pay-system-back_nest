export class PaymentCreatedEvent {
  readonly orderId: string;
  readonly paymentId: string;
  readonly amount: number;
  readonly occurredAt: string;

  constructor(params: {
    orderId: string;
    paymentId: string;
    amount: number;
    occurredAt: string;
  }) {
    this.orderId = params.orderId;
    this.paymentId = params.paymentId;
    this.amount = params.amount;
    this.occurredAt = params.occurredAt;
  }
}


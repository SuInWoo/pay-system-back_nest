import { PaymentStatus } from '../entities/payment.entity';

export type PaymentResult = {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  idempotency_key: string;
};


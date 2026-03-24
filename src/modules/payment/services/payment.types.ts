import { PaymentStatus } from '../entities/payment.entity';

export type PaymentResult = {
  id: string;
  order_id: string;
  amount: number;
  status: PaymentStatus;
  idempotency_key: string;
  payment_key?: string;
  provider_status?: string;
  method?: string;
  approved_at?: string;
};


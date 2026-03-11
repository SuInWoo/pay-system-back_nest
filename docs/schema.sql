-- Pay System Schema DDL (PostgreSQL)
-- SQL 담당자 설계: 단일 common_code( code_type + code ), 주문 총수량·총금액·주문자, 상품 복합 PK, 주문 상세, 채번.
-- 실행 전 DB 생성: CREATE DATABASE pay_system;

-- 1) users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  refresh_token_hash VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_users_email ON users (email);

-- 2) 공통코드 단일 테이블 (code_type으로 배송/결제/사용자상태 등 구분)
CREATE TABLE common_code (
  code_type VARCHAR(64) NOT NULL,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (code_type, code)
);
INSERT INTO common_code (code_type, code, name, sort_order) VALUES
  ('DELIVERY_STATUS', 'WAITING', '대기', 1),
  ('DELIVERY_STATUS', 'SHIPPING', '배송중', 2),
  ('DELIVERY_STATUS', 'DELIVERED', '배송완료', 3),
  ('PAYMENT_STATUS', 'PENDING', '대기', 1),
  ('PAYMENT_STATUS', 'SUCCEEDED', '성공', 2),
  ('PAYMENT_STATUS', 'FAILED', '실패', 3);

-- 3) client_companies (공통코드와 별도 — 엔티티 성격·생명주기 상 통합 안 함)
CREATE TABLE client_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) NOT NULL,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_client_companies_code ON client_companies (code);
CREATE UNIQUE INDEX uq_client_companies_name ON client_companies (name);

-- 4) products (복합 PK: 고객사별 + 상품코드)
CREATE TABLE products (
  client_company_id UUID NOT NULL REFERENCES client_companies (id),
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  price INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (client_company_id, sku)
);
CREATE INDEX ix_products_client_company_id ON products (client_company_id);

-- 5) 주문번호 채번용 시퀀스
CREATE SEQUENCE order_seq;

-- 6) orders (총 수량·총 금액·주문자, 배송상태 → common_code 복합 FK)
CREATE TABLE orders (
  order_id VARCHAR(64) PRIMARY KEY,
  delivery_code_type VARCHAR(64) NOT NULL DEFAULT 'DELIVERY_STATUS',
  delivery_status VARCHAR(32) NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  total_quantity INT NOT NULL DEFAULT 0,
  total_amount INT NOT NULL DEFAULT 0,
  orderer_user_id UUID REFERENCES users (id),
  orderer_name VARCHAR(120),
  orderer_phone VARCHAR(32),
  orderer_email VARCHAR(320),
  CONSTRAINT fk_orders_delivery_code FOREIGN KEY (delivery_code_type, delivery_status)
    REFERENCES common_code (code_type, code)
);
CREATE INDEX ix_orders_orderer_user_id ON orders (orderer_user_id);

-- 7) order_detail (주문 상세)
CREATE TABLE order_detail (
  order_id VARCHAR(64) NOT NULL REFERENCES orders (order_id) ON DELETE CASCADE,
  line_seq INT NOT NULL,
  client_company_id UUID NOT NULL,
  sku VARCHAR(64) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL,
  unit_price INT NOT NULL,
  PRIMARY KEY (order_id, line_seq)
);
CREATE INDEX ix_order_detail_order_id ON order_detail (order_id);

-- 8) payments (결제상태 → common_code 복합 FK)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount INT NOT NULL,
  payment_code_type VARCHAR(64) NOT NULL DEFAULT 'PAYMENT_STATUS',
  status VARCHAR(32) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  CONSTRAINT fk_payments_status_code FOREIGN KEY (payment_code_type, status)
    REFERENCES common_code (code_type, code)
);
CREATE UNIQUE INDEX uq_payments_idempotency_key ON payments (idempotency_key);
CREATE INDEX ix_payments_order_id ON payments (order_id);

-- 채번 예시: 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_seq')::text, 6, '0')

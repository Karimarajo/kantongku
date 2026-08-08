// Minimal type declarations for "midtrans-client" (no official @types package).
declare module "midtrans-client" {
  interface ClientConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    email?: string;
  }

  interface CreateTransactionParams {
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    [key: string]: unknown;
  }

  interface TransactionResult {
    token: string;
    redirect_url: string;
  }

  export class Snap {
    constructor(config: ClientConfig);
    createTransaction(params: CreateTransactionParams): Promise<TransactionResult>;
  }

  const _default: { Snap: typeof Snap };
  export default _default;
}

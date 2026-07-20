export function validateCreditPayment({
  order,
  session,
}: {
  order: {
    amount: number;
    currency: string;
    paymentProductId: string | null;
  };
  session: {
    productId?: string;
    paymentInfo?: { paymentAmount: number; paymentCurrency: string };
  };
}) {
  const actualAmount = session.paymentInfo?.paymentAmount;
  const actualCurrency = session.paymentInfo?.paymentCurrency?.toLowerCase();
  const expectedCurrency = order.currency.toLowerCase();
  if (actualAmount !== order.amount) return 'PAYMENT_AMOUNT_MISMATCH';
  if (actualCurrency !== expectedCurrency) return 'PAYMENT_CURRENCY_MISMATCH';
  if (!order.paymentProductId || session.productId !== order.paymentProductId) {
    return 'PAYMENT_PRODUCT_MISMATCH';
  }
  return null;
}

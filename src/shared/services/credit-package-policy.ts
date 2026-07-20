export function authoritativeCheckoutValues(
  item: {
    code: string;
    credits: number;
    amountUsdCents: number;
  },
  _untrustedRequest?: Record<string, unknown>
) {
  return {
    productId: item.code,
    credits: item.credits,
    amount: item.amountUsdCents,
    currency: 'usd',
  };
}

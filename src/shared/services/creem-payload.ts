export function extractCreemProductId(value: unknown) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const product = value as Record<string, unknown>;
    const id = product.id ?? product.product_id ?? product.productId;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

import {
  PaymentInterval,
  PaymentOrder,
  PaymentPrice,
  PaymentType,
} from '@/extensions/payment/types';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import {
  getCreditPackageByCode,
  getPackageProductId,
} from '@/shared/models/credit_package';
import {
  createOrder,
  NewOrder,
  OrderStatus,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';
import { authoritativeCheckoutValues } from '@/shared/services/credit-package-policy';
import { getPaymentService } from '@/shared/services/payment';

export async function POST(req: Request) {
  try {
    const { product_id, locale, payment_provider } = await req.json();
    if (!product_id) return respErr('product_id is required');

    const selectedPackage = await getCreditPackageByCode(product_id);
    if (!selectedPackage || !selectedPackage.enabled) {
      return respErr('pricing item not found');
    }

    const user = await getUserInfo();
    if (!user?.email) return respErr('no auth, please sign in');

    const configs = await getAllConfigs();
    const paymentProviderName =
      payment_provider || configs.default_payment_provider;
    if (paymentProviderName !== 'creem') {
      return respErr('V1 Credit checkout only supports Creem');
    }

    const paymentProvider = (await getPaymentService()).getProvider(
      paymentProviderName
    );
    if (!paymentProvider?.name) {
      return respErr('no payment provider configured');
    }

    const paymentProductId = getPackageProductId(
      selectedPackage,
      configs.creem_environment
    )?.trim();
    if (!paymentProductId) {
      return respErr('Creem product ID is not configured for this package');
    }

    const authoritativeValues = authoritativeCheckoutValues(selectedPackage);
    const checkoutCurrency = authoritativeValues.currency;
    const checkoutAmount = authoritativeValues.amount;
    const checkoutPrice: PaymentPrice = {
      amount: checkoutAmount,
      currency: checkoutCurrency,
    };
    const orderNo = getSnowId();
    let callbackBaseUrl = `${configs.app_url}`;
    if (locale && locale !== configs.default_locale) {
      callbackBaseUrl += `/${locale}`;
    }
    const callbackUrl = `${callbackBaseUrl}/settings/payments`;
    const productName =
      locale === 'zh' ? selectedPackage.nameZh : selectedPackage.nameEn;
    const checkoutOrder: PaymentOrder = {
      description: productName,
      customer: { name: user.name, email: user.email },
      type: PaymentType.ONE_TIME,
      metadata: {
        app_name: configs.app_name,
        order_no: orderNo,
        user_id: user.id,
        credit_package_code: selectedPackage.code,
      },
      successUrl: `${configs.app_url}/api/payment/callback?order_no=${orderNo}`,
      cancelUrl: `${callbackBaseUrl}/chat/credits`,
      productId: paymentProductId,
      price: checkoutPrice,
    };
    const order: NewOrder = {
      id: getUuid(),
      orderNo,
      userId: user.id,
      userEmail: user.email,
      status: OrderStatus.PENDING,
      amount: checkoutAmount,
      currency: checkoutCurrency,
      productId: authoritativeValues.productId,
      paymentType: PaymentType.ONE_TIME,
      paymentInterval: PaymentInterval.ONE_TIME,
      paymentProvider: paymentProvider.name,
      checkoutInfo: JSON.stringify(checkoutOrder),
      productName,
      description: `${selectedPackage.credits} Credit`,
      callbackUrl,
      creditsAmount: authoritativeValues.credits,
      creditsValidDays: 0,
      planName: '',
      paymentProductId,
    };
    await createOrder(order);

    try {
      const result = await paymentProvider.createPayment({
        order: checkoutOrder,
      });
      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.CREATED,
        checkoutInfo: JSON.stringify(result.checkoutParams),
        checkoutResult: JSON.stringify(result.checkoutResult),
        checkoutUrl: result.checkoutInfo.checkoutUrl,
        paymentSessionId: result.checkoutInfo.sessionId,
        paymentProvider: result.provider,
      });
      return respData(result.checkoutInfo);
    } catch (error: any) {
      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.FAILED,
        checkoutInfo: JSON.stringify(checkoutOrder),
      });
      return respErr(`checkout failed: ${error.message}`);
    }
  } catch (error: any) {
    console.log('checkout failed:', error);
    return respErr(`checkout failed: ${error.message}`);
  }
}

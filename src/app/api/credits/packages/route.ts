import { respData, respErr } from '@/shared/lib/resp';
import {
  CreditPackage,
  getActiveCreditPackages,
  publicCreditPackage,
} from '@/shared/models/credit_package';

export async function GET(request: Request) {
  try {
    const locale = new URL(request.url).searchParams.get('locale') || 'en';
    const packages = await getActiveCreditPackages();
    return respData({
      packages: packages.map((item: CreditPackage) =>
        publicCreditPackage(item, locale)
      ),
    });
  } catch (error) {
    console.error('get credit packages failed', error);
    return respErr('get credit packages failed');
  }
}

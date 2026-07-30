import Image from 'next/image';

import { Link } from '@/core/i18n/navigation';
import { Brand as BrandType } from '@/shared/types/blocks/common';

export function BrandLogo({ brand }: { brand: BrandType }) {
  return (
    <Link
      href={brand.url || ''}
      target={brand.target || '_self'}
      className={`group flex items-center space-x-3 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none ${brand.className}`}
    >
      {brand.logo && (
        <Image
          src={brand.logo.src}
          alt={brand.title ? '' : brand.logo.alt || ''}
          width={brand.logo.width || 80}
          height={brand.logo.height || 80}
          className="h-9 w-auto rounded-xl shadow-sm transition duration-200 group-hover:-translate-y-0.5"
          unoptimized={brand.logo.src.startsWith('http')}
        />
      )}
      {brand.title && (
        <span className="text-lg font-semibold tracking-tight">
          {brand.title}
        </span>
      )}
    </Link>
  );
}

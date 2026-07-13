'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';

interface CertificateViewerProps {
  images: string[];
  locale: string;
  title: string;
}

export function CertificateViewer({
  images,
  locale,
  title,
}: CertificateViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const isChinese = locale === 'zh';
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentIndex];

  if (!currentImage) {
    return null;
  }

  const previousLabel = isChinese ? '上一张证书' : 'Previous certificate';
  const nextLabel = isChinese ? '下一张证书' : 'Next certificate';

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setCurrentIndex(0);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="h-auto px-0 text-sm" size="sm" variant="link">
          {isChinese
            ? `查看证书${hasMultipleImages ? `（${images.length}）` : ''}`
            : `View certificate${hasMultipleImages ? ` (${images.length})` : ''}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base">{title}</DialogTitle>
            <DialogDescription className="mt-1 text-sm">
              {isChinese ? '证明材料' : 'Supporting document'}
            </DialogDescription>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/35 px-4 py-5 sm:px-12 sm:py-7">
          <Image
            alt={`${title} ${isChinese ? '证书' : 'certificate'} ${currentIndex + 1}`}
            className="max-h-[calc(100dvh-14rem)] w-auto max-w-full object-contain"
            height={1600}
            priority={open}
            src={currentImage}
            width={1200}
          />

          {hasMultipleImages ? (
            <>
              <Button
                aria-label={previousLabel}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/90 shadow-sm sm:left-4"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => index - 1)}
                size="icon"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                aria-label={nextLabel}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/90 shadow-sm sm:right-4"
                disabled={currentIndex === images.length - 1}
                onClick={() => setCurrentIndex((index) => index + 1)}
                size="icon"
                variant="outline"
              >
                <ChevronRight className="size-4" />
              </Button>
            </>
          ) : null}
        </div>

        {hasMultipleImages ? (
          <div className="border-t px-5 py-3 text-center text-sm text-muted-foreground">
            {currentIndex + 1} / {images.length}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

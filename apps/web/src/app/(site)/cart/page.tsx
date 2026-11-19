import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/primitives';
import { Checkout } from './checkout';

export const metadata: Metadata = { title: 'السلة' };

export default function CartPage() {
  return (
    <>
      <PageHeader title="السلة" />
      <Checkout />
    </>
  );
}

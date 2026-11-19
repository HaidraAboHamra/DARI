import type { Product } from '@dari/contracts';
import { EmptyState, SectionHeader } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { ProductForm } from './product-form';
import { ProductRow } from './product-row';

export default async function ProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = await api<Product[]>(`/merchant/businesses/${id}/products`);
  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5">
        <SectionHeader title="إضافة منتج أو خدمة" />
        <ProductForm businessId={id} />
      </section>
      {products.length === 0 ? (
        <EmptyState title="الكتالوج فارغ" hint="أضف منتجاتك أو قائمة طعامك لتظهر على صفحتك ويمكن طلبها." />
      ) : (
        <ul className="card divide-y divide-sand/70">
          {products.map((p) => <ProductRow key={p.id} businessId={id} product={p} />)}
        </ul>
      )}
    </div>
  );
}

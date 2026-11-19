import { type AssistantAction, type SearchHit, type SearchResponse, VERTICAL_META } from '@dari/contracts';

/** Human label for any search hit. */
export function hitTitle(hit: SearchHit): string {
  switch (hit.kind) {
    case 'business':
      return hit.item.name;
    case 'product':
      return `${hit.item.name} (${hit.item.businessName})`;
    case 'job':
      return hit.item.title;
    case 'article':
      return hit.item.title;
    case 'event':
      return hit.item.title;
    case 'listing':
      return hit.item.title;
  }
}

export function hitHref(hit: SearchHit): string {
  switch (hit.kind) {
    case 'business':
      return `/b/${hit.item.slug}`;
    case 'product':
      return `/b/${hit.item.businessSlug}`;
    case 'job':
      return `/jobs/${hit.item.id}`;
    case 'article':
      return `/news/${hit.item.slug}`;
    case 'event':
      return `/events/${hit.item.id}`;
    case 'listing':
      return `/property/${hit.item.id}`;
  }
}

/** Next-step buttons derived from the understood need (blueprint §15.1: text → action). */
export function actionsFor(result: SearchResponse): AssistantAction[] {
  const actions: AssistantAction[] = result.hits.slice(0, 3).map((h) => ({ label: hitTitle(h), href: hitHref(h) }));
  const { intent, vertical } = result.intent;
  if (intent === 'service' || (intent === 'urgent' && vertical === 'services')) actions.push({ label: 'اطلب مقدم خدمة الآن', href: '/services/new' });
  if (intent === 'apply') actions.push({ label: 'كل الوظائف', href: '/jobs' });
  if (intent === 'property') actions.push({ label: 'تصفح العقارات', href: '/property' });
  if (intent === 'attend' || intent === 'travel') actions.push({ label: 'الفعاليات والرحلات', href: '/events' });
  if (intent === 'information') actions.push({ label: 'نبض المدينة', href: '/news' });
  if (!result.total) actions.push({ label: 'اطلب «اشترِ لي» عبر التوصيل', href: '/delivery' });
  return actions.slice(0, 5);
}

/** Deterministic reply used without an LLM, or whenever the LLM call fails. */
export function rulesReply(result: SearchResponse): string {
  const area = result.intent.vertical ? VERTICAL_META[result.intent.vertical].labelAr : null;
  if (!result.total) {
    return 'ما لقيت شي مطابق بسلمية حالياً 🙏 سجّلت طلبك، وكل طلب بدون نتيجة بيساعدنا نضيف الخدمة الناقصة. فيك تجرّب صياغة تانية أو تطلب «اشترِ لي» عبر التوصيل.';
  }
  const top = result.hits.slice(0, 3).map(hitTitle);
  const lead = result.intent.urgency ? 'هي أقرب الخيارات المتاحة هلق' : area ? `هي أفضل خيارات ${area} بسلمية` : 'هي أهم النتائج';
  return `${lead}: ${top.join('، ')}. اضغط على أي نتيجة للتفاصيل أو للطلب والحجز مباشرة.`;
}

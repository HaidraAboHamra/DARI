import type { Metadata } from 'next';
import { AssistantChat } from './chat';

export const metadata: Metadata = { title: 'مساعد المدينة الذكي' };

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <AssistantChat />
    </div>
  );
}

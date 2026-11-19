import { type Vertical, VERTICAL_META } from '@dari/contracts';

/** Inner glyphs drawn inside the shared arch frame (from the Dari app system). */
const GLYPHS: Record<Vertical, string> = {
  food: 'M9 11v4M12 11v4M15 11v4M9 15h6M12 15v4',
  shopping: 'M8.5 12h7l.6 6H7.9zM10 12v-1a2 2 0 0 1 4 0v1',
  services: 'M9.5 18.5l5-5M12.5 11.5l3 3',
  health: 'M12 11v8M8 15h8',
  appointments: 'M8 11h8v8H8zM8 14h8M10 10v2M14 10v2',
  jobs: 'M8 12h8v6H8zM10.5 12v-1.2h3V12M8 15h8',
  news: 'M8.5 11h7v8h-7zM10 13.5h4M10 16h4',
  events: 'M12 11l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8L8 13.9l2.8-.3z',
  property: 'M8 15l4-4 4 4v4H8zM11 19v-2.5h2V19',
  trips: 'M12 19s4-3.2 4-6.2a4 4 0 0 0-8 0C8 15.8 12 19 12 19z',
  stays: 'M7.5 19v-5.5h9V19M7.5 16h9M9.5 13.5v-1.5h2v1.5',
};

const ARCH = 'M4 22V10a8 8 0 0 1 16 0v12';

export function ServiceGlyph({ vertical, className = 'h-7 w-7', color }: { vertical: Vertical; className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={color ?? VERTICAL_META[vertical].color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ARCH} />
      <path d={GLYPHS[vertical]} />
    </svg>
  );
}

/** Tinted tile + arch icon, each service in its own color; gold is reserved for brand & primary actions. */
export function ServiceTile({ vertical, size = 'md' }: { vertical: Vertical; size?: 'sm' | 'md' | 'lg' }) {
  const meta = VERTICAL_META[vertical];
  const box = { sm: 'h-10 w-10 rounded-xl', md: 'h-14 w-14 rounded-2xl', lg: 'h-20 w-20 rounded-3xl' }[size];
  const glyph = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-11 w-11' }[size];
  return (
    <span className={`grid shrink-0 place-items-center ${box}`} style={{ backgroundColor: `${meta.color}1F` }}>
      <ServiceGlyph vertical={vertical} className={glyph} />
    </span>
  );
}

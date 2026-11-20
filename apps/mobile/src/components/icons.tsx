import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/theme';

type IconName = 'clock' | 'bike' | 'star' | 'search' | 'heart' | 'heartFill' | 'share' | 'back' | 'tag' | 'bag' | 'pin' | 'phone' | 'info' | 'close' | 'check' | 'fire';

const PATHS: Record<IconName, string> = {
  clock: 'M12 7v5l3 2',
  bike: 'M5 17a2 2 0 1 0 0.01 0M19 17a2 2 0 1 0 0.01 0M7 17h6l3-6h3M10 11h5M14 7h2l1 4',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16.5 16.5L21 21',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  heartFill: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v6h14v-6',
  back: 'M9 6l6 6-6 6',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  bag: 'M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0',
  pin: 'M12 21s6-5.3 6-11a6 6 0 0 0-12 0c0 5.7 6 11 6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  phone: 'M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z',
  info: 'M12 11v6M12 7.5h.01',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  fire: 'M12 21c4 0 7-2.7 7-6.7 0-4.3-4-6.3-4.5-10.3C11 6.5 9.5 9 9.5 11c-1-.5-2-2-2-3C6 9.5 5 11.6 5 14.3 5 18.3 8 21 12 21z',
};
const FILLED = new Set<IconName>(['star', 'heartFill', 'fire']);
const RING = new Set<IconName>(['clock', 'info']);

/** Line icons in the brand's stroke style (filled for star/heart/fire). */
export function Icon({ name, size = 18, color = colors.navy, strokeWidth = 1.8 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const filled = FILLED.has(name);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {RING.has(name) && <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} fill="none" />}
      <Path d={PATHS[name]} stroke={filled ? 'none' : color} fill={filled ? color : 'none'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

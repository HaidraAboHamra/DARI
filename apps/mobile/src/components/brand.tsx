import { type Vertical, VERTICAL_META } from '@dari/contracts';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { radius } from '@/theme';

/** "Arches embracing a person" — the Dari mark (same geometry as the web). */
export function LogoMark({ size = 40, solid }: { size?: number; solid?: string }) {
  const fill = solid ?? 'url(#gold)';
  return (
    <Svg width={size * 0.87} height={size} viewBox="150 20 340 390" accessibilityLabel="داري">
      <Defs>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#8A6A24" />
          <Stop offset=".25" stopColor="#F3DE9C" />
          <Stop offset=".5" stopColor="#B8913A" />
          <Stop offset=".75" stopColor="#F3DE9C" />
          <Stop offset="1" stopColor="#8A6A24" />
        </LinearGradient>
      </Defs>
      <Path d="M165.5 340L161 190A159 159 0 0 1 479 190L474.5 390L465.5 390L461 190A141 141 0 0 0 179 190L174.5 340Z" fill={fill} />
      <Path d="M211.5 340L207 190A113 113 0 0 1 433 190L428.5 390L419.5 390L415 190A95 95 0 0 0 225 190L220.5 340Z" fill={fill} />
      <Path d="M257.5 340L253 190A67 67 0 0 1 387 190L382.5 390L373.5 390L369 190A49 49 0 0 0 271 190L266.5 340Z" fill={fill} />
      <Circle cx="320" cy="266" r="26" fill={fill} />
    </Svg>
  );
}

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

export function ServiceGlyph({ vertical, size = 28, color }: { vertical: Vertical; size?: number; color?: string }) {
  const stroke = color ?? VERTICAL_META[vertical].color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 22V10a8 8 0 0 1 16 0v12" />
      <Path d={GLYPHS[vertical]} />
    </Svg>
  );
}

export function ServiceTile({ vertical, size = 56 }: { vertical: Vertical; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: radius.tile, backgroundColor: `${VERTICAL_META[vertical].color}1F`, alignItems: 'center', justifyContent: 'center' }}>
      <ServiceGlyph vertical={vertical} size={size * 0.56} />
    </View>
  );
}

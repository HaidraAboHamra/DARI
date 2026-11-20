import type { Vertical } from '@dari/contracts';
import { Image, type ImageStyle } from 'expo-image';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { ServiceGlyph } from '@/components/brand';

/** Cached photo with a soft fade-in; the brand glyph stands in when there is none yet. */
export function Photo({ uri, style, vertical = 'food', glyphSize = 40 }: { uri: string | null | undefined; style: StyleProp<ImageStyle & ViewStyle>; vertical?: Vertical; glyphSize?: number }) {
  if (uri) return <Image source={{ uri }} style={style} contentFit="cover" transition={220} cachePolicy="memory-disk" recyclingKey={uri} />;
  return (
    <View style={[{ backgroundColor: '#EBD59640', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, style as ViewStyle]}>
      <ServiceGlyph vertical={vertical} size={glyphSize} />
    </View>
  );
}

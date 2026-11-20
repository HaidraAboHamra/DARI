import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { T } from '@/components/ui';
import { colors, fonts } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Centre lines of the three arches (brand geometry, viewBox 150 20 340 390) and their lengths. */
const ARCHES = [
  { d: 'M170 340L170 190A150 150 0 0 1 470 190L470 390', length: 822 },
  { d: 'M216 340L216 190A104 104 0 0 1 424 190L424 390', length: 677 },
  { d: 'M262 340L262 190A58 58 0 0 1 378 190L378 390', length: 533 },
];
/** The exact filled mark, cross-faded in once the strokes are drawn. */
const FILLED = [
  'M165.5 340L161 190A159 159 0 0 1 479 190L474.5 390L465.5 390L461 190A141 141 0 0 0 179 190L174.5 340Z',
  'M211.5 340L207 190A113 113 0 0 1 433 190L428.5 390L419.5 390L415 190A95 95 0 0 0 225 190L220.5 340Z',
  'M257.5 340L253 190A67 67 0 0 1 387 190L382.5 390L373.5 390L369 190A49 49 0 0 0 271 190L266.5 340Z',
];
const SPARKS = [
  { x: 0.18, y: 0.22, delay: 0 },
  { x: 0.82, y: 0.3, delay: 600 },
  { x: 0.12, y: 0.68, delay: 1200 },
  { x: 0.86, y: 0.72, delay: 300 },
  { x: 0.7, y: 0.14, delay: 900 },
  { x: 0.3, y: 0.86, delay: 1500 },
];

const timing = (value: Animated.Value, toValue: number, duration: number, delay = 0, easing = Easing.out(Easing.cubic)) =>
  Animated.timing(value, { toValue, duration, delay, easing, useNativeDriver: false });

/**
 * Brand intro («البداية»): the three arches draw in, the person-dot drops into
 * their embrace with a glow, then «داري», the promise and DARI · CITY OS appear
 * under twinkling sparks — the brand board's motion, condensed to ~2.6 s.
 * Tap to skip; reduced-motion users see the final frame briefly.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const draw = useRef(ARCHES.map(() => new Animated.Value(1))).current;
  const filled = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const tag = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;
  const sparks = useRef(SPARKS.map(() => new Animated.Value(0))).current;
  const [finished, setFinished] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    Animated.timing(out, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setFinished(true);
      onDone();
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loops = sparks.map((s, i) =>
      Animated.loop(Animated.sequence([Animated.delay(SPARKS[i]!.delay), timing(s, 1, 900, 0, Easing.inOut(Easing.sin)), timing(s, 0, 900, 0, Easing.inOut(Easing.sin))])),
    );
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        draw.forEach((d) => d.setValue(0));
        [filled, dot, glow, word, tag].forEach((v) => v.setValue(1));
        setTimeout(finish, 700);
        return;
      }
      loops.forEach((l) => l.start());
      Animated.sequence([
        // 1 · arches draw in, outer → inner, overlapping
        Animated.parallel(draw.map((d, i) => timing(d, 0, 650, i * 220, Easing.inOut(Easing.cubic)))),
        // 2 · the dot (the person) drops in with a little overshoot, glow blooms; strokes settle into the exact mark
        Animated.parallel([
          Animated.spring(dot, { toValue: 1, friction: 5, tension: 90, useNativeDriver: false }),
          timing(glow, 1, 500),
          timing(filled, 1, 300),
        ]),
        // 3 · name, then promise
        Animated.stagger(180, [timing(word, 1, 420), timing(tag, 1, 420)]),
        Animated.delay(650),
      ]).start(({ finished: ok }) => ok && finish());
    });
    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
    // Runs once per launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (finished) return null;
  const markW = Math.min(150, width * 0.38);
  const markH = markW * (390 / 340);
  const rise = (v: Animated.Value) => ({ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: out, zIndex: 100 }]} accessibilityLabel="داري — سلمية بين إيديك">
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityHint="تخطي المقدمة">
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="bg" cx="50%" cy="40%" rx="75%" ry="60%">
              <Stop offset="0" stopColor="#1B2A47" />
              <Stop offset="0.65" stopColor={colors.navy} />
              <Stop offset="1" stopColor="#060B15" />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#bg)" />
        </Svg>

        {SPARKS.map((s, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: s.x * width,
              top: s.y * height,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: '#F3DE9C',
              opacity: sparks[i]!.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] }),
              transform: [{ scale: sparks[i]!.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
            }}
          />
        ))}

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Svg width={markW} height={markH} viewBox="150 20 340 390" style={{ overflow: 'visible' }}>
            <Defs>
              <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#8A6A24" />
                <Stop offset="0.25" stopColor="#F3DE9C" />
                <Stop offset="0.5" stopColor="#B8913A" />
                <Stop offset="0.75" stopColor="#F3DE9C" />
                <Stop offset="1" stopColor="#8A6A24" />
              </LinearGradient>
              <RadialGradient id="glow">
                <Stop offset="0" stopColor="#FFE9A8" stopOpacity="0.9" />
                <Stop offset="1" stopColor="#FFE9A8" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {ARCHES.map((a, i) => (
              <AnimatedPath
                key={a.d}
                d={a.d}
                fill="none"
                stroke="url(#gold)"
                strokeWidth={17}
                strokeDasharray={[a.length, a.length]}
                strokeDashoffset={draw[i]!.interpolate({ inputRange: [0, 1], outputRange: [0, a.length] })}
                opacity={filled.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })}
              />
            ))}
            {FILLED.map((d) => (
              <AnimatedPath key={d} d={d} fill="url(#gold)" opacity={filled} />
            ))}
            <AnimatedCircle cx={320} cy={266} r={glow.interpolate({ inputRange: [0, 1], outputRange: [10, 70] })} fill="url(#glow)" opacity={glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] })} />
            <AnimatedCircle
              cx={320}
              cy={dot.interpolate({ inputRange: [0, 1], outputRange: [180, 266] })}
              r={dot.interpolate({ inputRange: [0, 1], outputRange: [8, 26] })}
              fill="url(#gold)"
              opacity={dot.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] })}
            />
          </Svg>

          <Animated.View style={rise(word)}>
            <Image source={require('../../assets/wordmark.png')} style={{ width: markW * 1.3, height: markW * 1.3 * (423 / 666) }} contentFit="contain" accessibilityLabel="داري" />
          </Animated.View>
          <Animated.View style={[{ alignItems: 'center', gap: 10 }, rise(tag)]}>
            <T style={{ fontSize: 19, color: colors.champagne, fontFamily: fonts.medium }}>سلمية بين إيديك</T>
            <View style={{ width: 7, height: 7, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }] }} />
            <T style={{ fontSize: 11, color: '#EBD596B3', letterSpacing: 4, fontFamily: fonts.medium }}>DARI · CITY OS</T>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { ReemKufi_700Bold, useFonts } from '@expo-google-fonts/reem-kufi';
import { QueryClientProvider } from '@tanstack/react-query';
import { router, SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Intro } from '@/components/intro';
import { introMode } from '@/lib/prefs';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { LocationProvider } from '@/lib/location';
import { queryClient } from '@/lib/query';
import { isServerConfigured } from '@/lib/server';
import { colors, fonts } from '@/theme';

// Arabic-first app: right-to-left layout everywhere (native also set in app.json).
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
}

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { ready } = useAuth();
  const [fontsLoaded] = useFonts({
    ReemKufi_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_700Bold,
  });
  const [introDone, setIntroDone] = useState(false);
  const [intro, setIntro] = useState<'full' | 'short' | null>(null);
  useEffect(() => {
    void introMode().then(setIntro);
  }, []);

  // The plain navy native splash hands over to the animated brand intro as soon as fonts are in.
  useEffect(() => {
    if (fontsLoaded && intro) void SplashScreen.hideAsync();
  }, [fontsLoaded, intro]);
  useEffect(() => {
    // First launch of a test build: ask which server to use before anything else.
    if (ready && introDone && !isServerConfigured()) setTimeout(() => router.push('/login'), 0);
  }, [ready, introDone]);
  if (!fontsLoaded || !intro) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      {ready && (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.ivory },
            headerTintColor: colors.navy,
            headerTitleStyle: { fontFamily: fonts.display, color: colors.navy },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.ivory },
            headerBackButtonDisplayMode: 'minimal',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'تسجيل الدخول', presentation: 'modal' }} />
          <Stack.Screen name="cart" options={{ title: 'السلة' }} />
          <Stack.Screen
            name="location"
            options={{ title: 'موقع التوصيل', presentation: 'modal' }}
          />
          <Stack.Screen name="assistant" options={{ title: 'مساعد المدينة' }} />
        </Stack>
      )}
      {!introDone && <Intro variant={intro} onDone={() => setIntroDone(true)} />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <LocationProvider>
              <StatusBar style="dark" />
              <Navigator />
            </LocationProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

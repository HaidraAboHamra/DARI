import { IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_700Bold } from '@expo-google-fonts/ibm-plex-sans-arabic';
import { ReemKufi_700Bold, useFonts } from '@expo-google-fonts/reem-kufi';
import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { queryClient } from '@/lib/query';
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
  const [fontsLoaded] = useFonts({ ReemKufi_700Bold, IBMPlexSansArabic_400Regular, IBMPlexSansArabic_500Medium, IBMPlexSansArabic_700Bold });

  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);
  if (!ready || !fontsLoaded) return null;

  return (
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
      <Stack.Screen name="assistant" options={{ title: 'مساعد المدينة' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <StatusBar style="dark" />
            <Navigator />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

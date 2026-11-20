export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  /** Public website, used for share links. */
  webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3000',
  city: process.env.EXPO_PUBLIC_CITY ?? 'salamiyah',
  /** Test builds only: lets testers enter the API server address on the login screen. */
  serverSwitch: process.env.EXPO_PUBLIC_SERVER_SWITCH === '1',
} as const;

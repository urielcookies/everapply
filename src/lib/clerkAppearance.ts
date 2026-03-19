import { dark } from '@clerk/themes'

export function getClerkAppearance(isDark: boolean) {
  return {
    baseTheme: isDark ? dark : undefined,
    variables: isDark
      ? {
          colorBackground: '#121a13',
          colorInputBackground: '#1a221b',
          colorText: '#e6ebe7',
          colorTextSecondary: '#6b8a6e',
          colorPrimary: '#4cb86c',
          colorDanger: '#c05232',
          borderRadius: '0.375rem',
          fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
        }
      : {
          colorBackground: '#f2f6f2',
          colorInputBackground: '#ffffff',
          colorText: '#111b14',
          colorTextSecondary: '#5a7a5e',
          colorPrimary: '#3a8752',
          colorDanger: '#c04525',
          borderRadius: '0.375rem',
          fontFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
        },
  }
}

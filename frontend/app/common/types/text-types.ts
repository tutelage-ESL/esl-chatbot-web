export type TextSize = '10' | '12' | '14' | '16' | '18' | '20' | '24' | '30' | '32' | '36' | '40' | '48'
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'
export type TextColor = 'white' | 'black' | 'neutral-600' | 'neutral-400' | 'primary-orange-500' | 'error' | 'success' | 'warning' | 'info'
export type FontFamily = 'poppins'

export const sizeClasses: Record<TextSize, string> = {
  '10': 'text-[10px]',
  '12': 'text-xs',
  '14': 'text-sm',
  '16': 'text-base',
  "18": 'lg:text-lg text-base',
  "20": 'lg:text-xl text-lg',
  '24': 'lg:text-2xl text-xl',
  '30': 'lg:text-3xl text-2xl',
  '32': 'lg:text-3.5xl text-2xl',
  '36': 'lg:text-4xl text-3.5xl',
  '40': 'lg:text-4.5xl text-3.5xl',
  '48': 'lg:text-5xl text-4.5xl',
}

export const weightClasses: Record<TextWeight, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

export const colorClasses: Record<TextColor, string> = {
  'white': 'text-white',
  'black': 'text-base-neutral-800 dark:text-white',
  'neutral-600': 'text-base-neutral-600 dark:text-base-neutral-100',
  'neutral-400': 'text-base-neutral-400 dark:text-base-neutral-300',
  'primary-orange-500': 'text-primary-orange-500',
  'error': 'text-app-error',
  'success': 'text-app-success',
  'warning': 'text-app-warning',
  'info': 'text-app-info',
}

export const fontFamilyClasses: Record<FontFamily, string> = {
  'poppins': 'font-poppins',
}

export type TextProps = {
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div'
  size?: TextSize
  weight?: TextWeight
  color?: TextColor
  fontFamily?: FontFamily
  classList?: string
  htmlContent?: string
  capitalize?: boolean;
  uppercase?: boolean;
  underline?: boolean;
  italic?: boolean;
}


export type ButtonHeight = 'auto' | '24' | '28' | '32' | '36' | '40' | '44' | '48'
export type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
export type ButtonRadius = 'none' | 'full' | '4' | '8' | '12' | '16'


export const buttonSizeClasses: Record<ButtonHeight, string> = {
  'auto': 'h-auto',
  '24': 'h-6 text-xs',
  '28': 'h-7 text-xs',
  '32': 'h-8 text-sm',
  '36': 'h-9 text-sm',
  "40": 'h-10 text-sm',
  '44': 'h-11 text-base',
  '48': 'h-12 text-xl',
}
export const buttonRadiusClasses: Record<ButtonRadius, string> = {
  'none': 'rounded-0',
  '4': 'rounded-sm',
  '8': 'rounded-lg',
  '12': 'rounded-xl',
  '16': 'rounded-2xl',
  'full': 'rounded-full',
}


// const disabledClasses = 'disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:from-neutral-500 disabled:to-neutral-500 disabled:border-neutral-100 dark:disabled:border-neutral-700 dark:disabled:from-neutral-700 dark:disabled:to-neutral-700 disabled:text-neutral-400 disabled:icon-neutral-400 disabled:cursor-not-allowed';
const disabledClasses = 'disabled:cursor-not-allowed! disabled:text-white! disabled:opacity-60 disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:border-neutral-200 dark:disabled:border-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500 disabled:icon-neutral-400 dark:disabled:icon-neutral-500';

export const variantClasses: Record<Variant, string> = {
  'primary': `${disabledClasses} bg-linear-to-tr border border-transparent from-primary-500 active:bg-clip-padding active:outline active:outline-primary-500 to-ternary-300 hover:from-primary-600 hover:to-ternary-400 justify-center px-4 text-neutral-50 icon-neutral-50`,
  'secondary': `${disabledClasses} bg-secondary-100 border border-secondary-200 text-black icon-secondary-900 justify-center px-4 hover:bg-secondary-200 hover:border-secondary-300 active:bg-secondary-300 active:border-secondary-400 active:outline active:outline-secondary-300`,
  'outline': `${disabledClasses} bg-transparent border border-secondary-300 text-secondary-800 icon-secondary-800 justify-center px-4 hover:bg-secondary-50 dark:border-secondary-600 dark:text-secondary-100 dark:icon-secondary-100 dark:hover:bg-secondary-800 active:bg-secondary-100 dark:active:bg-secondary-700 active:border-secondary-400 dark:active:border-secondary-500 active:text-secondary-900 dark:active:text-secondary-50 active:icon-secondary-900 dark:active:icon-secondary-50`,
  'ghost': `${disabledClasses} bg-transparent border border-transparent text-secondary-800 icon-secondary-800 justify-center px-4 hover:bg-secondary-50 dark:text-secondary-100 dark:icon-secondary-100 dark:hover:bg-secondary-800 active:bg-secondary-100 dark:active:bg-secondary-700 active:text-secondary-900 dark:active:text-secondary-50 active:icon-secondary-900 dark:active:icon-secondary-50`,
  'danger': `${disabledClasses} bg-destructive border border-destructive text-white icon-destructive-foreground justify-center px-4 hover:bg-destructive/90 active:bg-destructive/80`,
}

export const activeClasses: Record<Variant, string> = {
  'primary': 'bg-clip-padding! outline! outline-primary-500!',
  'secondary': 'bg-secondary-300! border-secondary-400! text-secondary-900! icon-secondary-900!',
  'outline': 'bg-secondary-100! dark:bg-secondary-700 border-secondary-400! dark:border-secondary-500 text-secondary-900! dark:text-secondary-50! icon-secondary-900! dark:icon-secondary-50!',
  'ghost': 'bg-secondary-100! dark:bg-secondary-700 text-secondary-900! dark:text-secondary-50! icon-secondary-900! dark:icon-secondary-50!',
  'danger': 'bg-destructive/90! outline! outline-destructive!',

}




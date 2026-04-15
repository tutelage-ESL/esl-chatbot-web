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



const disabledClasses = 'disabled:bg-base-neutral-100 dark:disabled:bg-base-neutral-700 disabled:from-base-neutral-100 disabled:to-base-neutral-100 disabled:border-base-neutral-100 dark:disabled:border-base-neutral-700 dark:disabled:from-base-neutral-700 dark:disabled:to-base-neutral-700 disabled:text-base-neutral-400 disabled:icon-base-neutral-400 disabled:cursor-not-allowed';

export const variantClasses: Record<Variant, string> = {
  'primary': `bg-linear-to-tr border border-transparent from-primary-orange-500 active:bg-clip-padding active:outline active:outline-primary-orange-500  to-primary-red-700 hover:from-primary-orange-700 hover:to-app-red-800  justify-center px-4  text-white ${disabledClasses} `,
  'secondary': `border border-primary-orange-500  text-primary-orange-500  active:border-transparent active:bg-clip-padding active:outline active:outline-primary-orange-500   justify-center px-4 hover:text-white hover:bg-primary-orange-500 ${disabledClasses}`,
  'outline': `border dark:text-white border-neutral-default  text-base-neutral-600 hover:bg-surface-150! icon-neutral-600 dark:icon-white  justify-center px-4 ${disabledClasses} active:bg-white dark:bg-base-neutral-800 active:text-primary-orange-500 active:border-primary-orange-500 active:icon-primary-orange-500`,
  'ghost': 'bg-transparent  justify-center',
  'danger': 'bg-app-error text-white icon-white justify-center px-4',
}

export const activeClasses: Record<Variant, string> = {
  'primary': 'bg-clip-padding! outline! outline-primary-orange-500!',
  'secondary': 'border-transparent! bg-clip-padding! outline! outline-primary-orange-500!',
  'outline': 'bg-white dark:bg-base-neutral-800 text-primary-orange-500! border-primary-orange-500! icon-primary-orange-500!',
  'ghost': '',
  'danger': '',

}




export type ButtonHeight = 'auto' | '20' | '24' | '28' | '32' | '36' | '40' | '44' | '48' | '56' | '64'
export type Variant = 'primary' | 'secondary' |'outline' | 'input' | 'none'
export type ButtonRadius = 'none' | 'full' | '8'


export const buttonSizeClasses: Record<ButtonHeight, string> = {
  'auto': 'h-auto',
  '20': 'h-5',
  '24': 'h-6',
  '28': 'h-7',
  '32': 'h-8',
  "36": 'h-9',
  "40": 'h-10',
  '44': 'h-11',
  '48': 'h-12',
  '56': 'h-14',
  '64': 'h-16',
}
export const buttonRadiusClasses: Record<ButtonRadius, string> = {
  'none': 'rounded-0',
  '8': 'rounded-lg',
  'full': 'rounded-full',
}

export const variantClasses: Record<Variant, string> = {
  'primary': 'bg-primary-400 hover:bg-primary-500 text-base font-medium justify-center px-6 text-white',
  'secondary': 'border border-stone-500 text-black hover:bg-primary-700 hover:border-primary-700 text-base font-semibold',
  'outline': 'bg-neutral-900 text-white hover:bg-neutral-800 text-base font-medium',
  'input': 'w-full bg-transparent px-6 py-4 font-medium placeholder:text-base border focus:border-black/50 border-black/40 text-base  ',
  'none': '',

}




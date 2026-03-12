<template>
  <div class="main-input flex flex-col gap-1 md:gap-4">
    <label :for="type !== 'radio' ? id : undefined" :class="labelClasses">
      {{ label }} <span v-if="required" class="text-red-500">*</span>
    </label>

    <!-- Radio Buttons -->
    <div v-if="type === 'radio'" class="flex items-center gap-6">
      <label v-for="option in options" :key="option.value" class="radio-option flex items-center gap-2 cursor-pointer">
        <input type="radio" :name="id" :value="option.value" :checked="modelValue === option.value"
          @change="onRadioChange" class="radio-input" />
        <span class="radio-custom"></span>
        <span class="radio-label text-sm font-medium text-black/80">{{ option.label }}</span>
      </label>
    </div>

    <!-- Tab Toggle Buttons -->
    <div v-else-if="type === 'tabs'" class="w-full grid gap-2 border p-1.5 rounded-full border-black/20" :style="{ gridTemplateColumns: `repeat(${options?.length || 2}, minmax(0, 1fr))` }">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :aria-label="`${option.label} option`"
        @click="selectTab(option.value)"
        :class="[
          'py-2 rounded-full font-medium text-base transition-all duration-200',
          modelValue === option.value 
            ? 'bg-primary-100 border-primary-400 text-black border'
            : 'bg-transparent text-black border border-black/20 hover:border-primary-400 hover:bg-primary-100'
        ]"
      >
        {{ option.label }}
      </button>
    </div>

    <!-- Custom Select Dropdown -->
    <div v-else-if="type === 'select'" class="relative min-w-48 w-full">
      <button
        aria-label="drop down button"
        type="button"
        :id="id"
        @click="toggleDropdown"
        :class="inputClasses"
        :error="!!errors?.length"
        class="flex items-center justify-between text-start"
      >
        <span :class="modelValue ? 'text-black' : 'text-base-neutral-500'">
          {{ selectedLabel || placeholder || 'Select an option' }}
        </span>
        <ChevronDown :class="['w-5 h-5 text-base-neutral-500 transition-transform duration-200', isOpen && 'rotate-180']" />
      </button>
      
      <Transition
        enter-active-class="transition ease-out duration-200"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-150"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="isOpen"
          class="absolute z-50 w-full mt-2 bg-white border border-black/20 rounded-2xl shadow-lg overflow-hidden"
        >
          <!-- Search Input -->
          <div v-if="searchable" class="p-3 border-b border-black/10">
            <div class="relative">
              <input
                ref="searchInputRef"
                type="text"
                v-model="searchQuery"
                placeholder="Search..."
                class="w-full px-4 py-2.5 pr-10 text-sm font-medium border border-black/20 rounded-lg focus:outline-none focus:border-black/40 transition-colors"
                @click.stop
              />
              <Search class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-neutral-500 pointer-events-none" />
            </div>
          </div>

          <div class="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            <button
              aria-label="select option button"
              type="button"
              v-for="option in filteredOptions"
              :key="option.value"
              @click="selectOption(option)"
              :class="['w-full mb-1 px-6 py-3 text-left text-base font-medium transition-all duration-150 rounded-lg', modelValue === option.value ? 'bg-black/90 text-white' : 'text-black/90 hover:bg-gray-200']"
            >
              {{ option.label || option.name}}
            </button>
            <div v-if="filteredOptions.length === 0" class="px-6 py-3.5 text-center text-sm text-base-neutral-500">
              No results found
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Regular Inputs -->
    <div v-else class="relative w-full">
      <FormCountryCode :disabled="disabled" v-model="countryCode" v-if="type === 'tel'" />
      <component 
        ref="dateInputRef"
        :is="tag" 
        :value="modelValue" 
        @input="onInput" 
        @paste="onPaste"
        @keydown="onKeyDown"
        @click="onDateFieldClick"
        :inputmode="type === 'tel' ? 'numeric' : undefined"
        :max="maxDateValue"
        :id="id"
        :type="type === 'password' ? (showPassword ? 'text' : 'password') : type" 
        :placeholder="placeholder"
        :class="[inputClasses, type === 'date' ? 'cursor-pointer' : '']" 
        :error="!!errors?.length" 
        :disabled="disabled" 
        v-bind="$attrs" 
      />
      <slot name="prefix" />
      <Phone v-if="type === 'tel'" class="hidden md:block absolute end-8 top-4.75 w-5 h-5 text-base-neutral-500" />
      <button class="absolute end-8 top-4.75" type="button" @click.stop="showPassword = !showPassword"
        v-if="type === 'password'" aria-label="Toggle Password Visibility">
        <EyeOff v-if="showPassword" class="w-5 h-5 text-base-neutral-500" />
        <Eye v-else class="w-5 h-5 text-base-neutral-500" />
      </button>
    </div>

    <p v-if="errors?.length" class="text-red-500 text-xs mt-1">
      {{ errors }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { Eye, EyeOff, Phone, ChevronDown, Search } from 'lucide-vue-next';
import { twMerge } from 'tailwind-merge';
import type { InputTypeHTMLAttribute } from 'vue';

interface RadioOption {
  label: string;
  value: string | number;
  name?: string;
}

const props = withDefaults(defineProps<{
  id: string;
  label?: string;
  type?: InputTypeHTMLAttribute;
  placeholder?: string;
  rounded?: 'full' | '16'
  classList?: string;
  labelClassList?: string
  errors?: string;
  modelValue?: any;
  disabled?: boolean;
  tag?: 'input' | 'textarea';
  required?: boolean;
  options?: RadioOption[];
  searchable?: boolean;
  nameValidation?: boolean;
  maxDate?: string; // New prop for maximum date (e.g., 'today' for birthday fields)
}>(), {
  type: 'text',
  tag: 'input',
  rounded: 'full',
  searchable: false,
  nameValidation: false,
  maxDate: undefined,
})

const showPassword = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const dateInputRef = ref<HTMLInputElement | null>(null)
const countryCode = defineModel<string>('code')
const modelValue = defineModel<any>()

const { isOpen, toggle: toggleDropdownState, close: closeDropdown } = useSelectDropdown(props.id)

const maxDateValue = computed(() => {
  if (props.maxDate === 'today' && props.type === 'date') {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }
  return props.maxDate
})

const selectedLabel = computed(() => {
  const selected = props.options?.find(opt => opt.value === modelValue.value)
  return selected?.label || selected?.name || ''
})

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value.trim()) {
    return props.options || []
  }
  const query = searchQuery.value.toLowerCase()
  return props.options?.filter(option => 
    option.label.toLowerCase().includes(query)
  ) || []
})

const inputClasses = computed(() => {
  let defaultClasses = 'w-full bg-transparent px-6 py-4 font-medium placeholder:text-base border focus:border-black/50 border-black/40 text-base  focus:outline-none focus:ring-0 placeholder:text-base-neutral-500 disabled:bg-base-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors';
  if (props.tag === 'input') defaultClasses += 'h-14'
  if (props.tag === 'textarea') defaultClasses += ' resize-none min-h-12 pt-3'
  if (props.type === 'select') defaultClasses += ' h-14 appearance-none cursor-pointer pe-12'

  if (props.type === 'tel') {
    defaultClasses += ' ps-30'
  }
  if (props.type === 'password') {
    defaultClasses += ' pe-12'
  }
  if (props.rounded === 'full') {
    defaultClasses += ' rounded-full'
  } else if (props.rounded === '16') {
    defaultClasses += ' rounded-[16px]'
  } else {
    defaultClasses += ' rounded-10'
  }
  return twMerge(defaultClasses, props.classList)
})
const labelClasses = computed(() => {
  let defaultClasses = 'font-medium text-base flex mb-1'
  return twMerge(defaultClasses, props.labelClassList)
})

const onInput = (e: any) => {
  let value = e.target.value;
  
  // Remove non-numeric characters and leading zeros for phone inputs
  if (props.type === 'tel') {
    value = value.replace(/\D/g, '');
    if (value.length > 0) {
      value = value.replace(/^0+/, '');
    }
  }
  
  // Name validation: only alphabetic characters, auto-capitalize
  if (props.nameValidation) {
    // Remove numbers, symbols, and spaces
    value = value.replace(/[^a-zA-Z]/g, '');
    // Capitalize first letter
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
  }
  
  modelValue.value = value;
  
  //  recalculate textarea height
  if (props.tag === 'textarea') {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  }
}

const onKeyDown = (e: KeyboardEvent) => {
  // Only apply restrictions for tel type
  if (props.type === 'tel') {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    
    if (allowedKeys.includes(e.key)) {
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }
  
  // Name validation: block numbers, symbols, and spaces
  if (props.nameValidation) {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    
    if (allowedKeys.includes(e.key)) {
      return;
    }
    
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    
    // Only allow alphabetic characters (a-z, A-Z)
    if (!/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
    }
  }
}

const onPaste = (e: ClipboardEvent) => {
  // Only apply restrictions for tel type
  if (props.type === 'tel') {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    let numericOnly = pastedText.replace(/\D/g, '');
    if (numericOnly.length > 0) {
      numericOnly = numericOnly.replace(/^0+/, '');
    }
    if (numericOnly) {
      modelValue.value = numericOnly;
    }
  }
  
  // Name validation: extract only alphabetic characters and capitalize
  if (props.nameValidation) {
    e.preventDefault();
    const pastedText = e.clipboardData?.getData('text') || '';
    let alphabeticOnly = pastedText.replace(/[^a-zA-Z]/g, '');
    if (alphabeticOnly.length > 0) {
      alphabeticOnly = alphabeticOnly.charAt(0).toUpperCase() + alphabeticOnly.slice(1).toLowerCase();
    }
    if (alphabeticOnly) {
      modelValue.value = alphabeticOnly;
    }
  }
}

const onRadioChange = (e: any) => {
  modelValue.value = e.target.value;
}

const selectTab = (value: string | number) => {
  modelValue.value = value;
}

const selectOption = (option: RadioOption) => {
  modelValue.value = option.value
  closeDropdown()
  searchQuery.value = ''
}

const toggleDropdown = () => {
  toggleDropdownState()
  if (isOpen.value && props.searchable) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    searchQuery.value = ''
  }
}

const onDateFieldClick = () => {
  if (props.type === 'date' && dateInputRef.value && !props.disabled) {
    dateInputRef.value.showPicker?.()
  }
}

// Close dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (!target.closest('.main-input')) {
      closeDropdown()
      searchQuery.value = ''
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
})

</script>
<style scoped>
input[error='true'],
textarea[error='true'] {
  border-color: #bf242a;
}

/* Custom Radio Button Styling */
.radio-option {
  position: relative;
}

.radio-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.radio-custom {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #000;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.radio-input:checked~.radio-custom {
  border-color: #000;
}

.radio-input:checked~.radio-custom::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #000;
}

.radio-label {
  user-select: none;
}

.radio-option:hover .radio-custom {
  border-color: #333;
}

/* Custom Select Styling */
select[error='true'] {
  border-color: #bf242a;
}

select {
  background-image: none;
}

select option {
  padding: 12px 16px;
  background-color: #ffffff;
  color: #000000;
  font-weight: 500;
  font-size: 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

select option:hover {
  background-color: #f5f5f5;
}

select option:checked {
  background-color: #000000;
  color: #ffffff;
  font-weight: 600;
}

select option:disabled {
  color: #9ca3af;
  font-weight: 400;
}

/* Firefox specific */
@-moz-document url-prefix() {
  select option {
    padding: 8px 12px;
  }
}

/* Webkit browsers - Chrome, Safari, Edge */
select::-webkit-scrollbar {
  width: 8px;
}

select::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

select::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

select::-webkit-scrollbar-thumb:hover {
  background: #555;
}

select:focus {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Custom Scrollbar for Dropdown */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
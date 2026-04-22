<template>
  <div ref="countryDropdown" class="text-sm">
    <div class="flex items-center gap-2 h-full w-18 absolute top-0  start-8">
      <button @click="show = !show" type="button" class="flex gap-1 items-center" aria-label="Select Country Code" :disabled="props.disabled">
        <AppImage width="28" height="21" :src="`https://flagcdn.com/144x108/${selected?.code.toLowerCase()}.png`" :alt="selected?.name"
          class="w-7 h-6 object-contain" />
        <span class="ms-1 opacity-60 mb-0.5">{{ selected?.dial_code }}</span>
      </button>
      <span>
      </span>
    </div>
    <div
      class="absolute rounded-lg w-36  text-sm bg-white top-[calc(100%+10px)] no-scrollbar start-0 z-10  border-black/10"
      :class="show ? 'max-h-48 min-h-12 overflow-y-auto  border' : 'h-0 overflow-hidden'">
      <input  name="search" v-model="search" placeholder="search" :disabled="props.disabled"
        class="w-full  focus:ring-0 border-b border-white/15 focus:outline-none  px-3 py-2" />
      <button type="button" @click="selectCode(country.dial_code)" v-for="country in filteredCodes"
        class="flex gap-2  w-full hover:bg-base-neutral-950 border-b last-of-type:border-0  border-white/15  px-3 h-12    items-center"
        :aria-label="`Select country code ${country.name}`" :disabled="props.disabled"
         >
        <!-- <span>{{ country.flag }}</span> -->
        <AppImage :src="`https://flagcdn.com/144x108/${country.code.toLowerCase()}.png`" :alt="country.name"
          class="w-5 h-4 object-cover rounded-sm" />
        <span>{{ country.code }} &nbsp; <span>{{ country.dial_code }}</span> </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import countryCode from '~/common/data/country-code'

const code = defineModel<string>({ default: '+964' })
const show = ref(false)
const countryDropdown = ref<HTMLElement|null>(null)
const search = ref<string>()
const selected = computed(() => countryCode.find(item => item.dial_code == code.value))

const filteredCodes = computed(() => {
  if (!search.value) return countryCode;
  let query = search.value!.toLocaleLowerCase()
  return countryCode.filter((item) => item.name.toLocaleLowerCase().includes(query) || item.local_name?.toLocaleLowerCase().includes(query) || item.code?.toLocaleLowerCase().includes(query) || item.dial_code.toLocaleLowerCase().includes(query))
})

const props = withDefaults(defineProps<{
  disabled?: boolean;
}>(), {
})

const selectCode = (value: string) => {
  code.value = value;
  search.value = undefined;
  show.value = false;
}

onClickOutside(countryDropdown, () => {
  show.value = false
})
</script>
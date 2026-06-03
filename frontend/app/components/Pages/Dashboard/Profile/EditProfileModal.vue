<script setup lang="ts">
import type { MyProfileData, UpdateProfileInput } from '~/common/types/profile-types'

const props = defineProps<{
  open: boolean
  profile: MyProfileData | null
  saving?: boolean
}>()

const emit = defineEmits<{
  'update:open': [val: boolean]
  save: [input: UpdateProfileInput, avatarFile: File | null]
}>()

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

const displayName = ref('')
const phoneNumber = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)
const avatarError = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.open, (v) => {
  if (v && props.profile) {
    displayName.value = props.profile.displayName ?? ''
    phoneNumber.value = props.profile.phoneNumber ?? ''
    avatarFile.value = null
    avatarPreview.value = null
    avatarError.value = null
  }
})

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > MAX_AVATAR_BYTES) {
    avatarError.value = `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max size is 5 MB.`
    avatarFile.value = null
    avatarPreview.value = null
    // reset input so the same file can be re-selected after resize
    if (fileInputRef.value) fileInputRef.value.value = ''
    return
  }
  avatarError.value = null
  avatarFile.value = file
  avatarPreview.value = URL.createObjectURL(file)
}

function submit() {
  if (avatarError.value) return
  emit('save', {
    displayName: displayName.value.trim() || undefined,
    phoneNumber: phoneNumber.value.trim() || null,
  }, avatarFile.value)
}

const avatarSrc = computed(() => avatarPreview.value || props.profile?.avatarUrl || null)
const avatarInitial = computed(() => props.profile?.username?.charAt(0).toUpperCase() ?? 'U')
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="p-0 gap-0 overflow-hidden max-w-md" :style="`background:var(--surface-card)`">
      <UiDialogHeader class="p-6 pb-4">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-xl flex items-center justify-center shrink-0" style="background:var(--surface-raised)">
            <AppIconsax name="Edit" color="var(--color-brand-primary)" :size="18" />
          </div>
          <div>
            <UiDialogTitle class="text-[18px] font-semibold font-poppins" :style="`color:var(--text-heading)`">
              Edit profile
            </UiDialogTitle>
            <UiDialogDescription class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">
              Update your display name, phone and avatar.
            </UiDialogDescription>
          </div>
        </div>
      </UiDialogHeader>

      <div class="px-6 pb-6 space-y-5">
        <!-- Avatar picker -->
        <div class="flex items-center gap-4">
          <div class="relative shrink-0">
            <UiAvatar class="w-16 h-16 rounded-2xl">
              <UiAvatarImage v-if="avatarSrc" :src="avatarSrc" alt="Avatar" class="object-cover" />
              <UiAvatarFallback
                class="w-full h-full rounded-2xl text-[22px] font-semibold font-poppins text-white"
                style="background: linear-gradient(135deg, var(--color-brand-primary), #b45309)"
              >
                {{ avatarInitial }}
              </UiAvatarFallback>
            </UiAvatar>
            <button
              type="button"
              class="absolute -bottom-1.5 -right-1.5 size-6 rounded-full flex items-center justify-center cursor-pointer"
              style="background:var(--color-brand-primary)"
              @click="fileInputRef?.click()"
              aria-label="Upload photo"
            >
              <AppIconsax name="Camera" color="white" :size="12" />
            </button>
          </div>
          <div>
            <p class="text-[15px] font-semibold font-poppins" :style="`color:var(--text-heading)`">Profile photo</p>
            <p class="text-[14px] font-poppins mt-0.5" :style="`color:var(--text-muted)`">JPEG, PNG, WebP — max 5 MB</p>
            <button
              type="button"
              class="mt-1.5 text-[14px] font-medium font-poppins cursor-pointer"
              style="color:var(--color-brand-primary)"
              @click="fileInputRef?.click()"
            >
              Choose file
            </button>
          </div>
          <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="hidden" @change="onFileChange" />
        </div>
        <p v-if="avatarError" class="text-[14px] font-medium font-poppins text-red-500 -mt-2">
          {{ avatarError }}
        </p>

        <FormInput
          id="edit-displayName"
          v-model="displayName"
          label="Display name"
          placeholder="Your full name"
          icon="User"
        />

        <FormInput
          id="edit-phone"
          v-model="phoneNumber"
          label="Phone number"
          placeholder="+964 750 000 0000"
          icon="Call"
        />
      </div>

      <UiDialogFooter class="p-6 pt-0 flex gap-2">
        <UiDialogClose as-child>
          <AppButton variant="secondary" size="40" radius="8" text="Cancel" class="flex-1" />
        </UiDialogClose>
        <AppButton
          variant="primary"
          size="40"
          radius="8"
          icon="TickCircle"
          :icon-config="{ color: 'white', size: 16 }"
          text="Save changes"
          class="flex-1"
          :loading="saving"
          @click="submit"
        />
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>

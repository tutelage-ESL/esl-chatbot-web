// Global state to track the currently open dropdown
const currentlyOpenDropdown = ref<string | null>(null)

export const useSelectDropdown = (id: string) => {
  const isOpen = ref(false)

  const open = () => {
    // Close any other open dropdown
    if (currentlyOpenDropdown.value && currentlyOpenDropdown.value !== id) {
      // The other dropdown will close itself when it detects the change
    }
    currentlyOpenDropdown.value = id
    isOpen.value = true
  }

  const close = () => {
    if (currentlyOpenDropdown.value === id) {
      currentlyOpenDropdown.value = null
    }
    isOpen.value = false
  }

  const toggle = () => {
    if (isOpen.value) {
      close()
    } else {
      open()
    }
  }

  // Watch for changes to the global state
  watch(currentlyOpenDropdown, (newValue) => {
    if (newValue !== id && isOpen.value) {
      isOpen.value = false
    }
  })

  return {
    isOpen,
    open,
    close,
    toggle
  }
}

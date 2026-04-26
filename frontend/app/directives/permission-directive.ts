import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '~~/stores/auth';

export const vCan: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<string | string[]>) {
    const permission = binding.value
    if (!hasPermission(permission)) {
      el.style.display = 'none'
    }
  },
}
// STUDENT, TUTOR, ADMIN |
// we have these roles AnimationPlaybackEvent, i wanna create a v-directive that uses like this v-can=['STUDENT', 'TUTOR'] and it will check if the user has any of these roles, if not it will hide the element
export const hasPermission = (permission: string | string[]): boolean => {
  const authStore = useAuthStore()
  const userRoles = (authStore.user?.role || []) as string[]

  if (typeof permission === 'string') {
    return userRoles.includes(permission)
  } else if (Array.isArray(permission)) {
    return permission.some(role => userRoles.includes(role))
  }

  return false
}

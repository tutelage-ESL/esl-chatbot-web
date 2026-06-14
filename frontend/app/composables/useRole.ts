import { useAuthStore } from '~~/stores/auth'

/**
 * Current user's global account role helpers.
 *
 * - `isAdmin`  — role === 'ADMIN'
 * - `isTutor`  — role === 'TUTOR'
 * - `isStaff`  — admin OR tutor (i.e. not a learner)
 *
 * NOTE: this is the user's *account* role from the auth store — NOT a
 * class-specific membership role (`myRole` / `member.role`). For per-class
 * permissions keep deriving the role from the class members list.
 */
export function useRole() {
  const authStore = useAuthStore()

  const isAdmin = computed(() => authStore.getUser?.role === 'ADMIN')
  const isTutor = computed(() => authStore.getUser?.role === 'TUTOR')
  const isStaff = computed(() => isAdmin.value || isTutor.value)

  return { isAdmin, isTutor, isStaff }
}

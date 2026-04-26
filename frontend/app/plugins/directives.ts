import { vCan } from '~/directives/permission-directive'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('can', vCan)
})

import { useAuthStore } from "~~/stores/auth";

export default defineNuxtRouteMiddleware(async (to, from) => {
    const authStore = useAuthStore();
    
    if (!authStore.isCheckedUser) {
        try {
            await authStore.fetchUser();
        } catch (err) {
            // console.log('Error in auth middleware:', err);
        }
    }

    const isAuthenticated = authStore.getIsAuthenticated;
    const requiresAuth = to.meta.requiresAuth || false;
    const guestOnly = to.meta.guestOnly || false;

    if (!isAuthenticated && requiresAuth) {
        return navigateTo('/signin');
    }

    if (isAuthenticated && guestOnly) {
        return navigateTo('/');
    }
});

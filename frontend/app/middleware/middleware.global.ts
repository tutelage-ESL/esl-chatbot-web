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
    const requiresAdmin = to.meta.requiresAdmin || false;

    if (!isAuthenticated && requiresAuth) {
        return navigateTo('/signin');
    }

    if (isAuthenticated && guestOnly) {
        return navigateTo('/dashboard');
    }

    // Admin-only routes: non-admins get bounced to the dashboard.
    const { isAdmin } = useRole();
    if (requiresAdmin && !isAdmin.value) {
        return navigateTo('/dashboard');
    }
});

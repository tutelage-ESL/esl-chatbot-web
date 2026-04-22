import { defineStore } from 'pinia'
import type { User } from '@/common/model/user'
import type { SignInSchema, SignUpSchema, ForgotPasswordSchema, ResetPasswordSchema } from '~/common/schemas/AuthSchema'
import type { id } from 'zod/v4/locales'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isCheckedUser: boolean
  isAuthenticated: boolean
  isLoading: boolean
  isTokenRefreshed?: boolean
}

export const useAuthStore = defineStore('useAuthStore', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    refreshToken: null,
    isCheckedUser: false,
    isAuthenticated: false,
    isLoading: false,
    isTokenRefreshed: false,
  }),

  actions: {
    async signIn(credentials: SignInSchema) {
      this.isLoading = true;

      const response = await useHttp({
        method: 'POST',
        url: '/auth/login',
        body: {
          username: credentials.username,
          password: credentials.password,
        },
      });      

      if (response.success){
        this.accessToken = response.data.accessToken;
        this.refreshToken = response.data.refreshToken;        

        SetToken('accessToken', response.data.accessToken)
        SetToken('refreshToken', response.data.refreshToken)

        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        //now in here after the success login we call back the api/set-cookie to set the cookies in the server
        await fetch('/api/set-cookie', {
          method: 'POST',
          body: JSON.stringify({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          }),
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
        });
        
        // Fetch complete user data with after successful login
        await this.fetchUser();
        
      }
      this.isLoading = false;

      return response;
    },

    async signUp(credentials: SignUpSchema) {
      this.isLoading = true
      const signUpData = {
        username: credentials.username,
        email: credentials.email,
        password: credentials.password,
        displayName: credentials.displayName,
      }

      const response = await useHttp({
        method: 'POST',
        url: '/auth/register',
        body: signUpData,
        ignoreResponse: true,
      })   
    
      this.isLoading = false

      return response
    },

    async fetchUser(): Promise<void> {      
      this.isCheckedUser = true
      const config = useRuntimeConfig()
      const baseURL = config.BASE_URL as string | undefined
      this.getTokenFromStorage()

      let statusCode: number | null = null

      const { data } = await useFetch<User>('/auth/me', {
        method: 'GET',
        baseURL,
        key: `user-account-${this.accessToken}`,
        cache:  "no-cache",
        headers: {
          'Content-Type': 'application/json',
          "Accept-Language": "en",
          'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : '',
        },
        onResponse({ response }) {
          statusCode = response.status
        }
      })         
      if(statusCode === 401){
        const refreshSuccess = await this.refreshTokens()
        if (refreshSuccess) {
          return this.fetchUser()
        }
      }
      
      if (data.value) {
        this.user = {
          id: data.value.id,
          username: data.value.username,
          email: data.value.email,
          displayName: data.value.displayName,
          role: data.value.role,
          avatarUrl: data.value.avatarUrl,
          isActive: data.value.isActive,
          subscription: {
            plan: data.value.subscription.plan,
            status: data.value.subscription.status,
          }
        }
        this.isAuthenticated = true
      } else {
        this.user = null
        this.isAuthenticated = false
      }
    },

    // async updateProfile(profileData: SignUpSchema) {
    //   this.isLoading = true

    //   const response = await useHttp({
    //     method: 'PUT',
    //     url: '/account',
    //     body: {
    //       name: profileData.name,
    //       phoneNumber: profileData.phoneCode + profileData.phoneNumber,
    //       profile: {
    //         FirstName: profileData.profile.FirstName,
    //         LastName: profileData.profile.LastName,
    //         Birthday: profileData.profile.Birthday,
    //         E_Mail: profileData.profile.E_Mail,
    //         Gender: profileData.profile.Gender,
    //         State: JSON.stringify(profileData.profile.State),
    //         Country: JSON.stringify(profileData.profile.Country),
    //         AdvertisementLanguage: profileData.profile.AdvertisementLanguage,
    //       }
    //     },
    //     requireAuth: true,
    //     showToast : true,
    //     ignoreResponse: true
    //   })

    //   this.isLoading = false
    //   return response
    // },

    async forgotPassword(input: ForgotPasswordSchema) {
      this.isLoading = true
      const response = await useHttp({
        method: 'POST',
        url: '/auth/forgot-password',
        body: { email: input.email },
      })
      this.isLoading = false
      return response
    },

    async resetPassword(input: ResetPasswordSchema) {
      this.isLoading = true
      const response = await useHttp({
        method: 'POST',
        url: '/auth/reset-password',
        body: {
          email: input.email,
          otp: input.otp,
          newPassword: input.newPassword,
        },
      })
      this.isLoading = false
      return response
    },

    async googleAuth(idToken: string, username?: string) {
      this.isLoading = true
      const response = await useHttp({
        method: 'POST',
        url: '/auth/google',
        body: username ? { idToken, username } : { idToken },
      })

      if (response.success && response.data?.accessToken) {
        this.accessToken = response.data.accessToken
        this.refreshToken = response.data.refreshToken

        SetToken('accessToken', response.data.accessToken)
        SetToken('refreshToken', response.data.refreshToken)

        localStorage.setItem('accessToken', response.data.accessToken)
        localStorage.setItem('refreshToken', response.data.refreshToken)

        await fetch('/api/set-cookie', {
          method: 'POST',
          body: JSON.stringify({
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          }),
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })

        await this.fetchUser()
      }

      this.isLoading = false
      return response
    },

    async signOut() {
      this.$reset();   

      await useHttp({
        method: 'POST',
        url: '/auth/logout',
        body: {
          refreshToken: this.refreshToken,
        },
      });

      // Clear cookies via API
      fetch('/api/clear-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      const accessToken = useCookie('accessToken');
      accessToken.value = null;
      const refreshToken = useCookie('refreshToken');
      refreshToken.value = null;

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      
    },

    async refreshTokens() {
      if(this.isTokenRefreshed) {
        return false; 
      }
      
      this.getTokenFromStorage()

      if (!this.accessToken || !this.refreshToken) {
        // console.log('User is not authenticated. Skipping token refresh.');
        return false;
      }

      const response = await useHttp({
        method: 'POST',
        url: '/auth/refresh',
        body: { refreshToken: this.refreshToken },
        requireAuth: false,
        showToast: false,
      });
      
      if(response.status === 401){
        await this.signOut();
      }

      if (response?.success && response?.data) {
          this.isTokenRefreshed = true;
          this.accessToken = response.data.accessToken;

          SetToken('accessToken', response.data.accessToken)

          if (import.meta.client) {
            localStorage.setItem('accessToken', response.data.accessToken as string);
          }

          const setCookieResponse = await fetch('/api/set-cookie', {
            method: 'POST',
            body: JSON.stringify({
              accessToken: response.data.accessToken,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });
        }
      return response.success
    },

    getTokenFromStorage() {
      if (import.meta.server) {
        const accessTokenCookie = useCookie('accessToken')
        const refreshTokenCookie = useCookie('refreshToken')
        this.accessToken = accessTokenCookie.value as string
        this.refreshToken = refreshTokenCookie.value as string
      } else if (import.meta.client) {
        this.accessToken = localStorage.getItem('accessToken')
        this.refreshToken = localStorage.getItem('refreshToken')
      } else {
        this.accessToken = localStorage.getItem('accessToken')
        this.refreshToken = localStorage.getItem('refreshToken')
      }
    },
  },

  getters: {
    getUser: (state) => state.user as User,
    getIsAuthenticated: (state) => state.isAuthenticated,
    getIsLoading: (state) => state.isLoading,
    getAccessToken: (state) => state.accessToken,
    getRefreshToken: (state) => state.refreshToken,
  },
})


const SetToken = (name: string, token: string) => {
  const accessToken = useCookie(name);
  accessToken.value = token;
}

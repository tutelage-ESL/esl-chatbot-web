export type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: 'STUDENT' | 'TUTOR' | 'ADMIN';
  avatarUrl: string;
  isActive: boolean;
  subscription: {
    plan: 'FREE' | 'GOLD' | 'PREMIUM';
    status: 'ACTIVE' | 'INACTIVE' | 'CANCELED' | 'PAST_DUE';
  };
};


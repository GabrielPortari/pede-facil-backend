export const Role = {
  USER: 'user',
  BUSINESS: 'business',
  ADMIN: 'admin',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

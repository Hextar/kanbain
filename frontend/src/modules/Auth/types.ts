export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified?: boolean;
};

export type AuthOrganization = {
  id: string;
  name: string;
};

export type AuthSession = {
  user: AuthUser;
  organization: AuthOrganization;
};

export type AuthCredentials = {
  email: string;
  password: string;
  name?: string;
};

export type RegisterResult = {
  user: AuthUser;
  organization: AuthOrganization;
  message: string;
  debugActivationUrl?: string;
};

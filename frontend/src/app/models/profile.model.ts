export interface Profile {
  id: number;
  name: string;
}

export interface AuthSession {
  profile: Profile;
  token: string;
}

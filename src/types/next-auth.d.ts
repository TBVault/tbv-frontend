import "next-auth";
import type { User } from "@/api/generated/schemas";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    user: {
      id?: string | number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    picture?: string;
    user?: User;
  }
}


import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { User } from "next-auth";
import { encodeEmail, downloadJson } from "@/lib/azure-storage";

interface CustomUser extends User {
  username: string;
  name?: string;
  image?: string;
  bio?: string;
  preferredLanguages?: string[];
}

interface StoredUser {
  _id: string;
  username: string;
  email: string;
  password: string;
  createdAt: string;
  name?: string;
  image?: string;
  bio?: string;
  preferredLanguages?: string[];
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<CustomUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await downloadJson<StoredUser>(
          `users/${encodeEmail(credentials.email)}.json`
        );

        if (!user) {
          throw new Error('No user found');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id,
          email: user.email,
          username: user.username,
          name: user.name || '',
          image: user.image || '',
          bio: user.bio || '',
          preferredLanguages: user.preferredLanguages || [],
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register'
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.user = user as CustomUser;
      }

      if (trigger === "update" && session?.user) {
        token.user = {
          ...(token.user as CustomUser),
          ...(session.user as CustomUser)
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = token.user as CustomUser;
      }
      return session;
    }
  }
});

export { handler as GET, handler as POST };

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        // No user found, or account was created without a password (e.g. OAuth)
        if (!user?.password) return null

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )
        if (!isPasswordValid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Persist the user id onto the JWT token
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    // Expose the user id on the session object
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function getSession() {
  return await getServerSession();
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

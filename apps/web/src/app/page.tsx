import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home(): Promise<never> {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }
  redirect("/sign-in");
}

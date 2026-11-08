import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { nestApiIsAuthenticated } from "@/lib/nest-api";

export async function redirectAuthenticatedUser(destination = "/app") {
  await connection();
  const cookieStore = await cookies();
  if (await nestApiIsAuthenticated(cookieStore.toString())) {
    redirect(destination);
  }
}

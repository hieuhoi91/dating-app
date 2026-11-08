import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { nestApiIsAuthenticated } from "@/lib/nest-api";
import AppLoadingScreen from "./AppLoadingScreen";

async function RequireAuthenticatedUser({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  if (!(await nestApiIsAuthenticated(cookieStore.toString()))) {
    redirect("/auth/login?next=%2Fapp");
  }

  return children;
}

export default function ProtectedAppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <RequireAuthenticatedUser>{children}</RequireAuthenticatedUser>
    </Suspense>
  );
}

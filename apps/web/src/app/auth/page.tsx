import { Suspense } from "react";
import AuthForm from "./auth-form";
import { redirectAuthenticatedUser } from "@/lib/auth/redirect-authenticated-user";

async function AuthPageContent() {
  await redirectAuthenticatedUser();
  return <AuthForm initialMode="register" />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="auth-page" aria-busy="true" />}>
      <AuthPageContent />
    </Suspense>
  );
}

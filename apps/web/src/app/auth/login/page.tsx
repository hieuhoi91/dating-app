import { Suspense } from "react";
import AuthForm from "../auth-form";
import { redirectAuthenticatedUser } from "@/lib/auth/redirect-authenticated-user";

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/app";
  await redirectAuthenticatedUser(next);
  const initialError = params.error === "backend"
    ? "Chưa kết nối được backend. Vui lòng kiểm tra cấu hình máy chủ."
    : "";
  return <AuthForm initialMode="login" redirectTo={next} initialError={initialError} />;
}

export default function LoginPage(props: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <Suspense fallback={<AuthForm initialMode="login" />}>
      <LoginPageContent {...props} />
    </Suspense>
  );
}

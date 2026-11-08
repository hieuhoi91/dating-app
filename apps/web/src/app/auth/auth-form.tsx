"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleAlert, Heart, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type AuthResponse = {
  authenticated?: boolean;
  url?: string;
  error?: unknown;
  message?: unknown;
};

async function readAuthResponse(response: Response): Promise<AuthResponse> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null
      ? (body as AuthResponse)
      : {};
  } catch {
    return {};
  }
}

function getResponseMessage(result: AuthResponse, fallback: string): string {
  if (typeof result.error === "string") return result.error;
  if (typeof result.message === "string") return result.message;
  if (Array.isArray(result.message)) {
    return result.message.filter((item): item is string => typeof item === "string").join(" ");
  }
  if (typeof result.message === "object" && result.message !== null) {
    const nested = result.message as { error?: unknown; message?: unknown };
    if (typeof nested.error === "string") return nested.error;
    if (typeof nested.message === "string") return nested.message;
  }
  return fallback;
}

export default function AuthForm({
  initialMode,
  redirectTo = "/app",
  initialError = "",
}: {
  initialMode: "register" | "login";
  redirectTo?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [message, setMessage] = useState(initialError);
  const [messageIsError, setMessageIsError] = useState(Boolean(initialError));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: formData.get("password"),
        }),
      });
      const result = await readAuthResponse(response);
      if (!response.ok) {
        const errorMessage = getResponseMessage(
          result,
          mode === "register"
            ? "Không thể tạo tài khoản. Vui lòng kiểm tra thông tin và thử lại."
            : "Không thể đăng nhập. Vui lòng thử lại.",
        );
        throw new Error(errorMessage);
      }
      if (mode === "register") {
        router.replace("/app/onboarding?registered=1");
      } else {
        window.location.replace(redirectTo);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ.");
      setMessageIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPassword = async (form: HTMLFormElement) => {
    const email = new FormData(form).get("email");
    if (typeof email !== "string" || !email) {
      setMessage("Nhập email trước để nhận hướng dẫn đặt lại mật khẩu.");
      setMessageIsError(true);
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await readAuthResponse(response);
      if (!response.ok) {
        throw new Error(getResponseMessage(result, "Không thể gửi yêu cầu."));
      }
      setMessage(
        getResponseMessage(
          result,
          "Nếu email thuộc tài khoản hợp lệ, hướng dẫn sẽ được gửi.",
        ),
      );
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ.");
      setMessageIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/google", { method: "POST" });
      const result = await readAuthResponse(response);
      if (!response.ok) {
        throw new Error(
          getResponseMessage(result, "Không thể đăng nhập bằng Google."),
        );
      }
      if (!result.url) throw new Error("Máy chủ chưa trả liên kết đăng nhập Google.");
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ.");
      setMessageIsError(true);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-header"><Link className="brand" href="/"><span className="brand-mark"><Heart size={16} fill="currentColor" /></span><span>DATING<span className="brand-period">.</span></span></Link><Link href="/" className="auth-back"><ArrowLeft size={15} /> Về trang chủ</Link></header>
      <div className="auth-layout">
        <section className="auth-story"><div className="auth-story-photo" /><div className="auth-story-overlay" /><div className="auth-story-copy"><span className="eyebrow">MỘT CHÚT GẦN HƠN, MỖI NGÀY</span><h1>Những điều<br />đẹp đẽ thường<br /><em>bắt đầu thật khẽ.</em></h1><p>Chỉ cần là chính mình. Phần còn lại, hãy để kết nối dẫn lối.</p><div className="auth-proof"><span><ShieldCheck size={17} /></span><div><strong>Riêng tư và an toàn</strong><small>Bạn luôn lựa chọn điều mình chia sẻ.</small></div></div></div><div className="auth-story-footer">GẶP GỠ THẬT LÒNG <span>✳</span> TÌM HIỂU CHẬM RÃI</div></section>
        <section className="auth-form-wrap"><div className="auth-form-card"><span className="eyebrow">{mode === "register" ? "BẮT ĐẦU HÀNH TRÌNH CỦA BẠN" : "RẤT VUI KHI BẠN QUAY LẠI"}</span><h2>{mode === "register" ? <>Một lời chào<br /><em>đang chờ bạn.</em></> : <>Chào mừng<br /><em>bạn trở lại.</em></>}</h2><p className="auth-description">{mode === "register" ? "Tạo tài khoản để gặp gỡ những người khiến bạn muốn lắng nghe thêm." : "Đăng nhập để tiếp tục những kết nối đang chờ bạn."}</p>
          <div className="auth-mode-tabs"><button type="button" className={mode === "register" ? "auth-mode-active" : ""} onClick={() => { setMode("register"); setMessage(""); setMessageIsError(false); }}>Tạo tài khoản</button><button type="button" className={mode === "login" ? "auth-mode-active" : ""} onClick={() => { setMode("login"); setMessage(""); setMessageIsError(false); }}>Đăng nhập</button></div>
          <form onSubmit={submit}><label className="form-label">Email<div className="input-with-icon"><Mail size={17} /><input name="email" type="email" placeholder="ten@email.com" autoComplete="email" required /></div></label><label className="form-label">Mật khẩu<div className="input-with-icon"><LockKeyhole size={17} /><input name="password" type="password" placeholder="Ít nhất 8 ký tự" minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} required /></div></label>{mode === "register" && <label className="terms-check"><input type="checkbox" required /><span>Tôi đồng ý với <Link href="/#safety">Điều khoản sử dụng</Link> và <Link href="/#safety">Chính sách quyền riêng tư</Link>.</span></label>}{mode === "login" && <button type="button" className="forgot-link" disabled={isSubmitting} onClick={(event) => void resetPassword(event.currentTarget.form!)}>Quên mật khẩu?</button>}<button type="submit" className="button button-primary auth-submit" disabled={isSubmitting}>{isSubmitting ? "Đang xử lý..." : mode === "register" ? "Tạo tài khoản" : "Đăng nhập"} {!isSubmitting && <ArrowRight size={16} />}</button></form>
          {message && <div className={`auth-message${messageIsError ? " auth-message-error" : ""}`} role={messageIsError ? "alert" : "status"}>{messageIsError ? <CircleAlert size={16} /> : <BadgeCheck size={16} />}{message}</div>}
          <div className="auth-divider"><span />hoặc<span /></div><button type="button" className="button button-social" disabled={isSubmitting} onClick={() => void signInWithGoogle()}><span className="google-g">G</span> Tiếp tục với Google</button><p className="auth-assurance"><LockKeyhole size={13} /> Thông tin của bạn được bảo vệ và giữ riêng tư.</p>
        </div></section>
      </div>
      <footer className="auth-footer"><span>© 2026 DATING</span><span>Kết nối có chủ đích. Riêng tư theo cách bạn chọn.</span></footer>
    </main>
  );
}

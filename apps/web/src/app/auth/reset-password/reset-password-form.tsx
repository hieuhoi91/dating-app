"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    const password = new FormData(event.currentTarget).get("password");
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setMessage("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      setIsSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, token }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không thể cập nhật mật khẩu.");
      router.push("/app");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <span className="eyebrow">BẢO MẬT TÀI KHOẢN</span>
          <h2>Đặt lại<br /><em>mật khẩu.</em></h2>
          <p className="auth-description">Chọn một mật khẩu mới có ít nhất 8 ký tự.</p>
          <form onSubmit={submit}>
            <label className="form-label">Mật khẩu mới
              <div className="input-with-icon"><LockKeyhole size={17} /><input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required /></div>
            </label>
            <button type="submit" className="button button-primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
          {message && <div className="auth-message auth-message-error" role="alert">{message}</div>}
        </div>
      </section>
    </main>
  );
}

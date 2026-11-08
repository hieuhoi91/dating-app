"use client";

import { useEffect, useState } from "react";
import { Check, LockKeyhole, MessageCircleHeart, Send } from "lucide-react";
import type { CoupleNotice } from "./types";
import { apiRequest, reportApiError } from "@/lib/client-api";

type QuestionData = {
  session: { session_id: string; question_id: string; question_text: string; scheduled_date: string } | null;
  answers: { id: string; user_id: string; answer: string }[];
  userId: string;
};

export default function CoupleQuestions({ coupleId, notify }: { coupleId: string; notify: CoupleNotice }) {
  const [data, setData] = useState<QuestionData | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void apiRequest<QuestionData>(`/api/couple/questions?coupleId=${encodeURIComponent(coupleId)}`)
      .then((result) => { if (active) { setData(result); setAnswer(result.answers.find((item) => item.user_id === result.userId)?.answer ?? ""); } })
      .catch((error: unknown) => { if (active) reportApiError(error, notify); });
    return () => { active = false; };
  }, [coupleId, notify]);

  async function submitAnswer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answer.trim() || !data?.session || busy) return;
    setBusy(true);
    try {
      await apiRequest("/api/couple/answers", {
        method: "POST",
        body: JSON.stringify({ sessionId: data.session.session_id, answer }),
      });
      const refreshed = await apiRequest<QuestionData>(`/api/couple/questions?coupleId=${encodeURIComponent(coupleId)}`);
      setData(refreshed);
      setAnswer(refreshed.answers.find((item) => item.user_id === refreshed.userId)?.answer ?? answer);
      notify("Câu trả lời đã được lưu.");
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setBusy(false);
    }
  }

  const answered = Boolean(data?.answers.length);
  const bothAnswered = (data?.answers.length ?? 0) >= 2;

  return (
    <section className="couple-panel">
      <span className="eyebrow">MỖI NGÀY MỘT CÂU HỎI</span>
      <h2>Cùng hiểu nhau hơn</h2>
      <div className="couple-question-card">
        <span className="couple-panel-icon"><MessageCircleHeart size={20} /></span>
        <span className="couple-question-date">CÂU HỎI HÔM NAY</span>
        <h3>{data?.session?.question_text ?? "Hôm nay chưa có câu hỏi khả dụng."}</h3>
        <p>Trả lời thật lòng, không có câu trả lời đúng hay sai.</p>
        {data?.session && <form onSubmit={(event) => void submitAnswer(event)}>
          <label className="sr-only" htmlFor="couple-answer">Câu trả lời của bạn</label>
          <textarea id="couple-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Chia sẻ với người ấy..." maxLength={5000} rows={4} disabled={busy || (answered && bothAnswered)} />
          <div className="couple-form-footer"><span>{answer.length}/5000 ký tự</span><button className="button button-primary" type="submit" disabled={!answer.trim() || busy || (answered && bothAnswered)}>{busy ? "Đang lưu..." : answered ? <><Check size={15} /> Đã lưu</> : <><Send size={15} /> Gửi câu trả lời</>}</button></div>
        </form>}
      </div>
      <div className="couple-answer-privacy"><LockKeyhole size={16} /><span><strong>Câu trả lời riêng tư</strong><small>Chỉ mở khi cả hai đã trả lời câu hỏi hôm nay.</small></span></div>
      {answered && <div className="couple-partner-answer">{bothAnswered ? <><span className="couple-status-icon"><Check size={17} /></span><div><strong>Cả hai đã trả lời</strong>{data?.answers.filter((item) => item.user_id !== data.userId).map((item) => <p key={item.id}>{item.answer}</p>)}</div></> : <><span className="couple-status-icon couple-status-pending"><LockKeyhole size={16} /></span><div><strong>Đang chờ người ấy trả lời</strong><p>Câu trả lời của hai bạn sẽ cùng được mở sau đó.</p></div></>}</div>}
    </section>
  );
}

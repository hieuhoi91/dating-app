"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Heart, Sparkles } from "lucide-react";
import type { CoupleNotice } from "./types";
import { apiRequest, reportApiError } from "@/lib/client-api";

type Challenge = { id: string; title: string; description: string; duration_days: number };
type Progress = { id: string; challenge_id: string; status: "in_progress" | "completed" | "skipped"; started_at: string };
type ChallengeData = { challenges: Challenge[]; progress: Progress[] };

export default function CoupleChallenges({ coupleId, notify }: { coupleId: string; notify: CoupleNotice }) {
  const [data, setData] = useState<ChallengeData>({ challenges: [], progress: [] });
  const [busyId, setBusyId] = useState("");

  const loadChallenges = useCallback(
    () => apiRequest<ChallengeData>(`/api/couple/challenges?coupleId=${encodeURIComponent(coupleId)}`),
    [coupleId],
  );
  const refresh = useCallback(async () => setData(await loadChallenges()), [loadChallenges]);

  useEffect(() => {
    let active = true;
    void loadChallenges()
      .then((result) => { if (active) setData(result); })
      .catch((error: unknown) => { if (active) reportApiError(error, notify); });
    return () => { active = false; };
  }, [loadChallenges, notify]);

  async function toggleChallenge(challenge: Challenge) {
    if (busyId) return;
    setBusyId(challenge.id);
    try {
      const progress = data.progress.find((item) => item.challenge_id === challenge.id && item.status !== "skipped");
      if (progress) {
        await apiRequest("/api/couple/challenges", {
          method: "PATCH",
          body: JSON.stringify({ id: progress.id, status: progress.status === "completed" ? "in_progress" : "completed" }),
        });
      } else {
        await apiRequest("/api/couple/challenges", {
          method: "POST",
          body: JSON.stringify({ coupleId, challengeId: challenge.id, status: "in_progress" }),
        });
      }
      await refresh();
      notify("Đã cập nhật thử thách.");
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="couple-panel">
      <span className="eyebrow">NHỮNG ĐIỀU NHỎ CÙNG LÀM</span><h2>Thử thách tình yêu</h2>
      <p className="couple-panel-intro">Không chấm điểm tình yêu — chỉ là vài gợi ý để hai bạn dành thời gian cho nhau.</p>
      <div className="couple-challenge-list">
        {data.challenges.map((challenge) => {
          const progress = data.progress.find((item) => item.challenge_id === challenge.id && item.status !== "skipped");
          const done = progress?.status === "completed";
          return <article className={`couple-challenge-card${done ? " challenge-done" : ""}`} key={challenge.id}>
            <span className="couple-challenge-icon"><Heart size={19} /></span>
            <div className="couple-challenge-copy"><span className="couple-challenge-time"><Clock3 size={13} /> {challenge.duration_days} ngày</span><h3>{challenge.title}</h3><p>{challenge.description}</p></div>
            <button disabled={busyId === challenge.id} aria-label={done ? "Đánh dấu chưa hoàn thành" : "Tham gia hoặc hoàn thành thử thách"} aria-pressed={done} className={`couple-challenge-check${done ? " checked" : ""}`} onClick={() => void toggleChallenge(challenge)}>{done ? <Check size={17} /> : <Sparkles size={16} />}</button>
          </article>;
        })}
        {!data.challenges.length && <p>Chưa có thử thách nào. Hãy áp dụng migration seed để thêm gợi ý.</p>}
      </div>
    </section>
  );
}

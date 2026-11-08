"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bookmark, CalendarHeart, Check, HeartHandshake, LockKeyhole, MessageCircleHeart,
  NotebookPen, Settings2, Sparkles, Star, UsersRound, type LucideIcon,
} from "lucide-react";
import CoupleChallenges from "./couple/CoupleChallenges";
import CoupleDatePlans from "./couple/CoupleDatePlans";
import CoupleInvitations from "./couple/CoupleInvitations";
import CoupleJournal from "./couple/CoupleJournal";
import CoupleMemories from "./couple/CoupleMemories";
import CoupleOverview from "./couple/CoupleOverview";
import CoupleQuestions from "./couple/CoupleQuestions";
import CoupleSettings from "./couple/CoupleSettings";
import type { CoupleInvitation, CoupleNotice, CoupleTab } from "./couple/types";
import { apiRequest, reportApiError } from "@/lib/client-api";

const tabs: { id: CoupleTab; label: string; icon: LucideIcon }[] = [
  { id: "space", label: "Tổng quan", icon: UsersRound },
  { id: "invitations", label: "Lời mời", icon: HeartHandshake },
  { id: "questions", label: "Câu hỏi", icon: MessageCircleHeart },
  { id: "challenges", label: "Thử thách", icon: Star },
  { id: "memories", label: "Kỷ niệm", icon: Bookmark },
  { id: "journal", label: "Nhật ký", icon: NotebookPen },
  { id: "dates", label: "Lịch hẹn", icon: CalendarHeart },
  { id: "settings", label: "Cài đặt", icon: Settings2 },
];

const preCoupleTabs = new Set<CoupleTab>(["space", "invitations"]);
const titles: Record<CoupleTab, string> = {
  space: "Không gian của hai bạn",
  invitations: "Lời mời Couple",
  questions: "Câu hỏi mỗi ngày",
  challenges: "Thử thách cùng nhau",
  memories: "Kho kỷ niệm",
  journal: "Nhật ký chung",
  dates: "Lịch hẹn hò",
  settings: "Cài đặt Couple",
};

type CoupleRecord = { id: string; partner: { display_name: string; username: string | null } | null } | null;
type InvitationResult = { invitations: CoupleInvitation[] };
type UserResult = { profile: { id: string } };

export default function CoupleWorkspace({ notify, onCelebration, activeTab, onTabChange }: { notify: CoupleNotice; onCelebration: (partnerName: string) => void; activeTab: CoupleTab; onTabChange: (tab: CoupleTab) => void }) {
  const [couple, setCouple] = useState<CoupleRecord>(null);
  const [userId, setUserId] = useState("");
  const [invitations, setInvitations] = useState<CoupleInvitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const isActive = Boolean(couple);
  const partnerName = couple?.partner?.display_name || (couple?.partner?.username ? `@${couple.partner.username}` : "");

  const loadWorkspace = useCallback(async () => Promise.all([
      apiRequest<{ couple: CoupleRecord }>("/api/couple"),
      apiRequest<InvitationResult>("/api/couple/invitations"),
      apiRequest<UserResult>("/api/me"),
    ]), []);

  const refresh = useCallback(async () => {
    const [coupleResult, invitationResult, accountResult] = await loadWorkspace();
    setCouple(coupleResult.couple);
    setInvitations(invitationResult.invitations);
    setUserId(accountResult.profile.id);
  }, [loadWorkspace]);

  useEffect(() => {
    let active = true;
    void loadWorkspace()
      .then(([coupleResult, invitationResult, accountResult]) => {
        if (!active) return;
        setCouple(coupleResult.couple);
        setInvitations(invitationResult.invitations);
        setUserId(accountResult.profile.id);
      })
      .catch((error: unknown) => { if (active) reportApiError(error, notify); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadWorkspace, notify]);

  useEffect(() => {
    function handleWorkspaceRefresh() {
      void refresh().catch((error: unknown) => reportApiError(error, notify));
    }

    window.addEventListener("couple-workspace-refresh", handleWorkspaceRefresh);
    return () => window.removeEventListener("couple-workspace-refresh", handleWorkspaceRefresh);
  }, [notify, refresh]);

  async function sendInvitation(identifier: string) {
    setBusy(true);
    try {
      const result = await apiRequest<{ message: string }>("/api/couple/invitations", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
      notify(result.message);
      await refresh();
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setBusy(false);
    }
  }

  async function respondInvitation(invitationId: string, accept: boolean) {
    setBusy(true);
    try {
      const result = await apiRequest<{ coupleId: string | null; status: string }>(`/api/couple/invitations/${invitationId}/respond`, {
        method: "POST",
        body: JSON.stringify({ accept }),
      });
      if (result.status === "accepted") {
        if (!result.coupleId) {
          throw new Error("Lời mời đã được chấp nhận nhưng máy chủ không trả về mã Couple. Hãy tải lại trang để đồng bộ.");
        }
        const acceptedInvitation = invitations.find((item) => item.id === invitationId);
        const acceptedPartner = acceptedInvitation?.sender ?? null;
        const acceptedPartnerName =
          acceptedPartner?.display_name || (acceptedPartner?.username ? `@${acceptedPartner.username}` : "người ấy");
        setCouple({ id: result.coupleId, partner: acceptedPartner });
        setInvitations((current) =>
          current.map((item) => item.id === invitationId ? { ...item, status: "accepted" } : item),
        );
        onTabChange("questions");
        onCelebration(acceptedPartnerName);
        notify("Lời mời đã được chấp nhận. Couple Space đã mở.");
        try {
          await refresh();
        } catch (error) {
          reportApiError(error, notify);
        }
        return;
      }
      await refresh();
      if (result.status === "declined") {
        notify("Bạn đã từ chối lời mời Couple.");
      } else {
        notify(`Lời mời hiện có trạng thái: ${result.status}.`);
      }
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvitation(invitationId: string) {
    setBusy(true);
    try {
      await apiRequest(`/api/couple/invitations/${invitationId}`, { method: "DELETE" });
      await refresh();
      notify("Đã hủy lời mời Couple.");
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setBusy(false);
    }
  }

  async function endCouple(): Promise<boolean> {
    if (!couple) return false;
    setBusy(true);
    try {
      await apiRequest(`/api/couple?id=${couple.id}`, { method: "DELETE" });
      setCouple(null);
      onTabChange("space");
      notify("Không gian Couple đã kết thúc.");
      try {
        await refresh();
      } catch (error) {
        reportApiError(error, notify);
      }
      return true;
    } catch (error) {
      reportApiError(error, notify);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function renderTab() {
    if (activeTab === "invitations") {
      return <CoupleInvitations invitations={invitations} userId={userId} isActive={isActive} busy={busy} onSend={sendInvitation} onRespond={respondInvitation} onCancel={cancelInvitation} />;
    }
    if (activeTab === "space") {
      return <CoupleOverview isActive={isActive} coupleId={couple?.id ?? null} onNavigate={onTabChange} notify={notify} />;
    }
    if (!isActive || !couple) {
      return (
        <section className="couple-locked-panel">
          <span className="couple-locked-icon"><LockKeyhole size={21} /></span>
          <span className="eyebrow">CHỈ DÀNH CHO HAI THÀNH VIÊN</span>
          <h2>Không gian này đang được khóa</h2>
          <p>Gửi lời mời và chờ người ấy đồng ý để cùng mở câu hỏi, nhật ký và kỷ niệm riêng tư.</p>
          <button className="button button-primary" onClick={() => onTabChange("invitations")}>Mời người ấy vào Couple</button>
        </section>
      );
    }
    switch (activeTab) {
      case "questions": return <CoupleQuestions coupleId={couple.id} notify={notify} />;
      case "challenges": return <CoupleChallenges coupleId={couple.id} notify={notify} />;
      case "memories": return <CoupleMemories coupleId={couple.id} notify={notify} />;
      case "journal": return <CoupleJournal coupleId={couple.id} notify={notify} />;
      case "dates": return <CoupleDatePlans coupleId={couple.id} notify={notify} />;
      case "settings": return <CoupleSettings partnerName={partnerName} onEndCouple={endCouple} />;
      default: return null;
    }
  }

  const overview = <CoupleOverview isActive={isActive} coupleId={couple?.id ?? null} onNavigate={onTabChange} notify={notify} />;

  return (
    <div className="couple-workspace">
      <div className="couple-workspace-heading">
        <div><span className="eyebrow">CÙNG LƯU GIỮ NHỮNG ĐIỀU ĐẸP</span><h2>{titles[activeTab]}</h2></div>
        {loading ? <span className="couple-workspace-status status-waiting">Đang tải...</span> : isActive ? <span className="couple-workspace-status"><Check size={14} /> Đang kết nối</span> : invitations.some((item) => item.sender_id === userId && item.status === "pending") ? <span className="couple-workspace-status status-waiting">Đang chờ xác nhận</span> : <span className="couple-workspace-status status-private"><Sparkles size={14} /> Riêng tư cho hai người</span>}
      </div>
      <nav className="couple-workspace-nav" aria-label="Các mục trong Couple">
        {tabs.filter(({ id }) => isActive ? id !== "invitations" : preCoupleTabs.has(id)).map(({ id, label, icon: Icon }) => (
          <button aria-current={activeTab === id ? "page" : undefined} className={activeTab === id ? "couple-tab-active" : ""} key={id} onClick={() => onTabChange(id)}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="couple-workspace-content">
        {loading ? <p role="status">Đang tải dữ liệu Couple...</p> : activeTab === "space" ? overview : (
          <>
            {isActive && <div hidden>{overview}</div>}
            {renderTab()}
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Bell, Eye, Heart, HeartOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

type Props = { partnerName: string; onEndCouple: () => Promise<boolean> };

export default function CoupleSettings({ partnerName, onEndCouple }: Props) {
  const [allowMemories, setAllowMemories] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [confirmEnding, setConfirmEnding] = useState(false);
  const [ending, setEnding] = useState(false);

  async function confirmEndCouple() {
    if (ending) return;
    setEnding(true);
    try {
      if (await onEndCouple()) setConfirmEnding(false);
    } finally {
      setEnding(false);
    }
  }

  return (
    <section className="couple-panel">
      <span className="eyebrow">QUYỀN RIÊNG TƯ VÀ KẾT NỐI</span>
      <h2>Cài đặt Couple</h2>
      <p className="couple-panel-intro">Quản lý cách hai bạn sử dụng không gian chung.</p>
      <div className="couple-settings-card">
        <div className="couple-settings-member"><span className="couple-avatar-placeholder"><LockKeyhole size={17} /></span><span><strong>Bạn &amp; {partnerName}</strong><small>Chỉ thành viên Couple mới xem được nội dung</small></span><ShieldCheck size={18} /></div>
        <SettingRow icon={<Eye size={17} />} title="Lưu kỷ niệm chung" description="Cho phép cả hai cùng thêm kỷ niệm." enabled={allowMemories} onToggle={() => setAllowMemories((enabled) => !enabled)} />
        <SettingRow icon={<Bell size={17} />} title="Nhắc nhở hoạt động" description="Nhận nhắc nhở về câu hỏi và lịch hẹn." enabled={notifications} onToggle={() => setNotifications((enabled) => !enabled)} />
      </div>
      <div className="couple-ending-card">
        <div className="couple-ending-icon"><HeartOff size={18} /></div>
        <div><strong>Kết thúc Couple</strong><p>Đóng không gian chung và ngừng truy cập các tính năng dành cho hai bạn.</p></div>
        <button className="button button-danger-outline" onClick={() => setConfirmEnding(true)}>Kết thúc</button>
      </div>
      {confirmEnding && (
        <div
          className="modal-backdrop relationship-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !ending)
              setConfirmEnding(false);
          }}
        >
          <section className="relationship-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="end-couple-title">
            <button
              className="modal-close icon-button relationship-confirm-close"
              onClick={() => setConfirmEnding(false)}
              aria-label="Đóng"
              disabled={ending}
            >
              <HeartOff size={17} />
            </button>
            <div className="relationship-goodbye-art couple-goodbye-art" aria-hidden="true">
              <span className="goodbye-heart goodbye-heart-left"><Heart size={25} fill="currentColor" /></span>
              <span className="goodbye-heart goodbye-heart-right"><Heart size={25} fill="currentColor" /></span>
              <span className="goodbye-thread" />
              <Sparkles className="goodbye-sparkle" size={18} />
            </div>
            <span className="eyebrow">MỘT HÀNH TRÌNH ĐẸP ĐÁNG ĐƯỢC TRÂN TRỌNG</span>
            <h3 id="end-couple-title">Mình dừng lại ở đây nhé?</h3>
            <p>Kết thúc Couple sẽ đóng không gian chung và cả hai không còn truy cập các tính năng Couple. Nếu còn chút phân vân, hãy cho hai bạn thêm thời gian.</p>
            <div className="relationship-confirm-actions">
              <button className="button button-outline" disabled={ending} onClick={() => setConfirmEnding(false)}>Ở lại cùng nhau</button>
              <button className="button button-danger" disabled={ending} onClick={() => void confirmEndCouple()}>{ending ? 'Đang kết thúc…' : 'Xác nhận kết thúc'}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function SettingRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="couple-setting-row">
      <span className="couple-setting-icon">{icon}</span>
      <span className="couple-setting-copy"><strong>{title}</strong><small>{description}</small></span>
      <button className={`toggle${enabled ? ' toggle-on' : ''}`} role="switch" aria-checked={enabled} aria-label={title} onClick={onToggle}><span /></button>
    </div>
  );
}

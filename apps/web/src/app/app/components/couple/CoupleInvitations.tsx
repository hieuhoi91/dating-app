'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Check,
  Clock3,
  HeartHandshake,
  Mail,
  X,
} from 'lucide-react';
import type { CoupleInvitation } from './types';

type Props = {
  invitations: CoupleInvitation[];
  isActive: boolean;
  userId: string;
  busy: boolean;
  onSend: (identifier: string) => Promise<void>;
  onRespond: (invitationId: string, accept: boolean) => Promise<void>;
  onCancel: (invitationId: string) => Promise<void>;
};

function displayName(profile: CoupleInvitation['sender'], id: string) {
  return (
    profile?.display_name ||
    (profile?.username
      ? `@${profile.username}`
      : `Thành viên ${id.slice(0, 6)}`)
  );
}

export default function CoupleInvitations({
  invitations,
  isActive,
  userId,
  busy,
  onSend,
  onRespond,
  onCancel,
}: Props) {
  const [identifier, setIdentifier] = useState('');

  async function submitInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier.trim() || busy) return;
    await onSend(identifier.trim());
    setIdentifier('');
  }

  const outgoing = invitations.filter(
    (invitation) =>
      invitation.sender_id === userId && invitation.status === 'pending',
  );
  const incoming = invitations.filter(
    (invitation) =>
      invitation.receiver_id === userId && invitation.status === 'pending',
  );

  return (
    <section className="couple-panel couple-invitation-panel">
      <span className="eyebrow">BẮT ĐẦU TỪ HAI PHÍA</span>
      <h2>Mời người ấy vào Couple</h2>
      <p className="couple-panel-intro">
        Match cho phép trò chuyện với nhiều người; Couple là lựa chọn riêng và
        mỗi tài khoản chỉ tham gia một Couple đang hoạt động. Mời bằng
        Gmail/email đã đăng ký hoặc username, kể cả khi chưa Match. Nếu email
        gắn với tài khoản DATING, người ấy sẽ nhận được thông báo trong ứng
        dụng. Couple chỉ mở khi người nhận chấp thuận.
      </p>

      {isActive ? (
        <div className="couple-success-state">
          <span className="couple-status-icon">
            <Check size={19} />
          </span>
          <div>
            <strong>Couple của hai bạn đang hoạt động</strong>
            <p>Chỉ hai thành viên mới xem được không gian chung.</p>
          </div>
        </div>
      ) : (
        <form
          className="couple-invitation-form"
          onSubmit={(event) => void submitInvitation(event)}
        >
          <label>
            Gmail hoặc tên tài khoản DATING
            <span className="couple-input-wrap">
              <Mail size={16} aria-hidden="true" />
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="gmail@example.com hoặc @tentaikhoan"
                maxLength={254}
                required
              />
            </span>
          </label>
          <button
            className="button button-primary couple-send-button"
            type="submit"
            disabled={busy}
          >
            <HeartHandshake size={17} />{' '}
            {busy ? 'Đang gửi...' : 'Gửi lời mời Couple'}
          </button>
          {/* <div className="couple-privacy-note"><ShieldCheck size={16} /><span>Không tiết lộ liệu email có tài khoản hay không. Mỗi người chỉ có thể tham gia một Couple đang hoạt động.</span></div> */}
        </form>
      )}

      <div className="couple-incoming-empty">
        <strong>Lời mời đến ({incoming.length})</strong>
        {incoming.length ? (
          incoming.map((invitation) => (
            <div className="couple-incoming-card" key={invitation.id}>
              <div className="couple-incoming-person">
                {invitation.sender?.photo_urls?.[0] ? (
                  <Image
                    className="couple-invitation-avatar"
                    src={invitation.sender.photo_urls[0]}
                    alt={`Ảnh đại diện của ${displayName(invitation.sender, invitation.sender_id)}`}
                    width={36}
                    height={36}
                    unoptimized
                  />
                ) : (
                  <span className="couple-status-icon">
                    <HeartHandshake size={18} />
                  </span>
                )}
                <span>
                  <strong>
                    {displayName(invitation.sender, invitation.sender_id)}
                  </strong>
                  <small>
                    {invitation.sender?.username
                      ? `@${invitation.sender.username}`
                      : 'Thành viên DATING'}
                  </small>
                </span>
              </div>
              <p>
                Muốn cùng bạn mở không gian Couple để lưu giữ kỷ niệm chung.
              </p>
              <div className="couple-incoming-actions">
                <button
                  className="button button-outline"
                  disabled={busy}
                  onClick={() => void onRespond(invitation.id, false)}
                >
                  <X size={14} /> Từ chối
                </button>
                <button
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => void onRespond(invitation.id, true)}
                >
                  <Check size={14} /> Chấp nhận lời mời
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>Bạn chưa có lời mời đến.</p>
        )}
      </div>

      <div className="couple-incoming-empty">
        <strong>Lời mời đã gửi ({outgoing.length})</strong>
        {outgoing.length ? (
          outgoing.map((invitation) => (
            <div className="couple-pending-card" key={invitation.id}>
              <span className="couple-status-icon couple-status-pending">
                <Clock3 size={18} />
              </span>
              <div className="couple-pending-copy">
                <strong>
                  Đang chờ{' '}
                  {displayName(invitation.receiver, invitation.receiver_id)} xác
                  nhận
                </strong>
                <p>
                  Hết hạn{' '}
                  {new Date(invitation.expires_at).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <button
                className="button button-quiet couple-cancel-button"
                disabled={busy}
                onClick={() => void onCancel(invitation.id)}
              >
                Hủy lời mời <ArrowRight size={14} />
              </button>
            </div>
          ))
        ) : (
          <p>Bạn chưa gửi lời mời nào đang chờ.</p>
        )}
      </div>
    </section>
  );
}

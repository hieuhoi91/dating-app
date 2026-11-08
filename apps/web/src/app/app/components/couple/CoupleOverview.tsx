import { ArrowRight, Bookmark, Heart, MessageCircleHeart, Star } from 'lucide-react';
import CoupleCommunityFeed from './CoupleCommunityFeed';
import type { CoupleTab } from './types';
import type { CoupleNotice } from './types';

type Props = {
  isActive: boolean;
  coupleId: string | null;
  onNavigate: (tab: CoupleTab) => void;
  notify: CoupleNotice;
};

export default function CoupleOverview({ isActive, coupleId, onNavigate, notify }: Props) {
  if (!isActive) {
    return (
      <section className="couple-empty couple-overview-empty">
        <div className="couple-illustration">
          <div className="couple-orbit orbit-one" />
          <div className="couple-orbit orbit-two" />
          <span className="couple-heart"><Heart size={32} fill="currentColor" /></span>
          <span className="couple-sparkle sparkle-a">✳</span>
          <span className="couple-sparkle sparkle-b">✦</span>
        </div>
        <span className="eyebrow">CHỈ DÀNH CHO HAI NGƯỜI</span>
        <h2>Một góc nhỏ<br /><em>để cùng vun đắp.</em></h2>
        <p>
          Match cho phép bạn trò chuyện với nhiều người. Couple là lựa chọn riêng, mỗi tài khoản chỉ tham gia một Couple đang hoạt động. Mời người ấy bằng email hoặc username; khi cả hai xác nhận, không gian riêng tư sẽ mở ra.
        </p>
        <div className="couple-features">
          <span><MessageCircleHeart size={16} /> Câu hỏi mỗi ngày</span>
          <span><Star size={16} /> Thử thách nhỏ</span>
          <span><Bookmark size={16} /> Kỷ niệm chung</span>
        </div>
        <div className="couple-state">
          <span className="state-lock"><Heart size={15} /></span>
          <span>
            <strong>Không gian đang riêng tư</strong>
            <small>Chỉ mở sau khi cả hai cùng đồng ý tham gia.</small>
          </span>
        </div>
        <button className="button button-primary" onClick={() => onNavigate('invitations')}>
          Mời người ấy vào Couple <ArrowRight size={16} />
        </button>
      </section>
    );
  }

  return (
    <div className="couple-space-overview">
      {coupleId && <CoupleCommunityFeed coupleId={coupleId} notify={notify} />}
    </div>
  );
}

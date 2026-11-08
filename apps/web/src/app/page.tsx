import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Heart,
  LockKeyhole,
  MessageCircleHeart,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { redirectAuthenticatedUser } from "@/lib/auth/redirect-authenticated-user";

const moments = [
  {
    number: "01",
    title: "Là chính mình",
    description:
      "Tạo một hồ sơ thật gần với con người bạn — từ những điều bạn yêu thích đến điều bạn đang tìm kiếm.",
  },
  {
    number: "02",
    title: "Gặp đúng người",
    description:
      "Khám phá những người phù hợp, gửi một tín hiệu chân thành và để sự kết nối bắt đầu tự nhiên.",
  },
  {
    number: "03",
    title: "Cùng vun đắp",
    description:
      "Khi cả hai đã sẵn sàng, một không gian riêng sẽ mở ra cho những câu hỏi và kỷ niệm chung.",
  },
];

async function HomeContent() {
  await redirectAuthenticatedUser();

  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="brand" href="/" aria-label="DATING trang chủ">
          <span className="brand-mark"><Heart size={17} fill="currentColor" /></span>
          <span>DATING<span className="brand-period">.</span></span>
        </Link>
        <nav className="landing-links" aria-label="Điều hướng chính">
          <a href="#how-it-works">Cách hoạt động</a>
          <a href="#our-values">Giá trị của chúng tôi</a>
          <a href="#safety">An toàn</a>
        </nav>
        <div className="landing-actions">
          <Link className="button button-quiet" href="/auth/login">Đăng nhập</Link>
          <Link className="button button-primary nav-cta" href="/auth">Tạo tài khoản <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> MỘT CHÚT GẦN HƠN, MỖI NGÀY</span>
          <h1>Một kết nối<br />chân thành có thể<br /><em>bắt đầu hôm nay.</em></h1>
          <p>
            Gặp gỡ những người khiến bạn muốn lắng nghe thêm một chút.
            Không vội vàng. Không phán xét. Chỉ là những kết nối có ý nghĩa.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/auth">
              Bắt đầu kết nối <ArrowRight size={17} />
            </Link>
            <a className="text-link" href="#how-it-works">Tìm hiểu thêm <ArrowDown size={15} /></a>
          </div>
          <div className="hero-social-proof">
            <div className="avatar-stack">
              {["photo-1534528741775-53994a69daeb", "photo-1500648767791-00dcc994a43e", "photo-1524504388940-b1c1722653e1"].map((id, index) => (
                <span key={id} className={`stack-avatar stack-${index + 1}`} style={{ backgroundImage: `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=96&q=80)` }} />
              ))}
            </div>
            <span><strong>Những kết nối thật</strong><br />bắt đầu từ sự chân thành</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="hero-photo hero-photo-main" role="img" aria-label="Hai người đang trò chuyện trong ánh nắng ấm" />
          <div className="hero-photo hero-photo-small" role="img" aria-label="Một nụ cười tự nhiên" />
          <div className="hero-note">
            <span className="note-icon"><Heart size={17} fill="currentColor" /></span>
            <span><strong>Một sự đồng điệu mới</strong><small>Đôi khi, chỉ cần bắt đầu bằng một lời chào.</small></span>
          </div>
          <div className="hero-stamp"><span>GẶP GỠ<br />THẬT LÒNG</span><Heart size={17} /></div>
          <span className="hero-sparkle sparkle-one">✳</span>
          <span className="hero-sparkle sparkle-two">✦</span>
        </div>
        <div className="hero-bottom-note"><span>01 — 03</span> KẾT NỐI CÓ CHỦ ĐÍCH</div>
      </section>

      <section className="values-section" id="our-values">
        <div className="section-heading">
          <span className="eyebrow">ĐIỀU CHÚNG TÔI TIN</span>
          <h2>Một mối quan hệ tốt<br />bắt đầu từ <em>cách ta gặp nhau.</em></h2>
        </div>
        <div className="value-grid">
          <article className="value-card">
            <span className="value-icon"><Sparkles size={20} /></span>
            <h3>Kết nối có chủ đích</h3>
            <p>Tìm hiểu nhau bằng những cuộc trò chuyện thật, không phải những lần lướt qua vô tận.</p>
          </article>
          <article className="value-card">
            <span className="value-icon"><UserRoundCheck size={20} /></span>
            <h3>Con người thật</h3>
            <p>Trạng thái xác minh rõ ràng giúp bạn an tâm hơn khi bắt đầu một kết nối mới.</p>
          </article>
          <article className="value-card">
            <span className="value-icon"><LockKeyhole size={20} /></span>
            <h3>Riêng tư, minh bạch</h3>
            <p>Thông tin của bạn thuộc về bạn. Mọi bước tiến đều cần sự đồng thuận từ cả hai.</p>
          </article>
          <article className="value-card">
            <span className="value-icon"><MessageCircleHeart size={20} /></span>
            <h3>Cùng vun đắp</h3>
            <p>Một không gian dành riêng cho những câu hỏi hay và những kỷ niệm chỉ hai người biết.</p>
          </article>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-image" role="img" aria-label="Khoảnh khắc hẹn hò ấm áp">
          <div className="image-caption"><span>NHẸ NHÀNG THÔI</span><strong>Chuyện đẹp<br />cần thời gian.</strong></div>
        </div>
        <div className="how-copy">
          <span className="eyebrow">MỌI THỨ BẮT ĐẦU THẬT ĐƠN GIẢN</span>
          <h2>Chậm một nhịp,<br /><em>gần nhau hơn.</em></h2>
          <div className="steps-list">
            {moments.map((moment) => (
              <article className="step-item" key={moment.number}>
                <span className="step-number">{moment.number}</span>
                <div><h3>{moment.title}</h3><p>{moment.description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="safety-strip" id="safety">
        <div className="safety-icon"><LockKeyhole size={22} /></div>
        <div><span className="eyebrow">AN TOÀN LUÔN ĐI CÙNG KẾT NỐI</span><h2>Ranh giới của bạn luôn được tôn trọng.</h2></div>
        <Link className="text-link" href="/auth">Tìm hiểu về an toàn <ArrowRight size={16} /></Link>
      </section>

      <section className="final-cta">
        <span className="eyebrow">BẠN KHÔNG CẦN PHẢI VỘI</span>
        <h2>Chỉ cần sẵn sàng<br /><em>cho một lời chào.</em></h2>
        <Link className="button button-light button-large" href="/auth">Bắt đầu hành trình <ArrowRight size={17} /></Link>
        <div className="cta-flower">✳</div>
      </section>

      <footer className="landing-footer">
        <Link className="brand" href="/"><span className="brand-mark"><Heart size={16} fill="currentColor" /></span><span>DATING<span className="brand-period">.</span></span></Link>
        <p>Gặp gỡ. Tìm hiểu. Vun đắp.</p>
        <div className="footer-links"><a href="#how-it-works">Cách hoạt động</a><a href="#safety">An toàn</a><a href="#our-values">Quyền riêng tư</a></div>
        <small>© 2026 DATING. Một chút gần hơn, mỗi ngày.</small>
        <span className="footer-check"><Check size={14} /> Một không gian kết nối tử tế</span>
      </footer>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="landing" aria-busy="true" />}>
      <HomeContent />
    </Suspense>
  );
}

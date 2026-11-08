import {
  Bell,
  Compass,
  Heart,
  House,
  LockKeyhole,
  MessageCircle,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";

const navigationIcons = [House, Compass, Heart, MessageCircle, UsersRound, Settings];

export default function AppLoadingScreen() {
  return (
    <main
      className="app-loading-screen"
      aria-label="Đang tải không gian của bạn"
      aria-busy="true"
    >
      <aside className="app-loading-sidebar" aria-hidden="true">
        <div className="brand app-brand">
          <span className="brand-mark">
            <Heart size={16} fill="currentColor" />
          </span>
          <span>
            DATING<span className="brand-period">.</span>
          </span>
        </div>
        <div className="app-loading-profile">
          <span className="app-loading-avatar app-loading-skeleton" />
          <span className="app-loading-profile-copy">
            <span className="app-loading-skeleton app-loading-line" />
            <span className="app-loading-skeleton app-loading-line app-loading-line-short" />
          </span>
        </div>
        <span className="app-loading-label app-loading-skeleton" />
        <nav className="app-loading-nav">
          {navigationIcons.map((Icon, index) => (
            <span
              className={`app-loading-nav-item${index === 0 ? " app-loading-nav-active" : ""}`}
              key={index}
            >
              <Icon size={17} />
              <span className="app-loading-skeleton app-loading-line" />
            </span>
          ))}
        </nav>
        <div className="app-loading-sidebar-footer">
          <LockKeyhole size={14} />
          <span className="app-loading-skeleton app-loading-line" />
        </div>
      </aside>

      <section className="app-loading-main">
        <header className="app-loading-topbar">
          <div className="app-loading-mobile-brand brand">
            <span className="brand-mark">
              <Heart size={15} fill="currentColor" />
            </span>
            DATING<span className="brand-period">.</span>
          </div>
          <span className="app-loading-breadcrumb app-loading-skeleton" />
          <div className="app-loading-topbar-actions" aria-hidden="true">
            <span className="app-loading-search app-loading-skeleton" />
            <Bell size={18} />
            <span className="app-loading-avatar app-loading-avatar-small app-loading-skeleton" />
          </div>
        </header>

        <div className="app-loading-body">
          <div className="app-loading-heading">
            <div>
              <span className="eyebrow">KHÔNG GIAN CỦA BẠN</span>
              <h1>Đang tải không gian của bạn</h1>
              <p>Đang đồng bộ hồ sơ và các kết nối của bạn.</p>
            </div>
            <span className="app-loading-sync">
              <span className="app-loading-spinner" />
              Đang đồng bộ
            </span>
          </div>

          <div className="app-loading-dashboard" aria-hidden="true">
            <section className="app-loading-feature">
              <div className="app-loading-feature-image app-loading-skeleton">
                <span className="app-loading-image-tag">
                  <Sparkles size={14} />
                  GỢI Ý DÀNH CHO BẠN
                </span>
              </div>
              <div className="app-loading-feature-details">
                <div className="app-loading-feature-title">
                  <span className="app-loading-skeleton app-loading-line app-loading-line-title" />
                  <span className="app-loading-skeleton app-loading-line app-loading-line-short" />
                </div>
                <span className="app-loading-feature-action app-loading-skeleton" />
              </div>
            </section>

            <aside className="app-loading-side-cards">
              <section className="app-loading-summary">
                <span className="app-loading-skeleton app-loading-line app-loading-line-short" />
                <span className="app-loading-summary-number app-loading-skeleton" />
                <span className="app-loading-skeleton app-loading-line" />
              </section>
              <section className="app-loading-connections">
                <span className="app-loading-skeleton app-loading-line app-loading-line-title" />
                {[0, 1, 2].map((item) => (
                  <span className="app-loading-person" key={item}>
                    <span className="app-loading-avatar app-loading-skeleton" />
                    <span className="app-loading-person-lines">
                      <span className="app-loading-skeleton app-loading-line" />
                      <span className="app-loading-skeleton app-loading-line app-loading-line-short" />
                    </span>
                  </span>
                ))}
              </section>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

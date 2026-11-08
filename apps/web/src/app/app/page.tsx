'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bookmark,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Crown,
  Ellipsis,
  Heart,
  HeartHandshake,
  House,
  ImagePlus,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MessageCircleHeart,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  ThumbsDown,
  Trash2,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import CoupleWorkspace from './components/CoupleWorkspace';
import CoupleCelebration from './components/couple/CoupleCelebration';
import type { CoupleTab } from './components/couple/types';
import AppLoadingScreen from './AppLoadingScreen';
import {
  ApiRequestError,
  apiRequest,
  apiUpload,
  reportApiError,
} from '@/lib/client-api';
import { getRealtimeSocket } from '@/lib/realtime';

type ViewId =
  | 'discover'
  | 'likes'
  | 'matches'
  | 'messages'
  | 'couple'
  | 'notifications'
  | 'vip'
  | 'profile'
  | 'settings';
const SEASONAL_THEMES = [
  {
    id: 'spring',
    name: 'Mùa xuân',
    description: 'Hồng đào dịu nhẹ, hoa xuân rơi.',
    preview: '✿',
    particles: ['✿', '❀', '✽'],
  },
  {
    id: 'summer',
    name: 'Mùa hạ',
    description: 'Xanh mát trong lành, nắng lấp lánh.',
    preview: '☀',
    particles: ['✦', '✧', '❋'],
  },
  {
    id: 'autumn',
    name: 'Mùa thu',
    description: 'Sắc vàng ấm áp, lá vàng bay.',
    preview: '🍂',
    particles: ['🍂', '🍁', '❧'],
  },
  {
    id: 'winter',
    name: 'Mùa đông',
    description: 'Trắng xanh tinh khôi, tuyết khẽ rơi.',
    preview: '❄',
    particles: ['❄', '❅', '❆'],
  },
] as const;
type SeasonalTheme = (typeof SEASONAL_THEMES)[number]['id'];
type Profile = {
  name: string;
  age: number | null;
  city: string;
  distance: string;
  image: string;
  photos: string[];
  bio: string;
  tags: string[];
  verified: boolean;
  goal: string;
  id?: string;
};
type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string;
  gender?: string;
  bio?: string;
  coarse_location?: string | null;
  verification_status?: string;
  photo_urls?: string[];
  interests?: string[];
};
type AppLike = {
  id: string;
  from_user_id?: string;
  to_user_id?: string;
  created_at?: string;
  profile: PublicProfile | null;
};
type AppMatch = {
  id: string;
  partner_id: string;
  partner: PublicProfile | null;
  conversation: { id: string } | null;
  status: string;
  is_couple?: boolean;
};
type AppConversation = {
  id: string;
  partner_id: string;
  partner: PublicProfile | null;
  latest_message: { content: string; created_at: string } | null;
  unread_count?: number;
  created_at?: string;
  is_couple?: boolean;
};
type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  related_profile?: PublicProfile | null;
};
type DiscoveryQuota = {
  unlimited: boolean;
  daily_limit: number | null;
  viewed_today: number | null;
  remaining: number | null;
  resets_at: string | null;
};
type LikeResult = {
  match_id: string | null;
  matched: boolean;
  conversation_id: string | null;
};
type AppBlock = {
  id: string;
  blocked_id: string;
  created_at: string;
  profile: PublicProfile | null;
};
type OwnProfilePhoto = {
  id: string;
  signedUrl: string;
  is_primary: boolean;
  role: 'avatar' | 'cover' | null;
  sort_order: number;
};
type ProfilePhotoDialog =
  | { mode: 'view'; photoId: string }
  | { mode: 'current-role'; role: 'avatar' | 'cover' };
type ChatMessage = {
  id?: string;
  from: 'me' | 'them';
  text: string;
  time: string;
  createdAt?: string;
  attachmentUrl?: string | null;
  attachmentUrls?: string[];
  uploadProgress?: number;
  uploadFailed?: boolean;
};
type SelectedChatImage = {
  file: File;
  previewUrl: string;
};

function sortConversations(conversations: AppConversation[]) {
  return [...conversations].sort((left, right) => {
    const leftActivity =
      Date.parse(left.latest_message?.created_at ?? left.created_at ?? '') || 0;
    const rightActivity =
      Date.parse(right.latest_message?.created_at ?? right.created_at ?? '') ||
      0;
    return rightActivity - leftActivity;
  });
}

function playLikeSound() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, now);
    oscillator.frequency.setValueAtTime(783.99, now + 0.09);
    oscillator.frequency.setValueAtTime(987.77, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.4);
    oscillator.onended = () => {
      void context.close();
    };
  } catch (error) {
    console.warn('Could not play the like sound.', error);
  }
}

function playNotificationSound() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(740, now);
    oscillator.frequency.setValueAtTime(988, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      void context.close();
    };
    const play = () => {
      oscillator.start();
      oscillator.stop(context.currentTime + 0.38);
    };
    if (context.state === 'suspended') {
      void context
        .resume()
        .then(play)
        .catch((error: unknown) => {
          console.warn('Could not play the notification sound.', error);
          void context.close();
        });
    } else {
      play();
    }
  } catch (error) {
    console.warn('Could not play the notification sound.', error);
  }
}

function createLikeDiagnostic() {
  const startedAt = performance.now();
  return {
    requestId: `like-${Date.now().toString(36)}`,
    durationMs: () => Math.round(performance.now() - startedAt),
  };
}

function sameData(left: unknown, right: unknown) {
  const normalizeSignedUrl = (_key: string, value: unknown) => {
    if (typeof value !== 'string' || !value.startsWith('http')) return value;
    try {
      const url = new URL(value);
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return value;
    }
  };
  return (
    JSON.stringify(left, normalizeSignedUrl) ===
    JSON.stringify(right, normalizeSignedUrl)
  );
}

function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(
    current.map((message, index) => [message.id ?? `local-${index}`, message]),
  );
  for (const message of incoming) {
    const key =
      message.id ?? `${message.createdAt}-${message.from}-${message.text}`;
    byId.set(key, message);
  }
  const merged = [...byId.values()].sort((left, right) =>
    (left.createdAt ?? '').localeCompare(right.createdAt ?? ''),
  );
  return sameData(current, merged) ? current : merged;
}

function getSettledValue<T>(
  result: PromiseSettledResult<T>,
  endpoint: string,
  failures: string[],
): T | null {
  if (result.status === 'fulfilled') return result.value;
  const detail =
    result.reason instanceof Error
      ? result.reason.message
      : 'Lỗi không xác định.';
  failures.push(`${endpoint}: ${detail}`);
  return null;
}

function profileCardFromPublic(profile: PublicProfile | null): Profile {
  return {
    name:
      profile?.display_name ||
      (profile?.username ? `@${profile.username}` : 'Thành viên DATING'),
    age: null,
    city: profile?.coarse_location || 'Khu vực chưa chia sẻ',
    distance: 'Khu vực gần đúng',
    image: profile?.photo_urls?.[0] ?? '',
    photos: profile?.photo_urls ?? [],
    bio: profile?.bio || '',
    tags: profile?.interests ?? [],
    verified: profile?.verification_status === 'verified',
    goal: 'Đang tìm hiểu',
    id: profile?.id,
  };
}

const navGroups: {
  label?: string;
  items: { id: ViewId; label: string; icon: LucideIcon; badge?: string }[];
}[] = [
  {
    items: [
      { id: 'discover', label: 'Khám phá', icon: Compass },
      { id: 'likes', label: 'Lượt thích', icon: Heart, badge: '3' },
      { id: 'matches', label: 'Kết nối', icon: HeartHandshake },
    ],
  },
  {
    label: 'GẮN KẾT',
    items: [
      { id: 'messages', label: 'Tin nhắn', icon: MessageCircle },
      { id: 'couple', label: 'Không gian Couple', icon: UsersRound },
    ],
  },
  {
    label: 'CÁ NHÂN',
    items: [
      { id: 'notifications', label: 'Thông báo', icon: Bell },
      { id: 'vip', label: 'DATING Plus', icon: Crown },
      { id: 'profile', label: 'Hồ sơ của tôi', icon: UserRound },
      { id: 'settings', label: 'Cài đặt', icon: Settings },
    ],
  },
];

const navTitles: Record<ViewId, { title: string; subtitle: string }> = {
  discover: {
    title: 'Khám phá',
    subtitle: 'Một kết nối chân thành có thể bắt đầu từ hôm nay.',
  },
  likes: {
    title: 'Lượt thích',
    subtitle: 'Những người đang muốn tìm hiểu bạn.',
  },
  matches: {
    title: 'Kết nối',
    subtitle: 'Khi hai người cùng chọn tìm hiểu nhau.',
  },
  messages: {
    title: 'Tin nhắn',
    subtitle: 'Cuộc trò chuyện là nơi những điều đẹp đẽ bắt đầu.',
  },
  couple: {
    title: 'Không gian Couple',
    subtitle: 'Một không gian riêng, chỉ dành cho hai người.',
  },
  notifications: {
    title: 'Thông báo',
    subtitle: 'Những cập nhật mới trong hành trình kết nối của bạn.',
  },
  vip: {
    title: 'DATING Plus',
    subtitle: 'Thêm lựa chọn, vẫn luôn theo cách của bạn.',
  },
  profile: {
    title: 'Hồ sơ của tôi',
    subtitle: 'Để người phù hợp nhìn thấy con người thật của bạn.',
  },
  settings: {
    title: 'Cài đặt',
    subtitle: 'Bạn luôn có quyền lựa chọn điều mình chia sẻ.',
  },
};

function Avatar({
  image,
  className = '',
}: {
  image: string;
  className?: string;
}) {
  return (
    <span
      className={`avatar ${className}`}
      style={{
        backgroundImage: image
          ? image.startsWith('http')
            ? `url(${image})`
            : `url(https://images.unsplash.com/${image}?auto=format&fit=crop&w=160&q=85)`
          : undefined,
      }}
    />
  );
}

function ProfileCard({
  profile,
  onLike,
  onSkip,
  onDetails,
  onBookmark,
}: {
  profile: Profile;
  onLike: () => void;
  onSkip: () => void;
  onDetails: () => void;
  onBookmark: () => void;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = profile.photos.length
    ? profile.photos
    : profile.image
      ? [profile.image]
      : [];
  const movePhoto = (direction: number) =>
    setPhotoIndex((index) =>
      photos.length ? (index + direction + photos.length) % photos.length : 0,
    );

  return (
    <article className="discover-card">
      <div
        className="discover-photo"
        style={{
          backgroundImage: photos[photoIndex]?.startsWith('http')
            ? `url(${photos[photoIndex]})`
            : photos[photoIndex]
              ? `url(https://images.unsplash.com/${photos[photoIndex]}?auto=format&fit=crop&w=1100&q=90)`
              : undefined,
        }}
      >
        <div className="photo-shade" />
        <div className="photo-topline">
          <span className="photo-counter">
            <span />{' '}
            {photos.length
              ? `Ảnh ${photoIndex + 1} / ${photos.length}`
              : 'Chưa có ảnh'}
          </span>
          <button
            className="icon-button glass-button"
            onClick={onBookmark}
            aria-label="Thêm vào danh sách yêu thích"
          >
            <Bookmark size={18} />
          </button>
        </div>
        <div className="photo-bottom">
          <div className="profile-name-row">
            <h2>
              {profile.name}
              {profile.age ? `, ${profile.age}` : ''}
            </h2>
            {profile.verified && (
              <span className="verified-badge" title="Đã xác minh người thật">
                <BadgeCheck size={18} fill="currentColor" />
              </span>
            )}
          </div>
          <span className="photo-location">
            <MapPin size={14} /> {profile.city}
          </span>
        </div>
        {photos.length > 1 && (
          <div className="photo-arrows">
            <button
              className="icon-button glass-button"
              onClick={() => movePhoto(-1)}
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button glass-button"
              onClick={() => movePhoto(1)}
              aria-label="Ảnh tiếp theo"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
      <div className="discover-info">
        <div className="profile-summary">
          <span className="distance">
            <MapPin size={13} /> {profile.distance}
          </span>
          <span className="profile-goal">{profile.goal}</span>
        </div>
        <p className="profile-bio">{profile.bio}</p>
        <div className="tag-row">
          {profile.tags.map((tag) => (
            <span className="interest-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <div className="discover-actions">
          <button
            className="round-action action-skip"
            onClick={onSkip}
            aria-label="Bỏ qua hồ sơ"
          >
            <X size={21} />
          </button>
          <button
            className="button button-outline profile-detail-button"
            onClick={onDetails}
          >
            Xem hồ sơ
          </button>
          <button
            className="round-action action-like"
            onClick={onLike}
            aria-label="Gửi lượt thích"
          >
            <Heart size={20} fill="currentColor" />
          </button>
        </div>
        <div className="discover-hint">
          <span>← Bỏ qua</span>
          <span>Một lời chào nhỏ có thể mở ra điều hay →</span>
        </div>
      </div>
    </article>
  );
}

export default function AppPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewId>('discover');
  const [currentPerson, setCurrentPerson] = useState(0);
  const [toast, setToast] = useState('');
  const [booting, setBooting] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [userId, setUserId] = useState('');
  const [myProfile, setMyProfile] = useState<{
    id: string;
    username: string | null;
    display_name: string;
    date_of_birth: string | null;
    gender: string | null;
    bio: string;
    coarse_location: string | null;
    cover_photo_id: string | null;
    verification_status: string;
    is_complete: boolean;
  } | null>(null);
  const [myPhoto, setMyPhoto] = useState('');
  const [myCoverPhoto, setMyCoverPhoto] = useState('');
  const [myPhotos, setMyPhotos] = useState<OwnProfilePhoto[]>([]);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileEditorBusy, setProfileEditorBusy] = useState(false);
  const [profileEditorError, setProfileEditorError] = useState('');
  const [profileCoverAvailable, setProfileCoverAvailable] = useState(true);
  const [profileDraft, setProfileDraft] = useState({
    displayName: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    bio: '',
  });
  const [profileDraftInterests, setProfileDraftInterests] = useState<string[]>(
    [],
  );
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const profileRolePhotoInputRef = useRef<HTMLInputElement>(null);
  const [pendingProfilePhotoRole, setPendingProfilePhotoRole] = useState<
    'avatar' | 'cover' | null
  >(null);
  const [profilePhotoDialog, setProfilePhotoDialog] =
    useState<ProfilePhotoDialog | null>(null);
  const [discoveryProfiles, setDiscoveryProfiles] = useState<Profile[]>([]);
  const [discoveryQuota, setDiscoveryQuota] = useState<DiscoveryQuota>({
    unlimited: false,
    daily_limit: 20,
    viewed_today: 0,
    remaining: 20,
    resets_at: null,
  });
  const [likeData, setLikeData] = useState<{
    received: AppLike[];
    sent: AppLike[];
  }>({ received: [], sent: [] });
  const [matchData, setMatchData] = useState<AppMatch[]>([]);
  const [conversationData, setConversationData] = useState<AppConversation[]>(
    [],
  );
  const [notificationData, setNotificationData] = useState<AppNotification[]>(
    [],
  );
  const [blockedAccounts, setBlockedAccounts] = useState<AppBlock[]>([]);
  const [selectedConversation, setSelectedConversation] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [realtimeConversationId, setRealtimeConversationId] = useState<
    string | null
  >(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [selectedChatImages, setSelectedChatImages] = useState<
    SelectedChatImage[]
  >([]);
  const selectedChatImagesRef = useRef<SelectedChatImage[]>([]);
  const [chatImageViewer, setChatImageViewer] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [chatImageIndexes, setChatImageIndexes] = useState<
    Record<string, number>
  >({});
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsProfileOverride, setDetailsProfileOverride] =
    useState<Profile | null>(null);
  const [coupleInviteTarget, setCoupleInviteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [sendingCoupleInvite, setSendingCoupleInvite] = useState(false);
  const [incomingCoupleInvitation, setIncomingCoupleInvitation] =
    useState<AppNotification | null>(null);
  const [incomingLikeNotice, setIncomingLikeNotice] =
    useState<AppNotification | null>(null);
  const [coupleCelebration, setCoupleCelebration] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [coupleWorkspaceTab, setCoupleWorkspaceTab] =
    useState<CoupleTab>('space');
  const [coupleWorkspaceOpened, setCoupleWorkspaceOpened] = useState(false);
  const [showSentLikes, setShowSentLikes] = useState(false);
  const [matchCelebration, setMatchCelebration] = useState<{
    partnerId: string;
    conversationId: string | null;
    name: string;
    image: string;
  } | null>(null);
  const [openingConversation, setOpeningConversation] = useState(false);
  const [likeActionInProgress, setLikeActionInProgress] = useState<
    string | null
  >(null);
  const [safetyTarget, setSafetyTarget] = useState<{
    id: string;
    name: string;
    matchId?: string;
  } | null>(null);
  const [matchRemovalTarget, setMatchRemovalTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [removingMatch, setRemovingMatch] = useState(false);
  const [reportReason, setReportReason] = useState('Nội dung không phù hợp');
  const [reportDescription, setReportDescription] = useState('');
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    'privacy' | 'notifications' | 'blocked' | 'appearance'
  >('privacy');
  const [seasonalTheme, setSeasonalTheme] = useState<SeasonalTheme>('spring');
  const seasonalThemeMounted = useRef(false);
  const [notificationFilter, setNotificationFilter] = useState<
    'all' | 'connections' | 'messages' | 'system'
  >('all');
  const [currentPlan, setCurrentPlan] = useState('Free');
  const [settings, setSettings] = useState({
    discoverable: true,
    location: true,
    messages: true,
    matches: true,
  });
  const [discoveryPreferences, setDiscoveryPreferences] = useState({
    interested_in: [] as string[],
    age_min: 18,
    age_max: 99,
    max_distance_km: 500,
  });
  const liveRefreshInFlight = useRef(false);
  const liveRefreshQueued = useRef(false);
  const knownNotificationIds = useRef(new Set<string>());
  const viewedProfileIds = useRef(new Set<string>());
  const messageListRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const refocusMessageInput = useRef(false);
  const galleryPhotos = myPhotos.filter(
    (photo) =>
      photo.role === null &&
      !photo.is_primary &&
      photo.id !== myProfile?.cover_photo_id,
  );
  const unreadMessageCount = conversationData.reduce(
    (total, conversation) => total + (conversation.unread_count ?? 0),
    0,
  );
  const unreadNotificationCount = notificationData.filter(
    (notification) => !notification.read_at,
  ).length;

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  const showMatchNotification = useCallback(
    (notification: AppNotification) => {
      const partner = notification.related_profile;
      if (!partner) return;
      const person = profileCardFromPublic(partner);
      setMatchCelebration({
        partnerId: partner.id,
        conversationId: null,
        name: person.name,
        image: person.image,
      });
    },
    [],
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      try {
        const savedTheme = window.localStorage.getItem('dating-season-theme');
        const matchedTheme = SEASONAL_THEMES.find(
          (theme) => theme.id === savedTheme,
        );
        if (matchedTheme) {
          document.documentElement.dataset.season = matchedTheme.id;
          setSeasonalTheme(matchedTheme.id);
        }
      } catch {
        notify('Không thể tải giao diện đã lưu trên thiết bị này.');
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [notify]);

  useLayoutEffect(() => {
    if (!seasonalThemeMounted.current) {
      seasonalThemeMounted.current = true;
      return;
    }
    document.documentElement.dataset.season = seasonalTheme;
  }, [seasonalTheme]);

  const selectSeasonalTheme = (theme: SeasonalTheme) => {
    setSeasonalTheme(theme);
    try {
      window.localStorage.setItem('dating-season-theme', theme);
    } catch {
      notify('Đã đổi giao diện nhưng không thể lưu lựa chọn trên thiết bị.');
    }
  };

  useEffect(() => {
    if (activeView !== 'notifications') return;
    void apiRequest('/api/notifications/read-all', { method: 'PATCH' })
      .then(() => {
        setNotificationData((items) =>
          items.map((item) =>
            item.read_at
              ? item
              : { ...item, read_at: new Date().toISOString() },
          ),
        );
      })
      .catch((error: unknown) => reportApiError(error, notify));
  }, [activeView, notify]);

  const refreshAppData = useCallback(async () => {
    const account = await apiRequest<{
      profile: {
        id: string;
        username: string | null;
        display_name: string;
        date_of_birth: string | null;
        gender: string | null;
        bio: string;
        coarse_location: string | null;
        cover_photo_id: string | null;
        verification_status: string;
        is_complete: boolean;
      };
    }>('/api/me');
    if (!account.profile.is_complete) {
      router.replace('/app/onboarding');
      return;
    }
    const results = await Promise.allSettled([
      apiRequest<{
        profiles: {
          id: string;
          display_name: string;
          age: number;
          username: string | null;
          gender: string;
          bio: string;
          coarse_location: string | null;
          verification_status: string;
          interests: string[];
          photo_urls: string[];
        }[];
        discovery: DiscoveryQuota;
      }>('/api/discovery'),
      apiRequest<{ received: AppLike[]; sent: AppLike[] }>('/api/likes'),
      apiRequest<{ matches: AppMatch[] }>('/api/matches'),
      apiRequest<{ conversations: typeof conversationData }>(
        '/api/conversations',
      ),
      apiRequest<{ notifications: AppNotification[] }>('/api/notifications'),
      apiRequest<{ photos: OwnProfilePhoto[] }>('/api/profile/photos'),
      apiRequest<{
        preferences: {
          interested_in: string[];
          interests: string[];
          age_min: number;
          age_max: number;
          max_distance_km: number;
        };
      }>('/api/preferences'),
      apiRequest<{
        settings: {
          profile_visibility: 'discoverable' | 'hidden';
          push_enabled: boolean;
          email_enabled: boolean;
          privacy_preferences: Record<string, boolean>;
        };
      }>('/api/settings'),
      apiRequest<{ blocks: AppBlock[] }>('/api/blocks'),
      apiRequest<{ subscriptions: { plan_code: string; status: string }[] }>(
        '/api/subscriptions',
      ),
    ]);
    const failures: string[] = [];
    const [
      discoveryResult,
      likesResult,
      matchesResult,
      conversationsResult,
      notificationsResult,
      photosResult,
      preferencesResult,
      settingsResult,
      blocksResult,
      subscriptionsResult,
    ] = results;
    const discovery = getSettledValue(
      discoveryResult,
      '/api/discovery',
      failures,
    );
    const likes = getSettledValue(likesResult, '/api/likes', failures);
    const matches = getSettledValue(matchesResult, '/api/matches', failures);
    const conversations = getSettledValue(
      conversationsResult,
      '/api/conversations',
      failures,
    );
    const notifications = getSettledValue(
      notificationsResult,
      '/api/notifications',
      failures,
    );
    const photos = getSettledValue(
      photosResult,
      '/api/profile/photos',
      failures,
    );
    const preferences = getSettledValue(
      preferencesResult,
      '/api/preferences',
      failures,
    );
    const savedSettings = getSettledValue(
      settingsResult,
      '/api/settings',
      failures,
    );
    const blocks = getSettledValue(blocksResult, '/api/blocks', failures);
    const subscriptions = getSettledValue(
      subscriptionsResult,
      '/api/subscriptions',
      failures,
    );
    const activeMatchIds = new Set(
      (matches?.matches ?? [])
        .filter((match) => match.status === 'active')
        .map((match) => match.partner_id),
    );
    setUserId((current) =>
      current === account.profile.id ? current : account.profile.id,
    );
    setMyProfile((current) =>
      sameData(current, account.profile) ? current : account.profile,
    );
    if (discovery) {
      setDiscoveryQuota(discovery.discovery);
      const profiles = discovery.profiles
        .filter((profile) => !activeMatchIds.has(profile.id))
        .map((profile) => ({
          id: profile.id,
          name: profile.display_name,
          age: profile.age,
          city: profile.coarse_location || 'Khu vực chưa chia sẻ',
          distance: 'Khu vực gần đúng',
          image: profile.photo_urls[0] ?? '',
          photos: profile.photo_urls,
          bio: profile.bio,
          tags: profile.interests ?? [],
          verified: profile.verification_status === 'verified',
          goal: 'Đang tìm hiểu',
        }));
      setDiscoveryProfiles((current) =>
        sameData(current, profiles) ? current : profiles,
      );
    }
    if (likes)
      setLikeData((current) => (sameData(current, likes) ? current : likes));
    if (matches)
      setMatchData((current) =>
        sameData(current, matches.matches) ? current : matches.matches,
      );
    if (conversations)
      setConversationData((current) =>
        sameData(current, conversations.conversations)
          ? current
          : conversations.conversations,
      );
    if (notifications) {
      notifications.notifications.forEach((notification) =>
        knownNotificationIds.current.add(notification.id),
      );
      setNotificationData((current) =>
        sameData(current, notifications.notifications)
          ? current
          : notifications.notifications,
      );
    }
    if (blocks)
      setBlockedAccounts((current) =>
        sameData(current, blocks.blocks) ? current : blocks.blocks,
      );
    if (subscriptions) {
      const plan =
        subscriptions.subscriptions.find(
          (subscription) => subscription.status === 'active',
        )?.plan_code ?? 'Free';
      setCurrentPlan((current) => (current === plan ? current : plan));
    }
    if (photos) {
      setMyPhotos((current) =>
        sameData(current, photos.photos) ? current : photos.photos,
      );
      const photo =
        photos.photos.find((item) => item.role === 'avatar' || item.is_primary)
          ?.signedUrl ?? '';
      setMyPhoto((current) => (current === photo ? current : photo));
      const coverPhoto =
        photos.photos.find((item) => item.id === account.profile.cover_photo_id)
          ?.signedUrl ?? '';
      setMyCoverPhoto((current) =>
        current === coverPhoto ? current : coverPhoto,
      );
    }
    if (preferences)
      setMyInterests((current) =>
        sameData(current, preferences.preferences.interests ?? [])
          ? current
          : (preferences.preferences.interests ?? []),
      );
    if (preferences)
      setDiscoveryPreferences({
        interested_in: preferences.preferences.interested_in ?? [],
        age_min: preferences.preferences.age_min,
        age_max: preferences.preferences.age_max,
        max_distance_km:
          preferences.preferences.max_distance_km >= 500
            ? 500
            : Math.min(preferences.preferences.max_distance_km, 50),
      });
    if (savedSettings) {
      const nextSettings = {
        discoverable:
          savedSettings.settings.profile_visibility === 'discoverable',
        location:
          savedSettings.settings.privacy_preferences?.show_coarse_location ??
          true,
        messages: savedSettings.settings.push_enabled,
        matches: savedSettings.settings.email_enabled,
      };
      setSettings((current) =>
        sameData(current, nextSettings) ? current : nextSettings,
      );
    }
    setLoadErrors((current) =>
      sameData(current, failures) ? current : failures,
    );
  }, [router]);

  const refreshLiveData = useCallback(async () => {
    if (liveRefreshInFlight.current) {
      liveRefreshQueued.current = true;
      return;
    }
    liveRefreshInFlight.current = true;
    try {
      const results = await Promise.allSettled([
        apiRequest<{
          profiles: {
            id: string;
            display_name: string;
            age: number;
            username: string | null;
            gender: string;
            bio: string;
            coarse_location: string | null;
            verification_status: string;
            interests: string[];
            photo_urls: string[];
          }[];
          discovery: DiscoveryQuota;
        }>('/api/discovery'),
        apiRequest<{ received: AppLike[]; sent: AppLike[] }>('/api/likes'),
        apiRequest<{ matches: AppMatch[] }>('/api/matches'),
        apiRequest<{ conversations: AppConversation[] }>('/api/conversations'),
        apiRequest<{ notifications: AppNotification[] }>('/api/notifications'),
      ]);
      const [
        discoveryResult,
        likesResult,
        matchesResult,
        conversationsResult,
        notificationsResult,
      ] = results;
      const failedRequests = results.flatMap((result, index) => {
        if (result.status === 'fulfilled') return [];
        const endpoints = [
          '/api/discovery',
          '/api/likes',
          '/api/matches',
          '/api/conversations',
          '/api/notifications',
        ];
        const error =
          result.reason instanceof Error
            ? result.reason.message
            : 'Lỗi không xác định.';
        return [{ endpoint: endpoints[index], error }];
      });
      if (failedRequests.some(({ error }) => error.includes('đăng nhập'))) {
        router.replace('/auth/login');
        return;
      }
      if (failedRequests.length)
        console.error('Background app sync failed', failedRequests);

      if (
        discoveryResult.status === 'fulfilled' &&
        matchesResult.status === 'fulfilled'
      ) {
        setDiscoveryQuota(discoveryResult.value.discovery);
        const activeMatchIds = new Set(
          matchesResult.value.matches
            .filter((match) => match.status === 'active')
            .map((match) => match.partner_id),
        );
        const incoming = discoveryResult.value.profiles
          .map((profile) => ({
            id: profile.id,
            name: profile.display_name,
            age: profile.age,
            city: profile.coarse_location || 'Khu vực chưa chia sẻ',
            distance: 'Khu vực gần đúng',
            image: profile.photo_urls[0] ?? '',
            photos: profile.photo_urls,
            bio: profile.bio,
            tags: profile.interests ?? [],
            verified: profile.verification_status === 'verified',
            goal: 'Đang tìm hiểu',
          }))
          .filter((profile) => !activeMatchIds.has(profile.id));
        setDiscoveryProfiles((current) => {
          const visibleCurrent = current.filter(
            (profile) => !profile.id || !activeMatchIds.has(profile.id),
          );
          const knownIds = new Set(visibleCurrent.map((profile) => profile.id));
          const newProfiles = incoming.filter(
            (profile) => profile.id && !knownIds.has(profile.id),
          );
          const updated = newProfiles.length
            ? [...visibleCurrent, ...newProfiles]
            : visibleCurrent;
          return sameData(current, updated) ? current : updated;
        });
      }
      if (likesResult.status === 'fulfilled') {
        const likes = likesResult.value;
        setLikeData((current) => (sameData(current, likes) ? current : likes));
      }
      if (matchesResult.status === 'fulfilled') {
        const matches = matchesResult.value.matches;
        setMatchData((current) =>
          sameData(current, matches) ? current : matches,
        );
        const activeMatchIds = new Set(
          matches
            .filter((match) => match.status === 'active')
            .map((match) => match.partner_id),
        );
        if (activeMatchIds.size) {
          setDiscoveryProfiles((current) => {
            const updated = current.filter(
              (profile) => !profile.id || !activeMatchIds.has(profile.id),
            );
            return updated.length === current.length ? current : updated;
          });
        }
      }
      if (conversationsResult.status === 'fulfilled') {
        const conversations = conversationsResult.value.conversations;
        setConversationData((current) =>
          sameData(current, conversations) ? current : conversations,
        );
      }
      if (notificationsResult.status === 'fulfilled') {
        const notifications = notificationsResult.value.notifications;
        const newNotifications = notifications.filter(
          (notification) => !knownNotificationIds.current.has(notification.id),
        );
        notifications.forEach((notification) =>
          knownNotificationIds.current.add(notification.id),
        );
        setNotificationData((current) =>
          sameData(current, notifications) ? current : notifications,
        );
        if (newNotifications.length) {
          const newestNotification = newNotifications[0];
          if (newestNotification.type === 'match') {
            showMatchNotification(newestNotification);
          }
          notify(newestNotification.title || 'Bạn có thông báo mới.');
        }
      }
    } finally {
      liveRefreshInFlight.current = false;
      if (liveRefreshQueued.current) {
        liveRefreshQueued.current = false;
        void refreshLiveData();
      }
    }
  }, [notify, router, showMatchNotification]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => refreshAppData())
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof Error && error.message.includes('đăng nhập'))
          router.replace('/auth/login');
        else {
          const message =
            error instanceof Error
              ? error.message
              : 'Không thể tải dữ liệu tài khoản.';
          setLoadErrors([`/api/me: ${message}`]);
          reportApiError(error, notify);
        }
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, [notify, refreshAppData, router]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    let refreshTimer: number | undefined;
    const fallbackTimer = window.setInterval(() => {
      if (active && document.visibilityState === 'visible')
        void refreshLiveData();
    }, 30_000);
    let socket: Awaited<ReturnType<typeof getRealtimeSocket>> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        if (active) void refreshLiveData();
      }, 150);
    };
    const handleMatchChange = (match: { id: string; status: string }) => {
      scheduleRefresh();
      if (match.status !== 'active') return;

      void apiRequest<{ matches: AppMatch[] }>('/api/matches')
        .then(({ matches }) => {
          if (!active) return;
          const createdMatch = matches.find((item) => item.id === match.id);
          if (!createdMatch?.partner) return;
          const person = profileCardFromPublic(createdMatch.partner);
          if (createdMatch.is_couple) {
            setCoupleCelebration(
              (current) =>
                current ?? {
                  title: 'Hai bạn đã trở thành Couple!',
                  message: `${person.name} đã chấp nhận lời mời. Không gian Couple của hai bạn đã mở.`,
                },
            );
            return;
          }

          setMatchCelebration(
            (current) =>
              current ?? {
                partnerId: createdMatch.partner_id,
                conversationId: createdMatch.conversation?.id ?? null,
                name: person.name,
                image: person.image,
              },
          );
        })
        .catch((error: unknown) => {
          if (active) reportApiError(error, notify);
        });
    };
    const handleNotification = (notification: AppNotification) => {
      if (
        notification.id &&
        !knownNotificationIds.current.has(notification.id)
      ) {
        knownNotificationIds.current.add(notification.id);
        setNotificationData((current) =>
          [
            notification,
            ...current.filter((item) => item.id !== notification.id),
          ].slice(0, 50),
        );
        const isCoupleAccepted =
          notification.type === 'couple.invitation.accepted';
        const isIncomingLike = notification.type === 'like';
        if (!isCoupleAccepted) playNotificationSound();
        if (!isIncomingLike && notification.type !== 'match') {
          notify(notification.title || 'Bạn có thông báo mới.');
        }
        if (isIncomingLike) {
          void apiRequest<{ notifications: AppNotification[] }>(
            '/api/notifications',
          )
            .then(({ notifications }) => {
              if (!active) return;
              setNotificationData((current) =>
                sameData(current, notifications) ? current : notifications,
              );
              const enriched = notifications.find(
                (item) => item.id === notification.id,
              );
              if (enriched?.related_profile) {
                setIncomingLikeNotice(enriched);
              } else {
                notify(notification.title || 'Bạn có một lượt thích mới.');
              }
            })
            .catch((error: unknown) => {
              if (active) reportApiError(error, notify);
            });
        }
        if (notification.type === 'couple.invitation') {
          setIncomingCoupleInvitation(notification);
          void apiRequest<{ notifications: AppNotification[] }>(
            '/api/notifications',
          )
            .then(({ notifications }) => {
              if (!active) return;
              setNotificationData((current) =>
                sameData(current, notifications) ? current : notifications,
              );
              const enriched = notifications.find(
                (item) => item.id === notification.id,
              );
              if (enriched) setIncomingCoupleInvitation(enriched);
            })
            .catch((error: unknown) => {
              if (active) reportApiError(error, notify);
            });
        }
        if (notification.type.startsWith('couple.invitation'))
          window.dispatchEvent(new Event('couple-workspace-refresh'));
        if (isCoupleAccepted)
          setCoupleCelebration({
            title: notification.title || 'Hai bạn đã trở thành Couple!',
            message: notification.body,
          });
      }
      scheduleRefresh();
    };
    const handleCoupleUpdate = () => {
      window.dispatchEvent(new Event('couple-workspace-refresh'));
      window.dispatchEvent(new Event('couple-feed-refresh'));
      scheduleRefresh();
    };

    void getRealtimeSocket()
      .then((connectedSocket) => {
        if (!active) return;
        socket = connectedSocket;
        socket.on('engagement:updated', scheduleRefresh);
        socket.on('engagement:match', handleMatchChange);
        socket.on('notification:new', handleNotification);
        socket.on('chat:message', scheduleRefresh);
        socket.on('couple:updated', handleCoupleUpdate);
      })
      .catch((error: unknown) => {
        if (active) reportApiError(error, notify);
      });

    return () => {
      active = false;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
      socket?.off('engagement:updated', scheduleRefresh);
      socket?.off('engagement:match', handleMatchChange);
      socket?.off('notification:new', handleNotification);
      socket?.off('chat:message', scheduleRefresh);
      socket?.off('couple:updated', handleCoupleUpdate);
    };
  }, [notify, refreshLiveData, userId]);

  const currentProfile = discoveryProfiles[currentPerson] ?? null;
  useEffect(() => {
    if (activeView !== 'discover' || !currentProfile?.id) return;
    const profileId = currentProfile.id;
    if (viewedProfileIds.current.has(profileId)) return;
    viewedProfileIds.current.add(profileId);
    void apiRequest<{
      recorded: boolean;
      discovery: DiscoveryQuota;
    }>('/api/discovery/views', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: profileId }),
    })
      .then(({ recorded, discovery }) => {
        setDiscoveryQuota((current) => {
          if (
            current.resets_at === discovery.resets_at &&
            current.viewed_today !== null &&
            discovery.viewed_today !== null &&
            current.viewed_today > discovery.viewed_today
          ) {
            return current;
          }
          return discovery;
        });
        if (!recorded && !discovery.unlimited && discovery.remaining === 0) {
          setDiscoveryProfiles([]);
          notify('Bạn đã hết lượt khám phá hôm nay.');
        }
      })
      .catch((error: unknown) => reportApiError(error, notify));
  }, [activeView, currentProfile?.id, notify]);
  const detailsProfile = detailsProfileOverride ?? currentProfile;
  const profileCompletion = Math.min(
    100,
    (myProfile ? 40 : 0) + (myPhoto ? 30 : 0) + (myInterests.length ? 30 : 0),
  );
  const activeConversation =
    conversationData.find(
      (conversation) => conversation.id === selectedConversation,
    ) ??
    conversationData[0] ??
    null;
  const activeConversationId = activeConversation?.id;
  const chatProfile = profileCardFromPublic(
    activeConversation?.partner ?? null,
  );

  const scrollMessagesToLatest = useCallback(() => {
    const messageList = messageListRef.current;
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(scrollMessagesToLatest);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeConversationId, activeView, messages, scrollMessagesToLatest]);

  useEffect(() => {
    if (sendingMessage || !refocusMessageInput.current) return;
    refocusMessageInput.current = false;
    messageInputRef.current?.focus();
  }, [sendingMessage]);

  useEffect(() => {
    if (!incomingLikeNotice) return;
    const timeout = window.setTimeout(() => setIncomingLikeNotice(null), 8000);
    return () => window.clearTimeout(timeout);
  }, [incomingLikeNotice]);

  useEffect(
    () => () => {
      selectedChatImagesRef.current.forEach(({ previewUrl }) =>
        URL.revokeObjectURL(previewUrl),
      );
    },
    [],
  );

  useEffect(() => {
    if (!chatImageViewer) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setChatImageViewer(null);
      if (event.key === 'ArrowLeft') {
        setChatImageViewer((current) =>
          current
            ? {
                ...current,
                index:
                  (current.index - 1 + current.images.length) %
                  current.images.length,
              }
            : current,
        );
      }
      if (event.key === 'ArrowRight') {
        setChatImageViewer((current) =>
          current
            ? {
                ...current,
                index: (current.index + 1) % current.images.length,
              }
            : current,
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatImageViewer]);

  useEffect(() => {
    if (!activeConversationId || activeView !== 'messages') return;
    let active = true;
    let messageLoadInFlight = false;
    let messageRefreshQueued = false;
    let socket: Awaited<ReturnType<typeof getRealtimeSocket>> | undefined;
    const loadMessages = async () => {
      if (messageLoadInFlight) {
        messageRefreshQueued = true;
        return;
      }
      messageLoadInFlight = true;
      try {
        const { messages: loaded } = await apiRequest<{
          messages: {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
            attachment_url: string | null;
            attachments?: { url: string }[];
          }[];
        }>(`/api/conversations/${activeConversationId}/messages`);
        if (!active) return;
        setConversationData((current) => {
          const updated = current.map((conversation) =>
            conversation.id === activeConversationId
              ? { ...conversation, unread_count: 0 }
              : conversation,
          );
          return sameData(current, updated) ? current : updated;
        });
        const orderedMessages: ChatMessage[] = loaded
          .slice()
          .reverse()
          .map((message) => ({
            id: message.id,
            from: message.sender_id === userId ? 'me' : 'them',
            text: message.content === 'Đã gửi một ảnh' ? '' : message.content,
            time: new Date(message.created_at).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            createdAt: message.created_at,
            attachmentUrl: message.attachment_url,
            attachmentUrls:
              message.attachments?.map((attachment) => attachment.url) ??
              (message.attachment_url ? [message.attachment_url] : []),
          }));
        setMessages((current) => mergeChatMessages(current, orderedMessages));
        const latest = loaded[0];
        if (latest) {
          setConversationData((current) => {
            const updated = current.map((conversation) =>
              conversation.id === activeConversationId
                ? {
                    ...conversation,
                    latest_message: {
                      content: latest.content,
                      created_at: latest.created_at,
                    },
                  }
                : conversation,
            );
            return sameData(current, updated) ? current : updated;
          });
        }
      } finally {
        messageLoadInFlight = false;
        if (active && messageRefreshQueued) {
          messageRefreshQueued = false;
          void loadMessages().catch((error: unknown) => {
            if (active) reportApiError(error, notify);
          });
        }
      }
    };
    const handleChatMessage = (message: { conversation_id?: string }) => {
      if (message.conversation_id === activeConversationId) {
        void loadMessages().catch((error: unknown) => {
          if (active) reportApiError(error, notify);
        });
      }
    };
    void getRealtimeSocket()
      .then((connectedSocket) => {
        if (!active) return;
        socket = connectedSocket;
        socket.on('chat:message', handleChatMessage);
        setRealtimeConversationId(activeConversationId);
      })
      .catch((error: unknown) => {
        if (active) reportApiError(error, notify);
      });
    const messageRefreshTimer = window.setInterval(() => {
      if (active && document.visibilityState === 'visible')
        void loadMessages().catch((error: unknown) => {
          if (active) reportApiError(error, notify);
        });
    }, 5000);
    void loadMessages().catch((error: unknown) => {
      if (active) reportApiError(error, notify);
    });
    return () => {
      active = false;
      window.clearInterval(messageRefreshTimer);
      setRealtimeConversationId((current) =>
        current === activeConversationId ? null : current,
      );
      socket?.off('chat:message', handleChatMessage);
    };
  }, [activeConversationId, activeView, notify, userId]);

  const moveProfile = async (liked: boolean) => {
    if (!currentProfile?.id) return;
    if (liked) playLikeSound();
    try {
      const { result } = await apiRequest<{ result: LikeResult[] }>(
        '/api/likes',
        {
          method: 'POST',
          body: JSON.stringify({
            targetUserId: currentProfile.id,
            action: liked ? 'like' : 'pass',
          }),
        },
      );
      setDiscoveryProfiles((profiles) =>
        profiles.filter((profile) => profile.id !== currentProfile.id),
      );
      setCurrentPerson(0);
      if (liked && result[0]?.matched) {
        setMatchCelebration({
          partnerId: currentProfile.id,
          conversationId: result[0]?.conversation_id ?? null,
          name: currentProfile.name,
          image: currentProfile.image,
        });
      } else if (liked) notify('Đã gửi lượt thích.');
      else notify('Đã bỏ qua hồ sơ.');
      if (liked) {
        setShowSentLikes(true);
        void refreshLiveData();
      }
    } catch (error) {
      reportApiError(error, notify);
    }
  };

  const reactToUser = async (targetUserId: string, action: 'like' | 'pass') => {
    const diagnostic = createLikeDiagnostic();
    const { requestId } = diagnostic;
    if (likeActionInProgress) {
      console.warn(
        '[likes] action ignored because another reaction is in progress',
        {
          requestId,
          action,
        },
      );
      return;
    }
    const incomingLike = likeData.received.find(
      (like) => like.from_user_id === targetUserId,
    );
    if (!incomingLike) {
      console.warn(
        '[likes] action ignored because the incoming like is no longer in the current list',
        {
          requestId,
          action,
        },
      );
      notify(
        'Lượt thích này đã được xử lý. Hãy tải lại danh sách để xem trạng thái mới nhất.',
      );
      void refreshLiveData();
      return;
    }
    console.info('[likes] submitting reaction', { requestId, action });
    setLikeActionInProgress(targetUserId);
    if (action === 'like') playLikeSound();
    try {
      const { result } = await apiRequest<{ result: LikeResult[] }>(
        '/api/likes',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId, action }),
        },
      );
      const matched = Boolean(result[0]?.matched);
      console.info('[likes] reaction submitted', {
        requestId,
        action,
        durationMs: diagnostic.durationMs(),
        matched,
        hasMatchId: Boolean(result[0]?.match_id),
        hasConversationId: Boolean(result[0]?.conversation_id),
        resultCount: result.length,
      });
      const partner = incomingLike.profile;
      setLikeData((current) => {
        const received = current.received.filter(
          (like) => like.from_user_id !== targetUserId,
        );
        const sent = current.sent.filter(
          (like) => like.to_user_id !== targetUserId,
        );
        if (matched || action === 'pass') return { received, sent };
        const existingSent = current.sent.some(
          (like) => like.to_user_id === targetUserId,
        );
        return {
          received,
          sent: existingSent
            ? current.sent
            : [
                {
                  id: `pending-${targetUserId}`,
                  to_user_id: targetUserId,
                  created_at: new Date().toISOString(),
                  profile: partner,
                },
                ...current.sent,
              ],
        };
      });
      if (matched && action === 'like') {
        const person = profileCardFromPublic(partner);
        const matchId = result[0]?.match_id;
        const conversationId = result[0]?.conversation_id ?? null;
        if (matchId) {
          setMatchData((current) =>
            current.some((match) => match.partner_id === targetUserId)
              ? current
              : [
                  {
                    id: matchId,
                    partner_id: targetUserId,
                    partner,
                    conversation: conversationId
                      ? { id: conversationId }
                      : null,
                    status: 'active',
                  },
                  ...current,
                ],
          );
        }
        setDiscoveryProfiles((current) =>
          current.filter((profile) => profile.id !== targetUserId),
        );
        if (conversationId) {
          setConversationData((current) =>
            current.some((conversation) => conversation.id === conversationId)
              ? current
              : [
                  {
                    id: conversationId,
                    partner_id: targetUserId,
                    partner,
                    latest_message: null,
                  },
                  ...current,
                ],
          );
        }
        setMatchCelebration({
          partnerId: targetUserId,
          conversationId,
          name: person.name,
          image: person.image,
        });
        setShowSentLikes(true);
      } else if (action === 'like' && !matched) {
        notify(
          'Đã gửi lượt thích lại. Nếu hai bạn đã thích nhau, hãy kiểm tra mục Kết nối.',
        );
        setShowSentLikes(true);
      } else {
        notify('Đã bỏ qua lượt thích.');
      }
      void refreshLiveData();
    } catch (error) {
      console.error('[likes] reaction failed', {
        requestId,
        action,
        durationMs: diagnostic.durationMs(),
        status: error instanceof ApiRequestError ? error.status : null,
        diagnosticCode:
          error instanceof ApiRequestError ? error.diagnosticCode : null,
        message: error instanceof Error ? error.message : 'Lỗi không xác định.',
        error,
      });
      reportApiError(error, notify);
    } finally {
      setLikeActionInProgress(null);
    }
  };

  const openMatchedConversation = async (
    partnerId: string,
    conversationId: string | null,
  ) => {
    setOpeningConversation(true);
    try {
      const { conversations } = await apiRequest<{
        conversations: AppConversation[];
      }>('/api/conversations');
      const conversationIndex = conversations.findIndex((conversation) =>
        conversationId
          ? conversation.id === conversationId
          : conversation.partner_id === partnerId,
      );
      if (conversationIndex < 0) {
        throw new Error(
          'Chưa tìm thấy cuộc trò chuyện của Match này. Hãy kiểm tra các PostgreSQL migrations của NestJS API.',
        );
      }
      setConversationData((current) =>
        sameData(current, conversations) ? current : conversations,
      );
      setSelectedConversation(conversations[conversationIndex].id);
      setMobileChatOpen(true);
      setMessages([]);
      setMatchCelebration(null);
      setActiveView('messages');
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setOpeningConversation(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await apiRequest('/api/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ id, read: true }),
      });
      setNotificationData((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, read_at: new Date().toISOString() }
            : item,
        ),
      );
    } catch (error) {
      reportApiError(error, notify);
    }
  };

  const openMatchNotification = (notification: AppNotification) => {
    const partnerId = notification.related_profile?.id;
    if (!partnerId) return;
    showMatchNotification(notification);
    if (!notification.read_at) void markNotificationRead(notification.id);
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      window.location.replace('/auth/login');
    } catch (error) {
      reportApiError(error, notify);
      setSigningOut(false);
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    const next = !settings[key];
    setSettings((current) => ({ ...current, [key]: next }));
    const patch =
      key === 'discoverable'
        ? { profile_visibility: next ? 'discoverable' : 'hidden' }
        : key === 'location'
          ? { privacy_preferences: { show_coarse_location: next } }
          : key === 'messages'
            ? { push_enabled: next }
            : { email_enabled: next };
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      notify('Cài đặt đã được lưu.');
    } catch (error) {
      setSettings((current) => ({ ...current, [key]: !next }));
      reportApiError(error, notify);
    }
  };

  const unblockAccount = async (blockedUserId: string) => {
    try {
      await apiRequest('/api/blocks', {
        method: 'DELETE',
        body: JSON.stringify({ blockedUserId }),
      });
      setBlockedAccounts((current) =>
        current.filter((block) => block.blocked_id !== blockedUserId),
      );
      await refreshLiveData();
      notify('Đã bỏ chặn tài khoản.');
    } catch (error) {
      reportApiError(error, notify);
    }
  };

  const submitSafetyAction = async (action: 'block' | 'report') => {
    if (!safetyTarget || safetyBusy) return;
    setSafetyBusy(true);
    try {
      if (action === 'block') {
        await apiRequest('/api/blocks', {
          method: 'POST',
          body: JSON.stringify({ blockedUserId: safetyTarget.id }),
        });
        await refreshAppData();
        notify(`Đã chặn ${safetyTarget.name}.`);
      } else {
        await apiRequest('/api/reports', {
          method: 'POST',
          body: JSON.stringify({
            reportedUserId: safetyTarget.id,
            reason: reportReason,
            description: reportDescription,
          }),
        });
        notify('Cảm ơn bạn đã gửi báo cáo. Chúng tôi sẽ xem xét.');
      }
      setSafetyTarget(null);
      setReportDescription('');
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setSafetyBusy(false);
    }
  };

  const removeMatch = async () => {
    if (!matchRemovalTarget || removingMatch) return;
    setRemovingMatch(true);
    try {
      await apiRequest(`/api/matches/${matchRemovalTarget.id}`, {
        method: 'DELETE',
      });
      setMatchData((current) =>
        current.filter((match) => match.id !== matchRemovalTarget.id),
      );
      const removedName = matchRemovalTarget.name;
      setMatchRemovalTarget(null);
      notify(`Đã hủy Match với ${removedName}.`);
      try {
        await refreshAppData();
      } catch (error) {
        reportApiError(error, notify);
      }
    } catch (error) {
      reportApiError(error, notify);
    } finally {
      setRemovingMatch(false);
    }
  };

  const replaceSelectedChatImages = (images: SelectedChatImage[]) => {
    const retainedUrls = new Set(images.map(({ previewUrl }) => previewUrl));
    selectedChatImagesRef.current.forEach(({ previewUrl }) => {
      if (!retainedUrls.has(previewUrl)) URL.revokeObjectURL(previewUrl);
    });
    selectedChatImagesRef.current = images;
    setSelectedChatImages(images);
  };

  const sendMessage = async () => {
    const text = messageDraft.trim();
    const conversation = activeConversation;
    const images = selectedChatImages;
    if ((!text && !images.length) || !conversation || sendingMessage) return;
    setSendingMessage(true);
    const pendingId = `pending-${Date.now()}`;
    if (images.length) {
      setMessages((items) =>
        mergeChatMessages(items, [
          {
            id: pendingId,
            from: 'me',
            text,
            time: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            createdAt: new Date().toISOString(),
            attachmentUrls: images.map(({ previewUrl }) => previewUrl),
            uploadProgress: 0,
          },
        ]),
      );
      setMessageDraft('');
      setSelectedChatImages([]);
      selectedChatImagesRef.current = [];
    }
    try {
      type CreateMessageResponse = {
        message: {
          id: string;
          content: string;
          created_at: string;
          attachment_url: string | null;
          attachments?: { url: string }[];
        };
      };
      let response: CreateMessageResponse;
      if (images.length) {
        const form = new FormData();
        form.set('content', text);
        images.forEach(({ file }) => form.append('files', file));
        response = await apiUpload<CreateMessageResponse>(
          `/api/conversations/${conversation.id}/messages`,
          form,
          (uploadProgress) =>
            setMessages((items) =>
              items.map((item) =>
                item.id === pendingId ? { ...item, uploadProgress } : item,
              ),
            ),
        );
      } else {
        response = await apiRequest<CreateMessageResponse>(
          `/api/conversations/${conversation.id}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({ content: text }),
          },
        );
      }
      const { message } = response;
      const newMessage: ChatMessage = {
        id: message.id,
        from: 'me',
        text: message.content === 'Đã gửi một ảnh' ? '' : message.content,
        time: new Date(message.created_at).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: message.created_at,
        attachmentUrl: message.attachment_url,
        attachmentUrls:
          message.attachments?.map((attachment) => attachment.url) ??
          (message.attachment_url ? [message.attachment_url] : []),
      };
      setMessages((items) =>
        mergeChatMessages(
          items.filter((item) => item.id !== pendingId),
          [newMessage],
        ),
      );
      images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      selectedChatImagesRef.current = [];
      setSelectedChatImages([]);
      refocusMessageInput.current = true;
      if (chatImageInputRef.current) chatImageInputRef.current.value = '';
      setMessageDraft('');
    } catch (error) {
      if (images.length) {
        setMessages((items) => items.filter((item) => item.id !== pendingId));
        setSelectedChatImages(images);
        if (selectedChatImagesRef.current.length === 0) {
          selectedChatImagesRef.current = images;
        }
        setMessageDraft((current) => current || text);
      }
      reportApiError(error, notify);
    } finally {
      setSendingMessage(false);
    }
  };

  const renderDiscover = () => (
    <div className="discover-layout">
      <section className="discover-main">
        <div className="discover-intro">
          <div>
            <span className="eyebrow">MỖI NGÀY, MỘT CƠ HỘI MỚI</span>
            <h2>
              Có thể bạn sẽ <em>đồng điệu.</em>
            </h2>
          </div>
          <button
            className={`filter-button ${filterOpen ? 'is-selected' : ''}`}
            onClick={() => setFilterOpen(!filterOpen)}
          >
            <SlidersHorizontal size={17} /> Bộ lọc <ChevronDown size={14} />
          </button>
        </div>
        {filterOpen && (
          <div className="filter-popover">
            <div className="filter-title">
              <strong>Tùy chọn khám phá</strong>
              <button
                className="icon-button"
                onClick={() => setFilterOpen(false)}
                aria-label="Đóng bộ lọc"
              >
                <X size={16} />
              </button>
            </div>
            <label className="filter-gender-field">
              Giới tính
              <select
                value={discoveryPreferences.interested_in[0] ?? ''}
                onChange={(event) =>
                  setDiscoveryPreferences((value) => ({
                    ...value,
                    interested_in: event.target.value
                      ? [event.target.value]
                      : [],
                  }))
                }
              >
                <option value="">Tất cả</option>
                <option value="Nữ">Nữ</option>
                <option value="Nam">Nam</option>
                <option value="Khác">Khác</option>
                <option value="Không muốn chia sẻ">Không muốn chia sẻ</option>
              </select>
            </label>
            <div className="filter-range-group">
              <div className="filter-range-heading">
                <span>Độ tuổi</span>
                <strong>
                  {discoveryPreferences.age_min} –{' '}
                  {discoveryPreferences.age_max === 99
                    ? '99+'
                    : discoveryPreferences.age_max}
                </strong>
              </div>
              <div
                className={`filter-dual-range ${
                  discoveryPreferences.age_min > 80
                    ? 'filter-dual-range-min-upper'
                    : ''
                }`}
              >
                <div className="filter-dual-track">
                  <span
                    className="filter-dual-fill"
                    style={{
                      left: `${((discoveryPreferences.age_min - 18) / 81) * 100}%`,
                      right: `${((99 - discoveryPreferences.age_max) / 81) * 100}%`,
                    }}
                  />
                </div>
                <input
                  type="range"
                  min="18"
                  max="99"
                  step="1"
                  className="filter-age-range filter-age-min"
                  value={discoveryPreferences.age_min}
                  aria-label="Độ tuổi tối thiểu"
                  onChange={(event) =>
                    setDiscoveryPreferences((value) => ({
                      ...value,
                      age_min: Math.min(
                        Number(event.target.value),
                        value.age_max,
                      ),
                    }))
                  }
                />
                <input
                  type="range"
                  min="18"
                  max="99"
                  step="1"
                  className="filter-age-range filter-age-max"
                  value={discoveryPreferences.age_max}
                  aria-label="Độ tuổi tối đa"
                  onChange={(event) =>
                    setDiscoveryPreferences((value) => {
                      const ageMax = Number(event.target.value);
                      return {
                        ...value,
                        age_min: Math.min(value.age_min, ageMax),
                        age_max: ageMax,
                      };
                    })
                  }
                />
              </div>
              <div className="filter-range-limits">
                <span>18 tuổi</span>
                <span>99+</span>
              </div>
            </div>
            <div className="filter-range-field filter-distance-field">
              <span className="filter-range-heading">
                <span>Khoảng cách tối đa</span>
                <strong>
                  {discoveryPreferences.max_distance_km >= 500
                    ? 'Không giới hạn'
                    : `${discoveryPreferences.max_distance_km} km`}
                </strong>
              </span>
              <input
                type="range"
                min="1"
                max="50"
                value={Math.min(discoveryPreferences.max_distance_km, 50)}
                disabled={discoveryPreferences.max_distance_km >= 500}
                aria-label="Khoảng cách tối đa"
                onChange={(event) =>
                  setDiscoveryPreferences((value) => ({
                    ...value,
                    max_distance_km: Number(event.target.value),
                  }))
                }
              />
              <span className="filter-range-limits">
                <span>1 km</span>
                <span>50 km</span>
              </span>
              <label className="filter-unlimited-option">
                <input
                  type="checkbox"
                  checked={discoveryPreferences.max_distance_km >= 500}
                  onChange={(event) =>
                    setDiscoveryPreferences((value) => ({
                      ...value,
                      max_distance_km: event.target.checked
                        ? 500
                        : Math.min(value.max_distance_km, 50),
                    }))
                  }
                />
                <span>Không giới hạn</span>
              </label>
            </div>
            <button
              className="button button-primary filter-apply"
              onClick={async () => {
                try {
                  await apiRequest('/api/preferences', {
                    method: 'PATCH',
                    body: JSON.stringify(discoveryPreferences),
                  });
                  const params = new URLSearchParams({
                    age_min: String(discoveryPreferences.age_min),
                    age_max: String(discoveryPreferences.age_max),
                    max_distance_km: String(
                      discoveryPreferences.max_distance_km,
                    ),
                  });
                  const gender = discoveryPreferences.interested_in[0];
                  if (gender) params.set('gender', gender);
                  const filtered = await apiRequest<{
                    profiles: {
                      id: string;
                      display_name: string;
                      age: number;
                      gender: string;
                      bio: string;
                      coarse_location: string | null;
                      verification_status: string;
                      interests: string[];
                      photo_urls: string[];
                    }[];
                    discovery: DiscoveryQuota;
                  }>(`/api/discovery?${params.toString()}`);
                  setDiscoveryQuota(filtered.discovery);
                  setDiscoveryProfiles(
                    filtered.profiles.map((profile) => ({
                      id: profile.id,
                      name: profile.display_name,
                      age: profile.age,
                      city: profile.coarse_location || 'Khu vực chưa chia sẻ',
                      distance: 'Khu vực gần đúng',
                      image: profile.photo_urls[0] ?? '',
                      photos: profile.photo_urls,
                      bio: profile.bio,
                      tags: profile.interests ?? [],
                      verified: profile.verification_status === 'verified',
                      goal: 'Đang tìm hiểu',
                    })),
                  );
                  setCurrentPerson(0);
                  setFilterOpen(false);
                  notify('Đã cập nhật bộ lọc khám phá.');
                } catch (error) {
                  reportApiError(error, notify);
                }
              }}
            >
              Áp dụng bộ lọc
            </button>
          </div>
        )}
        <div className="discover-count">
          <span>
            <span className="online-dot" /> Hồ sơ phù hợp hôm nay
          </span>
          <span>
            {discoveryProfiles.length} hồ sơ
            {/* ·{' '}
            {discoveryQuota.unlimited
              ? 'không giới hạn với Plus'
              : `tối đa ${discoveryQuota.daily_limit ?? 20} mỗi ngày`} */}
          </span>
        </div>
        {currentProfile ? (
          <ProfileCard
            key={currentProfile.id}
            profile={currentProfile}
            onLike={() => void moveProfile(true)}
            onSkip={() => void moveProfile(false)}
            onDetails={() => setShowDetails(true)}
            onBookmark={() =>
              notify('Chưa có danh sách lưu hồ sơ riêng được kết nối.')
            }
          />
        ) : (
          <div className="couple-locked-panel">
            <span className="eyebrow">KHÁM PHÁ</span>
            {discoveryQuota.remaining === 0 ? (
              <>
                <h2>Đã hết lượt khám phá hôm nay</h2>
                <p>
                  Bạn đã xem tối đa {discoveryQuota.daily_limit ?? 20} hồ sơ phù
                  hợp. Lượt khám phá sẽ làm mới vào ngày mai hoặc bạn có thể
                  nâng cấp DATING Plus để xem không giới hạn.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => setActiveView('vip')}
                >
                  Tìm hiểu DATING Plus
                </button>
              </>
            ) : (
              <>
                <h2>Chưa có hồ sơ phù hợp</h2>
                <p>
                  Hãy hoàn thiện hồ sơ và tùy chọn khám phá. Khi có tài khoản
                  phù hợp, hồ sơ sẽ xuất hiện tại đây.
                </p>
              </>
            )}
          </div>
        )}
        <div className="discover-footnote">
          <Shield size={14} /> Hãy là chính mình, và luôn kết nối theo cách
          khiến bạn thấy an toàn.
        </div>
      </section>
      <aside className="discover-aside">
        <div className="aside-note">
          <div className="aside-note-top">
            <span className="tiny-sparkle">
              <Sparkles size={16} />
            </span>
            <span>GỢI Ý NHỎ</span>
            <MoreHorizontal size={18} />
          </div>
          <h3>Một câu hỏi hay có thể mở đầu câu chuyện.</h3>
          <p>Thay vì “Chào bạn”, hãy thử hỏi về điều khiến họ vui gần đây.</p>
          <button
            className="text-button"
            onClick={() => notify('Đã lưu gợi ý cho lần trò chuyện tới.')}
          >
            Lưu gợi ý <ArrowRight size={14} />
          </button>
        </div>
        <div className="aside-completion">
          <div className="completion-header">
            <span>Hồ sơ của bạn</span>
            <strong>{profileCompletion}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${profileCompletion}%` }} />
          </div>
          <p>Thêm một chút về sở thích để mọi người hiểu bạn hơn.</p>
          <button
            className="text-button"
            onClick={() => setActiveView('profile')}
          >
            Hoàn thiện hồ sơ <ArrowRight size={14} />
          </button>
        </div>
        <div className="aside-daily">
          <div className="daily-icon">
            <Heart size={17} />
          </div>
          <div>
            <strong>Chậm một nhịp</strong>
            <p>Kết nối chất lượng không cần vội vàng.</p>
          </div>
        </div>
      </aside>
    </div>
  );

  const renderLikes = () => {
    const matchedUserIds = new Set(
      matchData
        .filter((match) => match.status === 'active')
        .map((match) => match.partner_id),
    );
    const receivedLikes = likeData.received.filter(
      (like) => like.from_user_id && !matchedUserIds.has(like.from_user_id),
    );
    const sentLikes = likeData.sent.filter(
      (like) => like.to_user_id && !matchedUserIds.has(like.to_user_id),
    );
    const displaySentLikes =
      showSentLikes || (!receivedLikes.length && sentLikes.length > 0);
    return (
      <div className="content-column">
        <div className="segmented-tabs">
          <button
            className={!displaySentLikes ? 'tab-active' : ''}
            onClick={() => setShowSentLikes(false)}
          >
            Người đã thích bạn <span>{receivedLikes.length}</span>
          </button>
          <button
            className={displaySentLikes ? 'tab-active' : ''}
            onClick={() => setShowSentLikes(true)}
          >
            Bạn đã thích <span>{sentLikes.length}</span>
          </button>
        </div>
        <div className="likes-intro">
          <div className="likes-heart">
            <Heart size={22} fill="currentColor" />
          </div>
          <div>
            <h2>Những tín hiệu dễ thương</h2>
            <p>
              {displaySentLikes
                ? 'Những người bạn đã chủ động gửi lượt thích.'
                : 'Đây là những người đã chủ động gửi lời thích đến bạn.'}
            </p>
          </div>
        </div>
        <div className="people-grid">
          {(displaySentLikes
            ? sentLikes.map((like) => ({
                ...like,
                from_user_id: like.to_user_id,
              }))
            : receivedLikes
          ).map((like) => {
            const person = profileCardFromPublic(like.profile);
            return (
              <article className="person-tile" key={like.id}>
                <div
                  className="person-tile-photo"
                  style={{
                    backgroundImage: person.image
                      ? `url(${person.image})`
                      : undefined,
                  }}
                />
                <div className="person-tile-body">
                  <span className="tile-time">
                    <Clock3 size={12} />{' '}
                    {like.created_at
                      ? new Date(like.created_at).toLocaleDateString('vi-VN')
                      : ''}
                  </span>
                  <h3>
                    {person.name}
                    {person.verified && <BadgeCheck size={15} />}
                  </h3>
                  <span className="tile-location">
                    <MapPin size={12} /> {person.city}
                  </span>
                  <div className="person-tile-actions">
                    <button
                      className="button button-primary"
                      disabled={
                        displaySentLikes ||
                        likeActionInProgress === like.from_user_id
                      }
                      onClick={() =>
                        like.from_user_id &&
                        void reactToUser(like.from_user_id, 'like')
                      }
                    >
                      {displaySentLikes
                        ? 'Đã thích'
                        : likeActionInProgress === like.from_user_id
                          ? 'Đang gửi...'
                          : 'Thích lại'}
                      <Heart size={14} fill="currentColor" />
                    </button>
                    {!displaySentLikes && (
                      <button
                        className="icon-button tile-dismiss"
                        disabled={likeActionInProgress === like.from_user_id}
                        onClick={() =>
                          like.from_user_id &&
                          void reactToUser(like.from_user_id, 'pass')
                        }
                        aria-label="Bỏ qua"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!receivedLikes.length && !displaySentLikes && (
            <p>Bạn chưa có lượt thích mới.</p>
          )}
          {!sentLikes.length && displaySentLikes && (
            <p>Bạn chưa gửi lượt thích nào.</p>
          )}
        </div>
        <p className="soft-privacy">
          <LockKeyhole size={14} /> Lượt thích của bạn được giữ riêng tư.
        </p>
      </div>
    );
  };

  const renderMatches = () => {
    const newMatches = matchData.filter((match) => {
      const conversationId = match.conversation?.id;
      return (
        !conversationId ||
        !conversationData.some(
          (conversation) =>
            conversation.id === conversationId &&
            conversation.latest_message !== null,
        )
      );
    });

    return (
      <div className="content-column">
        <div className="matches-banner">
          <div className="matches-banner-copy">
            <span className="matches-banner-kicker">MỘT ĐIỀU ĐÁNG MỪNG</span>
            <h2>
              Kết nối là khởi đầu,
              <br />
              <em>tìm hiểu mới là hành trình.</em>
            </h2>
            <p>
              Match cho phép bạn tìm hiểu và trò chuyện với nhiều người. Couple
              là lựa chọn riêng, mỗi người chỉ có thể ở trong một Couple đang
              hoạt động và cần cả hai đồng ý.
            </p>
          </div>
          <div className="matches-banner-visual" aria-hidden="true">
            <div className="matches-banner-step matches-banner-step-match">
              <span className="matches-banner-step-icon">
                <HeartHandshake size={17} />
              </span>
              <span>
                <strong>MATCH</strong>
                <small>Bắt đầu trò chuyện</small>
              </span>
            </div>
            <span className="matches-banner-connector" />
            <div className="matches-banner-step matches-banner-step-couple">
              <span className="matches-banner-step-icon">
                <Heart size={17} fill="currentColor" />
              </span>
              <span>
                <strong>COUPLE</strong>
                <small>Cùng vun đắp</small>
              </span>
            </div>
          </div>
        </div>
        <div className="section-title-row">
          <div>
            <h3>Kết nối mới</h3>
            <p>Hãy bắt đầu bằng một lời chào thật tự nhiên.</p>
          </div>
          <span className="result-count">{newMatches.length} kết nối mới</span>
        </div>
        <div className="match-list">
          {newMatches.map((match) => {
            const person = profileCardFromPublic(match.partner);
            const conversationIndex = conversationData.findIndex(
              (conversation) => conversation.id === match.conversation?.id,
            );
            return (
              <article className="match-row" key={match.id}>
                <Avatar image={person.image} />
                <div className="match-person">
                  <strong>{person.name}</strong>
                  <span>Hai bạn đã Match · Có thể bắt đầu trò chuyện</span>
                </div>
                <span className="match-status">
                  <span className="online-dot" /> Match
                </span>
                <button
                  className="button button-outline"
                  disabled={conversationIndex < 0}
                  onClick={() => {
                    setSelectedConversation(
                      conversationData[conversationIndex].id,
                    );
                    setMobileChatOpen(true);
                    setActiveView('messages');
                  }}
                >
                  Gửi lời chào <MessageCircle size={15} />
                </button>
                {!conversationData.some(
                  (conversation) =>
                    conversation.partner_id === match.partner_id &&
                    conversation.is_couple,
                ) && (
                  <button
                    className="button button-primary"
                    onClick={() =>
                      setCoupleInviteTarget({
                        id: match.partner_id,
                        name: person.name,
                      })
                    }
                  >
                    <HeartHandshake size={15} /> Mời Couple
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`Tùy chọn với ${person.name}`}
                  onClick={() =>
                    setSafetyTarget({
                      id: match.partner_id,
                      name: person.name,
                      matchId: match.id,
                    })
                  }
                >
                  <Ellipsis size={19} />
                </button>
              </article>
            );
          })}
          {!newMatches.length && (
            <p>
              {matchData.length
                ? 'Bạn đã bắt đầu trò chuyện với tất cả kết nối mới.'
                : 'Bạn chưa có kết nối nào. Hãy khám phá và gửi lượt thích để bắt đầu.'}
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderMessages = () => (
    <div
      className={`chat-panel${mobileChatOpen ? ' chat-panel-mobile-thread' : ''}`}
    >
      <aside className="chat-list">
        <div className="chat-search">
          <Search size={16} />
          <input
            placeholder="Tìm cuộc trò chuyện"
            aria-label="Tìm cuộc trò chuyện"
          />
        </div>
        <div className="chat-list-heading">
          MATCH ĐÃ KẾT NỐI <span>{conversationData.length}</span>
        </div>
        {sortConversations(conversationData).map((conversation) => {
          const partner = profileCardFromPublic(conversation.partner);
          return (
            <button
              key={conversation.id}
              className={`conversation-row ${activeConversation?.id === conversation.id ? 'conversation-selected' : ''}`}
              onClick={() => {
                setMessages([]);
                setSelectedConversation(conversation.id);
                setMobileChatOpen(true);
              }}
            >
              <Avatar image={partner.image} />
              <span className="conversation-copy">
                <strong>{partner.name}</strong>
                <span>
                  {conversation.latest_message?.content ?? 'Bắt đầu trò chuyện'}
                </span>
              </span>
              <span className="conversation-time">
                {conversation.latest_message
                  ? new Date(
                      conversation.latest_message.created_at,
                    ).toLocaleDateString('vi-VN')
                  : ''}
                {!!conversation.unread_count && (
                  <i
                    className="conversation-unread-count"
                    aria-label={`${conversation.unread_count} tin nhắn chưa đọc`}
                  >
                    {conversation.unread_count > 99
                      ? '99+'
                      : conversation.unread_count}
                  </i>
                )}
              </span>
            </button>
          );
        })}
        {conversationData.length === 0 && (
          <p className="chat-list-empty">
            Khi có Match mới, cuộc trò chuyện sẽ xuất hiện tại đây.
          </p>
        )}
        <div className="chat-safety-tip">
          <Shield size={16} />
          <span>
            <strong>Hãy trò chuyện an toàn</strong>
            <small>Không chia sẻ thông tin cá nhân quá sớm.</small>
          </span>
        </div>
      </aside>
      <section className="chat-thread">
        {activeConversation ? (
          <>
            <header className="thread-header">
              <button
                type="button"
                className="icon-button chat-back-button"
                aria-label="Quay lại danh sách Match"
                onClick={() => setMobileChatOpen(false)}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                className="thread-profile-trigger"
                aria-label={`Xem hồ sơ của ${chatProfile.name}`}
                onClick={() => {
                  setDetailsProfileOverride(chatProfile);
                  setShowDetails(true);
                }}
              >
                <Avatar image={chatProfile.image} />
                <span className="thread-profile-copy">
                  <strong>{chatProfile.name}</strong>
                  <span>
                    <span className="online-dot" />{' '}
                    {realtimeConversationId === activeConversation?.id
                      ? 'Kết nối trực tiếp'
                      : 'Đang đồng bộ tin nhắn'}
                  </span>
                </span>
              </button>
              <button
                className="icon-button"
                aria-label="Tùy chọn an toàn"
                onClick={() =>
                  activeConversation &&
                  setSafetyTarget({
                    id: activeConversation.partner_id,
                    name: chatProfile.name,
                  })
                }
              >
                <MoreHorizontal size={20} />
              </button>
            </header>
            {messages.length === 0 && (
              <div className="thread-context">
                <span className="context-heart">
                  <Heart size={14} fill="currentColor" />
                </span>
                <span>
                  Bạn và <strong>{chatProfile.name}</strong> đã kết nối. Hãy bắt
                  đầu bằng điều bạn tò mò.
                </span>
              </div>
            )}
            {activeConversation.is_couple ? (
              <div className="thread-couple-prompt">
                <span>
                  <HeartHandshake size={15} /> Hai bạn đã trở thành Couple.
                  Không gian riêng đã sẵn sàng.
                </span>
              </div>
            ) : (
              <div className="thread-couple-prompt">
                <span>
                  <HeartHandshake size={15} /> Trở thành Couple mở không gian
                  riêng khi cả hai đồng ý.
                </span>
                <button
                  className="thread-invite"
                  onClick={() =>
                    setCoupleInviteTarget({
                      id: activeConversation.partner_id,
                      name: chatProfile.name,
                    })
                  }
                >
                  Mời thành Couple
                </button>
              </div>
            )}
            <div className="message-date">HÔM NAY</div>
            <div className="message-list" ref={messageListRef}>
              {messages.map((message, index) => {
                const imageUrls =
                  message.attachmentUrls ??
                  (message.attachmentUrl ? [message.attachmentUrl] : []);
                const messageKey = message.id ?? `${message.time}-${index}`;
                const imageIndex = Math.min(
                  chatImageIndexes[messageKey] ?? 0,
                  Math.max(imageUrls.length - 1, 0),
                );
                return (
                  <div
                    className={`message-line ${message.from === 'me' ? 'message-mine' : ''}`}
                    key={messageKey}
                  >
                    <div className="message-bubble">
                      {imageUrls.length > 0 && (
                        <div className="chat-message-gallery">
                          <button
                            type="button"
                            className="chat-message-image-open"
                            disabled={message.uploadProgress !== undefined}
                            onClick={() =>
                              setChatImageViewer({
                                images: imageUrls,
                                index: imageIndex,
                              })
                            }
                            aria-label={`Xem ảnh ${imageIndex + 1} trong tin nhắn`}
                          >
                            <Image
                              className="chat-message-image"
                              src={imageUrls[imageIndex]}
                              alt={`Ảnh ${imageIndex + 1} được gửi trong tin nhắn`}
                              width={900}
                              height={900}
                              sizes="(max-width: 700px) 90vw, 300px"
                              unoptimized
                              onLoad={(event) => {
                                const image = event.currentTarget;
                                const scale = Math.min(
                                  1,
                                  (image.parentElement?.clientWidth ?? 300) /
                                    image.naturalWidth,
                                  280 / image.naturalHeight,
                                );
                                image.style.width = `${image.naturalWidth * scale}px`;
                                image.style.height = `${image.naturalHeight * scale}px`;
                                scrollMessagesToLatest();
                              }}
                            />
                            {message.uploadProgress !== undefined && (
                              <span
                                className="chat-upload-progress"
                                role="progressbar"
                                aria-label="Đang tải ảnh lên"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={message.uploadProgress}
                              >
                                <svg viewBox="0 0 40 40" aria-hidden="true">
                                  <circle
                                    className="chat-upload-progress-track"
                                    cx="20"
                                    cy="20"
                                    r="17"
                                  />
                                  <circle
                                    className="chat-upload-progress-value"
                                    cx="20"
                                    cy="20"
                                    r="17"
                                    strokeDasharray="107"
                                    strokeDashoffset={
                                      107 - (107 * message.uploadProgress) / 100
                                    }
                                  />
                                </svg>
                                <span>{message.uploadProgress}%</span>
                              </span>
                            )}
                          </button>
                          {imageUrls.length > 1 &&
                            message.uploadProgress === undefined && (
                              <div
                                className="chat-gallery-controls"
                                aria-label="Điều hướng ảnh"
                              >
                                <button
                                  type="button"
                                  className="chat-gallery-arrow"
                                  aria-label="Ảnh trước"
                                  onClick={() =>
                                    setChatImageIndexes((current) => ({
                                      ...current,
                                      [messageKey]:
                                        (imageIndex - 1 + imageUrls.length) %
                                        imageUrls.length,
                                    }))
                                  }
                                >
                                  <ChevronLeft size={15} />
                                </button>
                                <span>
                                  {imageIndex + 1} / {imageUrls.length}
                                </span>
                                <button
                                  type="button"
                                  className="chat-gallery-arrow"
                                  aria-label="Ảnh tiếp theo"
                                  onClick={() =>
                                    setChatImageIndexes((current) => ({
                                      ...current,
                                      [messageKey]:
                                        (imageIndex + 1) % imageUrls.length,
                                    }))
                                  }
                                >
                                  <ChevronRight size={15} />
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                      {message.text && (
                        <div className="chat-message-text">{message.text}</div>
                      )}
                      <span>{message.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedChatImages.length > 0 && (
              <div className="chat-image-pending">
                <div className="chat-image-pending-list">
                  {selectedChatImages.map(({ file, previewUrl }, index) => (
                    <div className="chat-image-pending-item" key={previewUrl}>
                      <Image
                        src={previewUrl}
                        alt={`Ảnh sẽ gửi: ${file.name}`}
                        width={52}
                        height={52}
                        unoptimized
                      />
                      <button
                        type="button"
                        className="chat-image-remove"
                        aria-label={`Bỏ ảnh ${index + 1}`}
                        onClick={() => {
                          replaceSelectedChatImages(
                            selectedChatImages.filter(
                              (_, imageIndex) => imageIndex !== index,
                            ),
                          );
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <span>{selectedChatImages.length} ảnh đã chọn (tối đa 5)</span>
              </div>
            )}
            <div className="chat-compose">
              <input
                ref={chatImageInputRef}
                className="chat-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                aria-label="Chọn ảnh gửi trong tin nhắn"
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  if (!files.length) return;
                  if (files.length > 5) {
                    notify('Mỗi tin nhắn có thể gửi tối đa 5 ảnh.');
                    event.currentTarget.value = '';
                    return;
                  }
                  const invalidImage = files.find(
                    (file) =>
                      ![
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'image/gif',
                      ].includes(file.type) || file.size > 8 * 1024 * 1024,
                  );
                  if (invalidImage) {
                    notify(
                      'Mỗi ảnh phải là JPEG, PNG, WebP hoặc GIF và không quá 8 MB.',
                    );
                    event.target.value = '';
                    return;
                  }
                  replaceSelectedChatImages(
                    files.map((file) => ({
                      file,
                      previewUrl: URL.createObjectURL(file),
                    })),
                  );
                  event.currentTarget.value = '';
                }}
              />
              <button
                className="icon-button compose-attach"
                aria-label="Đính kèm ảnh"
                disabled={!activeConversation || sendingMessage}
                title="Chọn tối đa 5 ảnh (mỗi ảnh tối đa 8 MB)"
                onClick={() => chatImageInputRef.current?.click()}
              >
                <ImagePlus size={19} />
              </button>
              <input
                ref={messageInputRef}
                value={messageDraft}
                disabled={!activeConversation || sendingMessage}
                onChange={(event) => setMessageDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void sendMessage();
                }}
                placeholder="Viết điều bạn đang nghĩ..."
                aria-label="Nội dung tin nhắn"
              />
              <button
                className="send-button"
                onClick={() => void sendMessage()}
                disabled={
                  !activeConversation ||
                  (!messageDraft.trim() && !selectedChatImages.length) ||
                  sendingMessage
                }
                aria-label="Gửi tin nhắn"
              >
                <Send size={17} />
              </button>
            </div>
          </>
        ) : (
          <div className="couple-locked-panel">
            <h2>Chọn một Match để trò chuyện</h2>
            <p>Chọn người bạn muốn nhắn tin trong danh sách.</p>
          </div>
        )}
      </section>
    </div>
  );

  const renderNotifications = () => (
    <div className="content-column notification-column">
      <div className="segmented-tabs">
        <button
          className={notificationFilter === 'all' ? 'tab-active' : ''}
          onClick={() => setNotificationFilter('all')}
        >
          Tất cả
        </button>
        <button
          className={notificationFilter === 'connections' ? 'tab-active' : ''}
          onClick={() => setNotificationFilter('connections')}
        >
          Kết nối
        </button>
        <button
          className={notificationFilter === 'messages' ? 'tab-active' : ''}
          onClick={() => setNotificationFilter('messages')}
        >
          Tin nhắn
        </button>
        <button
          className={notificationFilter === 'system' ? 'tab-active' : ''}
          onClick={() => setNotificationFilter('system')}
        >
          Hệ thống
        </button>
      </div>
      <div className="notification-date">GẦN ĐÂY</div>
      {notificationData
        .filter((notification) => {
          if (notificationFilter === 'all') return true;
          if (notificationFilter === 'connections')
            return /like|match|couple/i.test(notification.type);
          if (notificationFilter === 'messages')
            return /message/i.test(notification.type);
          return !/like|match|couple|message/i.test(notification.type);
        })
        .map((notification) => {
          const isCoupleNotification =
            notification.type.startsWith('couple.invitation');
          const isAcceptedCouple =
            notification.type === 'couple.invitation.accepted';
          const relatedProfile = notification.related_profile;
          const relatedPerson = relatedProfile
            ? profileCardFromPublic(relatedProfile)
            : null;
          return (
            <article
              className={`notification-row notification-row-${notification.type.replaceAll('.', '-')} ${notification.read_at ? '' : 'notification-row-unread'}`}
              key={notification.id}
            >
              {relatedPerson &&
              (notification.type === 'match' || notification.type === 'like') ? (
                <button
                  type="button"
                  className="notification-avatar-button"
                  aria-label={
                    notification.type === 'match'
                      ? `Mở thông báo Match với ${relatedPerson.name}`
                      : `Xem lượt thích từ ${relatedPerson.name}`
                  }
                  onClick={() => {
                    if (notification.type === 'match') {
                      openMatchNotification(notification);
                    } else {
                      if (!notification.read_at)
                        void markNotificationRead(notification.id);
                      setActiveView('likes');
                    }
                  }}
                >
                  <Avatar image={relatedPerson.image} />
                  <span className="notification-avatar-badge">
                    {notification.type === 'match' ? (
                      <Sparkles size={12} />
                    ) : (
                      <Heart size={12} fill="currentColor" />
                    )}
                  </span>
                </button>
              ) : relatedPerson && isCoupleNotification ? (
                <div className="notification-avatar-pair">
                  <button
                    type="button"
                    aria-label="Xem hồ sơ của bạn"
                    onClick={() => setActiveView('profile')}
                  >
                    <Avatar image={myPhoto} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Xem hồ sơ của ${relatedPerson.name}`}
                    onClick={() => {
                      setDetailsProfileOverride(relatedPerson);
                      setShowDetails(true);
                    }}
                  >
                    <Avatar image={relatedPerson.image} />
                  </button>
                  <span className="notification-avatar-badge">
                    <Heart size={12} fill="currentColor" />
                  </span>
                </div>
              ) : (
                <span
                  className={`notification-icon ${notification.read_at ? 'sage' : 'rose'}`}
                >
                  <Bell size={18} />
                </span>
              )}
              <div className="notification-copy">
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                <small>
                  {new Date(notification.created_at).toLocaleString('vi-VN')}
                </small>
              </div>
              {!notification.read_at && (
                <span className="notification-unread" />
              )}
              {!notification.read_at && (
                <button
                  className="icon-button"
                  aria-label="Đánh dấu đã đọc"
                  onClick={() => void markNotificationRead(notification.id)}
                >
                  <Check size={16} />
                </button>
              )}
              {notification.type === 'couple.invitation' && (
                <button
                  className="button button-outline notification-action"
                  onClick={() => {
                    if (!notification.read_at)
                      void markNotificationRead(notification.id);
                    setCoupleWorkspaceOpened(true);
                    setCoupleWorkspaceTab('invitations');
                    setActiveView('couple');
                  }}
                >
                  Xem lời mời
                </button>
              )}
              {isAcceptedCouple && (
                <button
                  type="button"
                  className="button button-outline notification-action"
                  onClick={() => {
                    if (!notification.read_at)
                      void markNotificationRead(notification.id);
                    setCoupleWorkspaceOpened(true);
                    setCoupleWorkspaceTab('space');
                    setActiveView('couple');
                  }}
                >
                  Mở Couple
                </button>
              )}
              {relatedPerson && notification.type === 'match' && (
                <button
                  type="button"
                  className="button button-outline notification-action"
                  onClick={() => openMatchNotification(notification)}
                >
                  Xem Match
                </button>
              )}
              {relatedPerson && notification.type === 'like' && (
                <button
                  type="button"
                  className="button button-outline notification-action"
                  onClick={() => {
                    if (!notification.read_at)
                      void markNotificationRead(notification.id);
                    setActiveView('likes');
                  }}
                >
                  Xem lượt thích
                </button>
              )}
            </article>
          );
        })}
      {!notificationData.some((notification) => {
        if (notificationFilter === 'all') return true;
        if (notificationFilter === 'connections')
          return /like|match|couple/i.test(notification.type);
        if (notificationFilter === 'messages')
          return /message/i.test(notification.type);
        return !/like|match|couple|message/i.test(notification.type);
      }) && <p>Không có thông báo trong mục này.</p>}
    </div>
  );

  const renderVip = () => (
    <div className="content-column vip-page">
      <div className="vip-hero">
        <div className="vip-copy">
          <span className="vip-label">
            <Crown size={15} /> DATING PLUS
          </span>
          <h2>
            Thêm lựa chọn,
            <br />
            <em>vẫn theo cách của bạn.</em>
          </h2>
          <p>
            Những công cụ bổ sung cho hành trình kết nối — không có áp lực,
            không bỏ lỡ những thông tin thiết yếu.
          </p>
          <button
            className="button button-light"
            onClick={() => notify('Các gói thanh toán sẽ được kết nối sau.')}
          >
            Khám phá gói Plus <ArrowRight size={16} />
          </button>
        </div>
        <div className="vip-art">
          <div className="vip-art-circle">
            <Crown size={42} />
          </div>
          <span>PLUS</span>
        </div>
      </div>
      <div className="section-title-row vip-section-title">
        <div>
          <h3>Chọn cách bạn muốn kết nối</h3>
          <p>
            Thông tin cơ bản và quyền riêng tư luôn được tôn trọng ở mọi gói.
          </p>
        </div>
        <span className="current-plan">
          <span /> Gói hiện tại: {currentPlan}
        </span>
      </div>
      <div className="plan-grid">
        <article className="plan-card">
          <span className="eyebrow">BẮT ĐẦU TỪ ĐÂY</span>
          <h3>Free</h3>
          <p className="plan-price">
            0<span>đ / tháng</span>
          </p>
          <ul>
            <li>
              <Check size={15} /> Tạo hồ sơ cá nhân
            </li>
            <li>
              <Check size={15} /> Khám phá và gửi lượt thích
            </li>
            <li>
              <Check size={15} /> Trò chuyện sau khi Match
            </li>
            <li>
              <Check size={15} /> Quyền riêng tư cơ bản
            </li>
          </ul>
          <button
            className="button button-outline full-button"
            onClick={() => notify('Bạn đang sử dụng gói Free.')}
          >
            Gói hiện tại
          </button>
        </article>
        <article className="plan-card plan-featured">
          <span className="plan-popular">ĐƯỢC YÊU THÍCH</span>
          <span className="eyebrow">THÊM MỘT CHÚT TIỆN ÍCH</span>
          <h3>
            DATING Plus <Crown size={19} />
          </h3>
          <p className="plan-price">
            99.000<span>đ / tháng</span>
          </p>
          <ul>
            <li>
              <Check size={15} /> Xem danh sách người đã thích bạn
            </li>
            <li>
              <Check size={15} /> Bộ lọc khám phá nâng cao
            </li>
            <li>
              <Check size={15} /> Tùy chỉnh thêm trải nghiệm
            </li>
            <li>
              <Check size={15} /> Quản lý gói bất cứ lúc nào
            </li>
          </ul>
          <button
            className="button button-primary full-button"
            onClick={() =>
              notify('Thanh toán chưa được kết nối — đây chỉ là bản xem trước.')
            }
          >
            Tìm hiểu gói Plus <ArrowRight size={15} />
          </button>
        </article>
      </div>
      <p className="soft-privacy vip-disclaimer">
        <LockKeyhole size={14} /> Gói VIP không che giấu thông tin thiết yếu về
        an toàn hay trạng thái quan hệ.
      </p>
    </div>
  );

  const openProfileEditor = async () => {
    setProfileEditorOpen(true);
    setProfileEditorBusy(true);
    setProfileEditorError('');
    try {
      const [account, photos, preferences] = await Promise.all([
        apiRequest<{
          profile: NonNullable<typeof myProfile>;
          profileDateOfBirthAvailable: boolean;
          profileCoverAvailable: boolean;
        }>('/api/me'),
        apiRequest<{ photos: OwnProfilePhoto[] }>('/api/profile/photos'),
        apiRequest<{ preferences: { interests: string[] } }>(
          '/api/preferences',
        ),
      ]);
      if (!account.profileDateOfBirthAvailable) {
        throw new Error(
          'Máy chủ chưa hỗ trợ cập nhật ngày sinh. Hãy kiểm tra phiên bản NestJS API và PostgreSQL migrations.',
        );
      }
      setProfileCoverAvailable(account.profileCoverAvailable);
      setMyProfile(account.profile);
      setMyPhotos(photos.photos);
      setMyPhoto(
        photos.photos.find(
          (photo) => photo.role === 'avatar' || photo.is_primary,
        )?.signedUrl ?? '',
      );
      setMyCoverPhoto(
        photos.photos.find(
          (photo) => photo.id === account.profile.cover_photo_id,
        )?.signedUrl ?? '',
      );
      setProfileDraft({
        displayName: account.profile.display_name ?? '',
        dateOfBirth: account.profile.date_of_birth ?? '',
        gender: account.profile.gender ?? '',
        city: account.profile.coarse_location ?? '',
        bio: account.profile.bio ?? '',
      });
      setProfileDraftInterests(preferences.preferences.interests ?? []);
    } catch (error) {
      reportApiError(error, setProfileEditorError);
    } finally {
      setProfileEditorBusy(false);
    }
  };

  const deleteProfilePhoto = async (photo: OwnProfilePhoto) => {
    if (
      photo.role !== null ||
      photo.is_primary ||
      photo.id === myProfile?.cover_photo_id
    ) {
      setProfileEditorError(
        'Ảnh đại diện và ảnh nền được quản lý riêng, không thể xóa từ thư viện.',
      );
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa ảnh này khỏi thư viện hồ sơ?'))
      return;

    setProfileEditorBusy(true);
    setProfileEditorError('');
    try {
      await apiRequest(`/api/profile/photos/${photo.id}`, {
        method: 'DELETE',
      });
      const remainingPhotos = myPhotos.filter((item) => item.id !== photo.id);
      setMyPhotos(remainingPhotos);
      setProfilePhotoDialog(null);
      notify('Đã xóa ảnh khỏi thư viện hồ sơ.');
    } catch (error) {
      reportApiError(error, setProfileEditorError);
    } finally {
      setProfileEditorBusy(false);
    }
  };

  const uploadProfilePhotoForRole = async (
    file: File | null,
    role: 'avatar' | 'cover' | null,
  ) => {
    if (!file || !role) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size === 0 ||
      file.size > 8 * 1024 * 1024
    ) {
      setProfileEditorError(
        'Ảnh hồ sơ cần là JPG, PNG hoặc WebP và không quá 8 MB.',
      );
      return;
    }

    setProfilePhotoUploading(true);
    setProfileEditorError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('role', role);
      const result = await apiRequest<{
        photo: OwnProfilePhoto;
        replacedPhotoId: string | null;
      }>('/api/profile/photos', {
        method: 'POST',
        body: form,
      });
      setMyPhotos((current) =>
        [
          ...current
            .filter((photo) => photo.id !== result.replacedPhotoId)
            .map((photo) => ({
              ...photo,
              is_primary: role === 'avatar' ? false : photo.is_primary,
            })),
          { ...result.photo, is_primary: role === 'avatar' },
        ].sort((first, second) => first.sort_order - second.sort_order),
      );
      if (role === 'avatar') setMyPhoto(result.photo.signedUrl);
      else {
        setMyCoverPhoto(result.photo.signedUrl);
        setMyProfile((current) =>
          current ? { ...current, cover_photo_id: result.photo.id } : current,
        );
      }
      setProfilePhotoDialog(null);
      notify(
        role === 'avatar' ? 'Đã đổi ảnh đại diện.' : 'Đã đổi ảnh nền hồ sơ.',
      );
    } catch (error) {
      reportApiError(error, setProfileEditorError);
    } finally {
      setProfilePhotoUploading(false);
      if (profileRolePhotoInputRef.current)
        profileRolePhotoInputRef.current.value = '';
    }
  };

  const uploadProfilePhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const selectedFiles = Array.from(files);
    if (galleryPhotos.length + selectedFiles.length > 6) {
      setProfileEditorError('Thư viện hồ sơ có thể chứa tối đa 6 ảnh.');
      return;
    }
    const invalidFile = selectedFiles.find(
      (file) =>
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size === 0 ||
        file.size > 8 * 1024 * 1024,
    );
    if (invalidFile) {
      setProfileEditorError(
        'Ảnh hồ sơ cần là JPG, PNG hoặc WebP và không quá 8 MB mỗi ảnh.',
      );
      return;
    }

    setProfilePhotoUploading(true);
    setProfileEditorError('');
    try {
      const uploaded: OwnProfilePhoto[] = [];
      for (const [index, file] of selectedFiles.entries()) {
        const form = new FormData();
        form.append('file', file);
        form.append('sortOrder', String(galleryPhotos.length + index));
        const result = await apiRequest<{ photo: OwnProfilePhoto }>(
          '/api/profile/photos',
          {
            method: 'POST',
            body: form,
          },
        );
        uploaded.push(result.photo);
      }
      setMyPhotos((current) => [...current, ...uploaded]);
      setProfileEditorError('');
    } catch (error) {
      reportApiError(error, setProfileEditorError);
    } finally {
      setProfilePhotoUploading(false);
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = '';
    }
  };

  const saveProfileEditor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profileEditorBusy || profilePhotoUploading) return;
    setProfileEditorBusy(true);
    setProfileEditorError('');
    try {
      await apiRequest('/api/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: profileDraft.displayName,
          dateOfBirth: profileDraft.dateOfBirth,
          gender: profileDraft.gender,
          bio: profileDraft.bio,
          coarseLocation: profileDraft.city || null,
          latitude: null,
          longitude: null,
        }),
      });
      await apiRequest('/api/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ interests: profileDraftInterests }),
      });
      setMyProfile((current) =>
        current
          ? {
              ...current,
              display_name: profileDraft.displayName.trim(),
              date_of_birth: profileDraft.dateOfBirth,
              gender: profileDraft.gender,
              bio: profileDraft.bio,
              coarse_location: profileDraft.city.trim() || null,
            }
          : current,
      );
      setMyInterests(profileDraftInterests);
      setProfileEditorOpen(false);
      notify('Đã cập nhật hồ sơ của bạn.');
    } catch (error) {
      reportApiError(error, setProfileEditorError);
    } finally {
      setProfileEditorBusy(false);
    }
  };

  const renderProfile = () => (
    <div className="content-column profile-page">
      <input
        ref={profilePhotoInputRef}
        className="profile-editor-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) =>
          void uploadProfilePhotos(event.currentTarget.files)
        }
      />
      <input
        ref={profileRolePhotoInputRef}
        className="profile-editor-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          void uploadProfilePhotoForRole(
            event.currentTarget.files?.[0] ?? null,
            pendingProfilePhotoRole,
          );
          setPendingProfilePhotoRole(null);
        }}
      />
      <section className="profile-hero-card">
        <div className="profile-cover">
          <div
            className="profile-cover-photo"
            style={{
              backgroundImage: myCoverPhoto
                ? `url("${myCoverPhoto}")`
                : 'url(https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1000&q=90)',
            }}
          />
          <div className="profile-cover-shade" />
          <span className="cover-label">
            <UserRound size={15} />{' '}
            {myCoverPhoto ? 'ẢNH NỀN HỒ SƠ' : 'HỒ SƠ CỦA BẠN'}
          </span>
          <button
            className="profile-cover-edit"
            type="button"
            aria-label="Thay ảnh nền"
            title="Thay ảnh nền"
            onClick={() =>
              setProfilePhotoDialog({ mode: 'current-role', role: 'cover' })
            }
          >
            <ImagePlus size={18} />
          </button>
        </div>
        <div className="profile-identity">
          <button
            type="button"
            className="profile-avatar-trigger"
            aria-label="Xem hoặc đổi ảnh đại diện"
            onClick={() =>
              setProfilePhotoDialog({ mode: 'current-role', role: 'avatar' })
            }
          >
            <Avatar image={myPhoto} className="profile-large-avatar" />
            <span className="profile-avatar-action">
              <Camera size={16} />
            </span>
          </button>
          <div className="profile-main-copy">
            <div className="profile-title">
              <h2>{myProfile?.display_name || 'Hồ sơ của bạn'}</h2>
              {myProfile?.verification_status === 'verified' && (
                <span className="profile-verified">
                  <BadgeCheck size={15} /> Đã xác minh
                </span>
              )}
            </div>
            <span className="profile-location">
              <MapPin size={15} />{' '}
              {myProfile?.coarse_location || 'Chưa thêm khu vực'}
            </span>
          </div>
          <button
            className="button button-outline profile-edit-button"
            onClick={() => void openProfileEditor()}
          >
            Chỉnh sửa hồ sơ <Settings size={16} />
          </button>
        </div>
      </section>

      <section className="profile-gallery-card">
        <div className="profile-gallery-heading">
          <div>
            <span className="eyebrow">MỌI KHOẢNH KHẮC CỦA BẠN</span>
            <h2>
              Thư viện ảnh <span>{galleryPhotos.length}/6</span>
            </h2>
          </div>
          <button
            className="button button-outline"
            type="button"
            onClick={() => profilePhotoInputRef.current?.click()}
            disabled={profilePhotoUploading || galleryPhotos.length >= 6}
          >
            <ImagePlus size={16} />{' '}
            {profilePhotoUploading ? 'Đang tải…' : 'Thêm ảnh'}
          </button>
        </div>
        {galleryPhotos.length ? (
          <div className="profile-gallery-grid">
            {galleryPhotos.map((photo) => (
              <button
                type="button"
                className="profile-gallery-photo"
                key={photo.id}
                onClick={() =>
                  setProfilePhotoDialog({ mode: 'view', photoId: photo.id })
                }
                aria-label="Xem ảnh trong thư viện"
              >
                <Image
                  src={photo.signedUrl}
                  alt="Ảnh trong thư viện hồ sơ"
                  fill
                  sizes="(max-width: 650px) 32vw, 180px"
                  unoptimized
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="profile-gallery-empty">
            <ImagePlus size={22} />
            <span>Thêm ảnh để làm hồ sơ của bạn sinh động hơn.</span>
          </div>
        )}
      </section>

      <section className="profile-progress-card">
        <div className="profile-progress-heading">
          <div>
            <h2>Hoàn thiện hồ sơ</h2>
            <p>Thêm một chút về bạn để dễ gặp người đồng điệu.</p>
          </div>
          <strong>{profileCompletion}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${profileCompletion}%` }} />
        </div>
        <div className="profile-progress-steps">
          <span>
            <Check size={14} /> Thông tin cơ bản
          </span>
          <span>
            <Check size={14} /> Ảnh đại diện
          </span>
          <span>
            <Check size={14} /> Sở thích
          </span>
          <button onClick={() => setActiveView('settings')}>
            <Plus size={14} /> Tùy chọn riêng tư
          </button>
        </div>
      </section>

      <div className="profile-details-grid">
        <section className="profile-section-card">
          <div className="profile-section-heading">
            <span className="profile-section-icon">
              <MessageCircleHeart size={17} />
            </span>
            <div>
              <span className="eyebrow">CÂU CHUYỆN CỦA BẠN</span>
              <h2>Đôi điều về mình</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Chỉnh sửa giới thiệu"
              onClick={() => void openProfileEditor()}
            >
              <Settings size={16} />
            </button>
          </div>
          <p>
            {myProfile?.bio ||
              'Hãy thêm vài dòng giới thiệu về bản thân trong phần hoàn thiện hồ sơ.'}
          </p>
        </section>
        <section className="profile-section-card">
          <div className="profile-section-heading">
            <span className="profile-section-icon">
              <Sparkles size={17} />
            </span>
            <div>
              <span className="eyebrow">NHỮNG ĐIỀU MÌNH YÊU</span>
              <h2>Sở thích</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Chỉnh sửa sở thích"
              onClick={() => void openProfileEditor()}
            >
              <Settings size={16} />
            </button>
          </div>
          <div className="tag-row">
            {myInterests.map((tag) => (
              <span className="interest-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="profile-verify-card">
        <span className="profile-verify-icon">
          <BadgeCheck size={21} />
        </span>
        <div>
          <strong>
            {myProfile?.verification_status === 'verified'
              ? 'Đã xác minh người thật'
              : 'Chưa xác minh người thật'}
          </strong>
          <p>Dịch vụ xác minh người thật hiện chưa được tích hợp.</p>
        </div>
        <span className="profile-verify-status">
          {myProfile?.verification_status === 'verified' ? (
            <>
              <Check size={14} /> Đã xác minh
            </>
          ) : (
            'Chưa xác minh'
          )}
        </span>
      </section>
      {profileEditorOpen && (
        <div
          className="profile-editor-backdrop"
          role="presentation"
          onClick={() => setProfileEditorOpen(false)}
        >
          <section
            className="profile-editor-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="profile-editor-header">
              <div>
                <span className="eyebrow">HỒ SƠ CỦA BẠN</span>
                <h2 id="profile-editor-title">Chỉnh sửa hồ sơ</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                onClick={() => setProfileEditorOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            {profileEditorBusy && !myProfile ? (
              <p className="profile-editor-status">Đang tải hồ sơ…</p>
            ) : (
              <form
                className="profile-editor-form"
                onSubmit={(event) => void saveProfileEditor(event)}
              >
                <div className="profile-editor-fields">
                  <label className="form-label">
                    Tên hiển thị
                    <input
                      className="plain-input"
                      value={profileDraft.displayName}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                      minLength={2}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="form-label">
                    Ngày sinh
                    <input
                      className="plain-input"
                      type="date"
                      value={profileDraft.dateOfBirth}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          dateOfBirth: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="form-label">
                    Giới tính
                    <select
                      className="plain-input"
                      value={profileDraft.gender}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          gender: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Chọn giới tính</option>
                      <option>Nữ</option>
                      <option>Nam</option>
                      <option>Khác</option>
                      <option>Không muốn chia sẻ</option>
                    </select>
                  </label>
                  <label className="form-label profile-editor-wide">
                    Thành phố / khu vực
                    <input
                      className="plain-input"
                      value={profileDraft.city}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      placeholder="Ví dụ: TP. Hồ Chí Minh"
                      maxLength={120}
                    />
                    <small>
                      Chỉ chia sẻ khu vực gần đúng, không hiển thị vị trí chính
                      xác.
                    </small>
                  </label>
                  <label className="form-label profile-editor-wide">
                    Giới thiệu về bạn
                    <textarea
                      className="plain-input"
                      rows={4}
                      value={profileDraft.bio}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          bio: event.target.value,
                        }))
                      }
                      placeholder="Chia sẻ vài điều bạn yêu thích..."
                      maxLength={5000}
                    />
                  </label>
                </div>
                <section className="profile-editor-section">
                  <div className="profile-editor-section-heading">
                    <div>
                      <strong>Thư viện ảnh</strong>
                      <small>Thêm tối đa 6 ảnh vào hồ sơ của bạn.</small>
                    </div>
                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      disabled={
                        profilePhotoUploading || galleryPhotos.length >= 6
                      }
                    >
                      <ImagePlus size={15} />{' '}
                      {profilePhotoUploading ? 'Đang tải…' : 'Thêm ảnh'}
                    </button>
                  </div>
                  {galleryPhotos.length ? (
                    <div className="profile-editor-gallery-preview">
                      {galleryPhotos.map((photo) => (
                        <div
                          className="profile-editor-gallery-thumb"
                          key={photo.id}
                        >
                          <Image
                            src={photo.signedUrl}
                            alt="Ảnh hồ sơ"
                            fill
                            sizes="(max-width: 650px) 40vw, 150px"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="profile-editor-status">
                      Bạn chưa có ảnh trong thư viện.
                    </p>
                  )}
                </section>
                <section className="profile-editor-section">
                  <strong>Sở thích</strong>
                  <div className="profile-editor-interests">
                    {[
                      'Cà phê',
                      'Du lịch',
                      'Ẩm thực',
                      'Sách & podcast',
                      'Thiên nhiên',
                      'Âm nhạc',
                      'Nhiếp ảnh',
                      'Yoga',
                      'Nấu ăn',
                      'Phim ảnh',
                      'Thú cưng',
                      'Nghệ thuật',
                    ].map((interest) => {
                      const selected = profileDraftInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          className={selected ? 'is-selected' : ''}
                          onClick={() =>
                            setProfileDraftInterests((current) =>
                              selected
                                ? current.filter((item) => item !== interest)
                                : current.length < 30
                                  ? [...current, interest]
                                  : current,
                            )
                          }
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </section>
                {profileEditorError && (
                  <p className="profile-editor-error" role="alert">
                    {profileEditorError}
                  </p>
                )}
                <footer className="profile-editor-footer">
                  <button
                    className="button button-outline"
                    type="button"
                    disabled={profileEditorBusy}
                    onClick={() => setProfileEditorOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={profileEditorBusy || profilePhotoUploading}
                  >
                    <Check size={16} />{' '}
                    {profileEditorBusy ? 'Đang lưu…' : 'Lưu hồ sơ'}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}
      {profilePhotoDialog && (
        <div
          className="profile-photo-backdrop"
          role="presentation"
          onClick={() => setProfilePhotoDialog(null)}
        >
          <section
            className="profile-photo-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="eyebrow">THƯ VIỆN HỒ SƠ</span>
                <h2 id="profile-photo-dialog-title">
                  {profilePhotoDialog.mode === 'current-role'
                    ? profilePhotoDialog.role === 'avatar'
                      ? 'Ảnh đại diện của bạn'
                      : 'Ảnh nền hồ sơ'
                    : 'Ảnh của bạn'}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Đóng"
                onClick={() => setProfilePhotoDialog(null)}
              >
                <X size={18} />
              </button>
            </header>
            {profilePhotoDialog.mode === 'current-role'
              ? (() => {
                  const { role } = profilePhotoDialog;
                  const photo =
                    role === 'avatar'
                      ? myPhotos.find(
                          (item) => item.role === 'avatar' || item.is_primary,
                        )
                      : myPhotos.find(
                          (item) => item.id === myProfile?.cover_photo_id,
                        );
                  return (
                    <>
                      {photo ? (
                        <div className="profile-photo-viewer">
                          <Image
                            src={photo.signedUrl}
                            alt={
                              role === 'avatar'
                                ? 'Ảnh đại diện hiện tại'
                                : 'Ảnh nền hiện tại'
                            }
                            fill
                            sizes="(max-width: 650px) 90vw, 600px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="profile-photo-empty">
                          <ImagePlus size={28} />
                          <span>
                            Chưa có{' '}
                            {role === 'avatar' ? 'ảnh đại diện' : 'ảnh nền'}
                          </span>
                        </div>
                      )}
                      {profileEditorError && (
                        <p className="profile-editor-error" role="alert">
                          {profileEditorError}
                        </p>
                      )}
                      {!profileCoverAvailable && (
                        <p className="profile-editor-status">
                          Máy chủ chưa hỗ trợ thay đổi ảnh bìa. Hãy kiểm tra
                          PostgreSQL migrations.
                        </p>
                      )}
                      <div className="profile-photo-dialog-actions">
                        <button
                          type="button"
                          className="button button-primary"
                          disabled={
                            !profileCoverAvailable || profilePhotoUploading
                          }
                          onClick={() => {
                            setPendingProfilePhotoRole(role);
                            profileRolePhotoInputRef.current?.click();
                          }}
                        >
                          <ImagePlus size={16} />{' '}
                          {profilePhotoUploading
                            ? 'Đang tải ảnh…'
                            : `Đổi ${role === 'avatar' ? 'avatar' : 'ảnh nền'}`}
                        </button>
                      </div>
                    </>
                  );
                })()
              : (() => {
                  const photo = myPhotos.find(
                    (item) => item.id === profilePhotoDialog.photoId,
                  );
                  return photo ? (
                    <>
                      <div className="profile-photo-viewer">
                        <Image
                          src={photo.signedUrl}
                          alt="Ảnh hồ sơ phóng to"
                          fill
                          sizes="(max-width: 650px) 90vw, 600px"
                          unoptimized
                        />
                      </div>
                      {profileEditorError && (
                        <p className="profile-editor-error" role="alert">
                          {profileEditorError}
                        </p>
                      )}
                      <div className="profile-photo-dialog-actions">
                        <button
                          type="button"
                          className="button button-danger-outline"
                          disabled={profileEditorBusy || profilePhotoUploading}
                          onClick={() => void deleteProfilePhoto(photo)}
                        >
                          <Trash2 size={15} />
                          {profileEditorBusy ? 'Đang xóa…' : 'Xóa ảnh'}
                        </button>
                      </div>
                    </>
                  ) : null;
                })()}
          </section>
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="settings-layout">
      <div className="settings-menu">
        <button onClick={() => setActiveView('profile')}>
          <UserRound size={16} /> Tài khoản
        </button>
        <button
          className={
            settingsSection === 'privacy' ? 'settings-menu-active' : ''
          }
          onClick={() => setSettingsSection('privacy')}
        >
          <LockKeyhole size={16} /> Quyền riêng tư
        </button>
        <button
          className={
            settingsSection === 'notifications' ? 'settings-menu-active' : ''
          }
          onClick={() => setSettingsSection('notifications')}
        >
          <Bell size={16} /> Thông báo
        </button>
        <button
          className={
            settingsSection === 'appearance' ? 'settings-menu-active' : ''
          }
          onClick={() => setSettingsSection('appearance')}
        >
          <Sparkles size={16} /> Giao diện
        </button>
        <button
          className={
            settingsSection === 'blocked' ? 'settings-menu-active' : ''
          }
          onClick={() => setSettingsSection('blocked')}
        >
          <Shield size={16} /> Người dùng bị chặn
        </button>
      </div>
      <div className="settings-content">
        <div className="settings-heading">
          <h2>
            {settingsSection === 'privacy'
              ? 'Quyền riêng tư'
              : settingsSection === 'notifications'
                ? 'Thông báo'
                : settingsSection === 'appearance'
                  ? 'Giao diện theo mùa'
                  : 'Người dùng bị chặn'}
          </h2>
          <p>
            {settingsSection === 'appearance'
              ? 'Chọn sắc màu và hiệu ứng theo mùa bạn yêu thích.'
              : settingsSection === 'blocked'
                ? 'Quản lý các tài khoản bạn đã chặn.'
                : 'Chọn cách bạn muốn hiện diện trên DATING.'}
          </p>
        </div>
        {settingsSection === 'appearance' && (
          <div
            className="season-theme-grid"
            role="group"
            aria-label="Chọn giao diện theo mùa"
          >
            {SEASONAL_THEMES.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={`season-theme-option season-theme-${theme.id} ${
                  seasonalTheme === theme.id ? 'season-theme-selected' : ''
                }`}
                aria-pressed={seasonalTheme === theme.id}
                onClick={() => selectSeasonalTheme(theme.id)}
              >
                <span className="season-theme-preview" aria-hidden="true">
                  {theme.preview}
                </span>
                <span className="season-theme-copy">
                  <strong>{theme.name}</strong>
                  <small>{theme.description}</small>
                </span>
                <span className="season-theme-check" aria-hidden="true">
                  <Check size={15} />
                </span>
              </button>
            ))}
          </div>
        )}
        {[
          {
            key: 'discoverable' as const,
            section: 'privacy',
            title: 'Hiển thị hồ sơ khi khám phá',
            description: 'Cho phép hồ sơ của bạn xuất hiện với người phù hợp.',
          },
          {
            key: 'location' as const,
            section: 'privacy',
            title: 'Hiển thị khu vực gần đúng',
            description: 'Chỉ hiển thị thành phố hoặc khoảng cách ước tính.',
          },
          {
            key: 'messages' as const,
            section: 'notifications',
            title: 'Thông báo tin nhắn',
            description: 'Nhận cập nhật khi có tin nhắn mới.',
          },
          {
            key: 'matches' as const,
            section: 'notifications',
            title: 'Thông báo kết nối',
            description: 'Nhận cập nhật khi có Match mới.',
          },
        ]
          .filter((setting) => setting.section === settingsSection)
          .map((setting) => (
            <div className="setting-row" key={setting.key}>
              <div>
                <strong>{setting.title}</strong>
                <p>{setting.description}</p>
              </div>
              <button
                className={`toggle ${settings[setting.key] ? 'toggle-on' : ''}`}
                role="switch"
                aria-checked={settings[setting.key]}
                aria-label={setting.title}
                onClick={() => void toggleSetting(setting.key)}
              >
                <span />
              </button>
            </div>
          ))}
        {settingsSection === 'blocked' &&
          (blockedAccounts.length ? (
            blockedAccounts.map((block) => (
              <div className="setting-row" key={block.id}>
                <div>
                  <strong>
                    {block.profile?.display_name ||
                      block.profile?.username ||
                      'Tài khoản DATING'}
                  </strong>
                  <p>
                    Đã chặn{' '}
                    {new Date(block.created_at ?? '').toLocaleDateString(
                      'vi-VN',
                    )}
                  </p>
                </div>
                <button
                  className="button button-outline"
                  onClick={() => void unblockAccount(block.blocked_id)}
                >
                  Bỏ chặn
                </button>
              </div>
            ))
          ) : (
            <p>Bạn chưa chặn tài khoản nào.</p>
          ))}
        <div className="settings-danger">
          <div>
            <strong>Đăng xuất khỏi tài khoản</strong>
            <p>Bạn có thể đăng nhập lại bất cứ lúc nào.</p>
          </div>
          <button
            className="button button-outline"
            onClick={() => void signOut()}
            disabled={signingOut}
          >
            <LogOut size={15} /> {signingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'discover':
        return renderDiscover();
      case 'likes':
        return renderLikes();
      case 'matches':
        return renderMatches();
      case 'messages':
        return renderMessages();
      case 'couple':
        return null;
      case 'notifications':
        return renderNotifications();
      case 'vip':
        return renderVip();
      case 'profile':
        return renderProfile();
      case 'settings':
        return renderSettings();
    }
  };

  const seasonalParticles =
    SEASONAL_THEMES.find((theme) => theme.id === seasonalTheme)?.particles ??
    SEASONAL_THEMES[0].particles;

  if (booting) {
    return <AppLoadingScreen />;
  }

  return (
    <div className="app-shell" data-season={seasonalTheme}>
      <aside className="app-sidebar">
        <Link className="brand app-brand" href="/">
          <span className="brand-mark">
            <Heart size={16} fill="currentColor" />
          </span>
          <span>
            DATING<span className="brand-period">.</span>
          </span>
        </Link>
        <button
          className="sidebar-profile"
          onClick={() => setActiveView('profile')}
        >
          <Avatar image={myPhoto} />
          <span>
            <strong>{myProfile?.display_name || 'Tài khoản của bạn'}</strong>
            <small>Hồ sơ của bạn</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="sidebar-label">KHÔNG GIAN CỦA BẠN</div>
        <nav className="app-nav" aria-label="Điều hướng ứng dụng">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label ?? 'main'}>
              {group.label && (
                <span className="sidebar-label">{group.label}</span>
              )}
              {group.items.map(({ id, label, icon: Icon }) => {
                const count =
                  id === 'likes'
                    ? likeData.received.filter(
                        (like) =>
                          like.from_user_id &&
                          !matchData.some(
                            (match) =>
                              match.status === 'active' &&
                              match.partner_id === like.from_user_id,
                          ),
                      ).length
                    : id === 'messages'
                      ? unreadMessageCount
                      : id === 'notifications'
                        ? unreadNotificationCount
                        : 0;
                return (
                  <button
                    className={`nav-item ${activeView === id ? 'nav-item-active' : ''}`}
                    key={id}
                    onClick={() => {
                      if (id === 'couple') setCoupleWorkspaceOpened(true);
                      if (id === 'messages') setMobileChatOpen(false);
                      setActiveView(id);
                    }}
                  >
                    <Icon
                      size={18}
                      strokeWidth={activeView === id ? 2.2 : 1.8}
                    />
                    <span>{label}</span>
                    {count > 0 && (
                      <small className="nav-badge">
                        {count > 5 ? '5+' : count}
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="sidebar-help"
            onClick={() => notify('Trung tâm trợ giúp sẽ sớm được bổ sung.')}
          >
            <CircleHelp size={17} /> Trung tâm trợ giúp <ArrowRight size={14} />
          </button>
          <div className="sidebar-privacy">
            <span>
              <LockKeyhole size={13} /> Riêng tư theo cách bạn chọn
            </span>
            <small>© 2026 DATING</small>
          </div>
        </div>
      </aside>

      <main className="app-main">
        <div className="falling-petals" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => (
            <span
              className={`falling-petal falling-petal-${index + 1}`}
              key={index}
            >
              {seasonalParticles[index % seasonalParticles.length]}
            </span>
          ))}
        </div>
        <header className="app-topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              <Heart size={15} fill="currentColor" />
            </span>
            DATING<span className="brand-period">.</span>
          </div>
          <div className="breadcrumbs">
            <House size={14} />
            <span>/</span>
            <strong>{navTitles[activeView].title}</strong>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={16} />
              <input placeholder="Tìm kiếm" aria-label="Tìm kiếm" />
              <kbd>⌘ K</kbd>
            </label>
            <button
              className="icon-button topbar-bell"
              onClick={() => setActiveView('notifications')}
              aria-label="Thông báo"
            >
              <Bell size={18} />
              {unreadNotificationCount > 0 && (
                <small className="topbar-count-badge">
                  {unreadNotificationCount > 5 ? '5+' : unreadNotificationCount}
                </small>
              )}
            </button>
            <Avatar image={myPhoto} className="topbar-avatar" />
          </div>
        </header>
        <div className="app-greeting" key={activeView}>
          <span className="eyebrow">XIN CHÀO,</span>
          <strong>{myProfile?.display_name || 'BẠN'}</strong>
          <span className="greeting-flower" aria-hidden="true">
            ✳
          </span>
        </div>
        <div className={`view-container view-${activeView}`}>
          {loadErrors.length > 0 && (
            <section className="couple-locked-panel" role="alert">
              <h2>Một số dữ liệu chưa tải được</h2>
              <p>{loadErrors.join(' ')}</p>
              <button
                className="button button-outline"
                onClick={() => void refreshAppData()}
              >
                Thử tải lại
              </button>
            </section>
          )}
          {renderActiveView()}
          {coupleWorkspaceOpened && (
            <div hidden={activeView !== 'couple'}>
              <CoupleWorkspace
                notify={notify}
                onCelebration={(partnerName) => {
                  setCoupleCelebration({
                    title: 'Hai bạn đã trở thành Couple!',
                    message: `${partnerName} đã chấp nhận lời mời. Không gian Couple của hai bạn đã mở.`,
                  });
                  void refreshLiveData();
                }}
                activeTab={coupleWorkspaceTab}
                onTabChange={setCoupleWorkspaceTab}
              />
            </div>
          )}
        </div>
        <footer className="app-footer">
          <span>Nhẹ nhàng thôi, kết nối theo cách của bạn.</span>
          <span>
            <Link href="/#safety">Điều khoản</Link>
            <Link href="/#our-values">Quyền riêng tư</Link>
            <Link href="/#safety">Trợ giúp</Link>
          </span>
        </footer>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
        {(
          [
            { id: 'discover', label: 'Khám phá', icon: Compass },
            { id: 'matches', label: 'Kết nối', icon: HeartHandshake },
            { id: 'messages', label: 'Tin nhắn', icon: MessageCircle },
            { id: 'couple', label: 'Couple', icon: UsersRound },
            { id: 'profile', label: 'Hồ sơ', icon: UserRound },
          ] as { id: ViewId; label: string; icon: LucideIcon }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={activeView === id ? 'mobile-nav-active' : ''}
            onClick={() => {
              if (id === 'couple') setCoupleWorkspaceOpened(true);
              setActiveView(id);
            }}
          >
            <span className="mobile-nav-icon">
              <Icon size={19} />
              {id === 'messages' && unreadMessageCount > 0 && (
                <small className="mobile-count-badge">
                  {unreadMessageCount > 5 ? '5+' : unreadMessageCount}
                </small>
              )}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast-message" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
        </div>
      )}
      {incomingLikeNotice?.related_profile && (
        <aside className="incoming-like-notice" role="status">
          <Avatar
            image={incomingLikeNotice.related_profile.photo_urls?.[0] ?? ''}
          />
          <div className="incoming-like-notice-copy">
            <strong>
              {incomingLikeNotice.related_profile.display_name || 'Ai đó'} đã
              thích bạn
            </strong>
            <span>Chạm để xem người muốn kết nối với bạn.</span>
          </div>
          <button
            type="button"
            className="button button-outline incoming-like-notice-action"
            onClick={() => {
              setShowSentLikes(false);
              setActiveView('likes');
              setIncomingLikeNotice(null);
              if (!incomingLikeNotice.read_at)
                void markNotificationRead(incomingLikeNotice.id);
            }}
          >
            Xem
          </button>
          <button
            type="button"
            className="icon-button incoming-like-notice-close"
            aria-label="Đóng thông báo lượt thích"
            onClick={() => setIncomingLikeNotice(null)}
          >
            <X size={15} />
          </button>
        </aside>
      )}
      {coupleCelebration && (
        <CoupleCelebration
          title={coupleCelebration.title}
          message={coupleCelebration.message}
          onClose={() => setCoupleCelebration(null)}
          onContinue={() => {
            setCoupleCelebration(null);
            setCoupleWorkspaceOpened(true);
            setCoupleWorkspaceTab('space');
            setActiveView('couple');
          }}
        />
      )}
      {matchCelebration && (
        <div
          className="modal-backdrop match-celebration-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setMatchCelebration(null);
          }}
        >
          <section
            className="match-celebration"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-celebration-title"
          >
            <button
              className="match-celebration-close icon-button"
              onClick={() => setMatchCelebration(null)}
              aria-label="Đóng thông báo ghép đôi"
            >
              <X size={19} />
            </button>
            <div className="match-celebration-glow" aria-hidden="true" />
            <div className="match-celebration-art" aria-hidden="true">
              <span className="match-confetti match-confetti-one" />
              <span className="match-confetti match-confetti-two" />
              <span className="match-confetti match-confetti-three" />
              <span className="match-confetti match-confetti-four" />
              <div className="match-avatar-pair">
                <Avatar image={myPhoto} className="match-avatar-self" />
                <span className="match-sparkle-badge">
                  <Sparkles size={21} />
                </span>
                <Avatar
                  image={matchCelebration.image}
                  className="match-avatar-partner"
                />
              </div>
              <Sparkles
                className="match-sparkle match-sparkle-left"
                size={20}
              />
              <Sparkles
                className="match-sparkle match-sparkle-right"
                size={17}
              />
            </div>
            <span className="eyebrow">MỘT ĐIỀU ĐÁNG MỪNG</span>
            <h2 id="match-celebration-title">
              Hai bạn đã <em>tương hợp!</em>
            </h2>
            <p>
              Bạn và <strong>{matchCelebration.name}</strong> đều quan tâm đến
              nhau. Một cuộc trò chuyện thú vị có thể bắt đầu từ đây.
            </p>
            <div className="match-celebration-actions">
              <button
                className="button button-outline"
                onClick={() => setMatchCelebration(null)}
              >
                Tiếp tục khám phá
              </button>
              <button
                className="button button-primary"
                disabled={openingConversation}
                onClick={() =>
                  void openMatchedConversation(
                    matchCelebration.partnerId,
                    matchCelebration.conversationId,
                  )
                }
              >
                {openingConversation ? 'Đang mở...' : 'Gửi lời chào'}{' '}
                <MessageCircle size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
      {showDetails && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowDetails(false);
              setDetailsProfileOverride(null);
            }
          }}
        >
          <section
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-profile-title"
          >
            <div
              className="modal-photo"
              style={{
                backgroundImage: detailsProfile?.image
                  ? `url(${detailsProfile.image})`
                  : undefined,
              }}
            />
            <button
              className="modal-close icon-button"
              onClick={() => {
                setShowDetails(false);
                setDetailsProfileOverride(null);
              }}
              aria-label="Đóng hồ sơ"
            >
              <X size={19} />
            </button>
            <div className="modal-content">
              <span className="eyebrow">
                {detailsProfileOverride
                  ? 'HỒ SƠ NGƯỜI KẾT NỐI'
                  : 'MỘT HỒ SƠ MỚI'}
              </span>
              <h2 id="modal-profile-title">
                {detailsProfile?.name}
                {detailsProfile?.age ? `, ${detailsProfile.age}` : ''}
                {detailsProfile?.verified && <BadgeCheck size={19} />}
              </h2>
              <span className="tile-location">
                <MapPin size={14} /> {detailsProfile?.city}
              </span>
              <p>{detailsProfile?.bio}</p>
              <div className="tag-row">
                {detailsProfile?.tags.map((tag) => (
                  <span className="interest-tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              {!detailsProfileOverride && (
                <div className="modal-actions">
                  <button
                    className="button button-outline"
                    onClick={() => {
                      setShowDetails(false);
                      moveProfile(false);
                    }}
                  >
                    <ThumbsDown size={15} /> Bỏ qua
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => {
                      setShowDetails(false);
                      moveProfile(true);
                    }}
                  >
                    <Heart size={15} fill="currentColor" /> Gửi lượt thích
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {incomingCoupleInvitation && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setIncomingCoupleInvitation(null);
          }}
        >
          <section
            className="invite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="couple-invitation-notice-title"
          >
            <button
              className="modal-close icon-button"
              onClick={() => setIncomingCoupleInvitation(null)}
              aria-label="Đóng"
            >
              <X size={19} />
            </button>
            <span className="invite-icon">
              <HeartHandshake size={25} />
            </span>
            {incomingCoupleInvitation.related_profile && (
              <div className="incoming-couple-avatars" aria-hidden="true">
                <Avatar image={myPhoto} />
                <span>
                  <Heart size={13} fill="currentColor" />
                </span>
                <Avatar
                  image={
                    profileCardFromPublic(
                      incomingCoupleInvitation.related_profile,
                    ).image
                  }
                />
              </div>
            )}
            <span className="eyebrow">MỘT LỜI MỜI ĐANG CHỜ BẠN</span>
            <h2 id="couple-invitation-notice-title">
              {incomingCoupleInvitation.title}
            </h2>
            <p>{incomingCoupleInvitation.body}</p>
            <div className="modal-actions">
              <button
                className="button button-outline"
                onClick={() => setIncomingCoupleInvitation(null)}
              >
                Để sau
              </button>
              <button
                className="button button-primary"
                onClick={() => {
                  setIncomingCoupleInvitation(null);
                  setCoupleWorkspaceOpened(true);
                  setCoupleWorkspaceTab('invitations');
                  setActiveView('couple');
                }}
              >
                Xem lời mời <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
      {coupleInviteTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !sendingCoupleInvite)
              setCoupleInviteTarget(null);
          }}
        >
          <section
            className="invite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            <button
              className="modal-close icon-button"
              onClick={() => setCoupleInviteTarget(null)}
              disabled={sendingCoupleInvite}
              aria-label="Đóng"
            >
              <X size={19} />
            </button>
            <span className="invite-icon">
              <HeartHandshake size={25} />
            </span>
            <span className="eyebrow">
              MỘT LỜI MỜI CẦN SỰ ĐỒNG Ý CỦA CẢ HAI
            </span>
            <h2 id="invite-title">
              Mời {coupleInviteTarget.name} trở thành Couple?
            </h2>
            <p>
              Match cho phép hai bạn trò chuyện và tìm hiểu. Couple là lựa chọn
              riêng; mỗi người chỉ có thể thuộc một Couple đang hoạt động và
              không gian chung chỉ mở khi cả hai đồng ý.
            </p>
            <div className="modal-actions">
              <button
                className="button button-outline"
                disabled={sendingCoupleInvite}
                onClick={() => setCoupleInviteTarget(null)}
              >
                Để sau
              </button>
              <button
                className="button button-primary"
                disabled={sendingCoupleInvite}
                onClick={async () => {
                  setSendingCoupleInvite(true);
                  try {
                    await apiRequest('/api/couple/invitations', {
                      method: 'POST',
                      body: JSON.stringify({
                        targetUserId: coupleInviteTarget.id,
                      }),
                    });
                    setCoupleInviteTarget(null);
                    notify(
                      `Đã gửi lời mời Couple đến ${coupleInviteTarget.name}.`,
                    );
                  } catch (error) {
                    reportApiError(error, notify);
                  } finally {
                    setSendingCoupleInvite(false);
                  }
                }}
              >
                {sendingCoupleInvite ? 'Đang gửi...' : 'Gửi lời mời Couple'}{' '}
                <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
      {safetyTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !safetyBusy)
              setSafetyTarget(null);
          }}
        >
          <section
            className="invite-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="safety-title"
          >
            <button
              className="modal-close icon-button"
              onClick={() => setSafetyTarget(null)}
              aria-label="Đóng"
              disabled={safetyBusy}
            >
              <X size={19} />
            </button>
            <span className="invite-icon">
              <Shield size={23} />
            </span>
            <span className="eyebrow">AN TOÀN & TÔN TRỌNG</span>
            <h2 id="safety-title">{safetyTarget.name}</h2>
            <p>
              Báo cáo sẽ được gửi riêng cho đội ngũ hỗ trợ. Chặn sẽ ngăn hai tài
              khoản khám phá và tương tác với nhau.
            </p>
            <label className="form-label">
              Lý do báo cáo
              <select
                className="plain-input"
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
              >
                <option>Nội dung không phù hợp</option>
                <option>Quấy rối hoặc bắt nạt</option>
                <option>Tài khoản giả mạo</option>
                <option>Spam hoặc lừa đảo</option>
                <option>Khác</option>
              </select>
            </label>
            <label className="form-label">
              Thông tin bổ sung (không bắt buộc)
              <textarea
                className="plain-input"
                rows={3}
                maxLength={4000}
                value={reportDescription}
                onChange={(event) => setReportDescription(event.target.value)}
              />
            </label>
            <div className="modal-actions">
              {safetyTarget.matchId && (
                <button
                  className="button button-danger-outline"
                  disabled={safetyBusy}
                  onClick={() => {
                    const matchId = safetyTarget.matchId;
                    if (!matchId) return;
                    setMatchRemovalTarget({
                      id: matchId,
                      name: safetyTarget.name,
                    });
                    setSafetyTarget(null);
                  }}
                >
                  Hủy Match
                </button>
              )}
              <button
                className="button button-outline"
                onClick={() => void submitSafetyAction('block')}
                disabled={safetyBusy}
              >
                <Shield size={15} /> Chặn
              </button>
              <button
                className="button button-primary"
                onClick={() => void submitSafetyAction('report')}
                disabled={safetyBusy}
              >
                {safetyBusy ? 'Đang gửi…' : 'Gửi báo cáo'}
              </button>
            </div>
          </section>
        </div>
      )}
      {matchRemovalTarget && (
        <div
          className="modal-backdrop relationship-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !removingMatch)
              setMatchRemovalTarget(null);
          }}
        >
          <section
            className="relationship-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-match-title"
          >
            <button
              className="modal-close icon-button relationship-confirm-close"
              onClick={() => setMatchRemovalTarget(null)}
              aria-label="Đóng"
              disabled={removingMatch}
            >
              <X size={19} />
            </button>
            <div className="relationship-goodbye-art" aria-hidden="true">
              <span className="goodbye-heart goodbye-heart-left">
                <Heart size={25} fill="currentColor" />
              </span>
              <span className="goodbye-heart goodbye-heart-right">
                <Heart size={25} fill="currentColor" />
              </span>
              <span className="goodbye-thread" />
              <Sparkles className="goodbye-sparkle" size={18} />
            </div>
            <span className="eyebrow">MỘT KẾT NỐI ĐÁNG TRÂN TRỌNG</span>
            <h2 id="remove-match-title">
              Bạn muốn hủy Match với {matchRemovalTarget.name}?
            </h2>
            <p>
              Hai bạn sẽ không còn thấy nhau trong danh sách kết nối và cuộc trò
              chuyện sẽ đóng. Nếu chưa chắc chắn, bạn có thể ở lại và tiếp tục
              tìm hiểu.
            </p>
            <div className="relationship-confirm-actions">
              <button
                className="button button-outline"
                disabled={removingMatch}
                onClick={() => setMatchRemovalTarget(null)}
              >
                Ở lại kết nối
              </button>
              <button
                className="button button-danger"
                disabled={removingMatch}
                onClick={() => void removeMatch()}
              >
                {removingMatch ? 'Đang hủy…' : 'Xác nhận hủy Match'}
              </button>
            </div>
          </section>
        </div>
      )}
      {chatImageViewer && (
        <div
          className="chat-image-viewer-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh trong tin nhắn"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setChatImageViewer(null);
          }}
        >
          <button
            type="button"
            className="chat-image-viewer-close"
            onClick={() => setChatImageViewer(null)}
            aria-label="Đóng ảnh"
          >
            <X size={22} />
          </button>
          {chatImageViewer.images.length > 1 && (
            <button
              type="button"
              className="chat-image-viewer-arrow chat-image-viewer-prev"
              aria-label="Ảnh trước"
              onClick={() =>
                setChatImageViewer((current) =>
                  current
                    ? {
                        ...current,
                        index:
                          (current.index - 1 + current.images.length) %
                          current.images.length,
                      }
                    : current,
                )
              }
            >
              <ChevronLeft size={25} />
            </button>
          )}
          <div className="chat-image-viewer-stage">
            <Image
              src={chatImageViewer.images[chatImageViewer.index]}
              alt={`Ảnh ${chatImageViewer.index + 1} trong tin nhắn`}
              fill
              sizes="100vw"
              unoptimized
              priority
            />
          </div>
          {chatImageViewer.images.length > 1 && (
            <>
              <button
                type="button"
                className="chat-image-viewer-arrow chat-image-viewer-next"
                aria-label="Ảnh tiếp theo"
                onClick={() =>
                  setChatImageViewer((current) =>
                    current
                      ? {
                          ...current,
                          index: (current.index + 1) % current.images.length,
                        }
                      : current,
                  )
                }
              >
                <ChevronRight size={25} />
              </button>
              <span className="chat-image-viewer-count">
                {chatImageViewer.index + 1} / {chatImageViewer.images.length}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

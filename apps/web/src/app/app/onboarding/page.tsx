'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  ImagePlus,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest, reportApiError } from '@/lib/client-api';

const steps = ['Cơ bản', 'Ảnh', 'Sở thích', 'Xác minh'];
const interestOptions = [
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
];
type ProfileData = {
  display_name: string;
  date_of_birth: string | null;
  username: string | null;
  gender: string | null;
  bio: string;
  coarse_location: string | null;
};
type PhotoData = { id: string; storage_path: string; signedUrl: string };

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    dateOfBirth: '',
    gender: '',
    city: '',
    bio: '',
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [profileDateOfBirthAvailable, setProfileDateOfBirthAvailable] =
    useState(true);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [account, photoResult, preferenceResult] = await Promise.all([
          apiRequest<{
            profile: ProfileData;
            profileDateOfBirthAvailable: boolean;
          }>('/api/me'),
          apiRequest<{ photos: PhotoData[] }>('/api/profile/photos'),
          apiRequest<{ preferences: { interests: string[] } }>(
            '/api/preferences',
          ),
        ]);
        if (!active) return;
        const data = account.profile;
        setProfileDateOfBirthAvailable(account.profileDateOfBirthAvailable);
        setProfile((current) => ({
          ...current,
          displayName: data.display_name ?? '',
          username: data.username ?? '',
          dateOfBirth: data.date_of_birth ?? '',
          gender: data.gender ?? '',
          bio: data.bio ?? '',
          city: data.coarse_location ?? '',
        }));
        setPhotos(photoResult.photos);
        setInterests(preferenceResult.preferences.interests ?? []);
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải hồ sơ.',
          );
      } finally {
        if (active) setLoaded(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  function updateProfile<K extends keyof typeof profile>(
    key: K,
    value: (typeof profile)[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError('Ảnh cần là JPG, PNG hoặc WEBP và tối đa 8 MB.');
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setSelectedPhoto(file);
    setError('');
  }

  async function saveProfile() {
    if (!profileDateOfBirthAvailable) {
      throw new Error(
        'Máy chủ chưa hỗ trợ cập nhật ngày sinh. Hãy kiểm tra phiên bản NestJS API và PostgreSQL migrations.',
      );
    }
    const result = await apiRequest<{ profile: { username: string | null } }>(
      '/api/me',
      {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: profile.displayName,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
          bio: profile.bio,
          coarseLocation: profile.city || null,
          latitude: null,
          longitude: null,
        }),
      },
    );
    updateProfile('username', result.profile.username ?? '');
  }

  async function saveInterests() {
    await apiRequest('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ interests }),
    });
  }

  async function uploadPhoto() {
    if (!selectedPhoto) return;
    const form = new FormData();
    form.append('file', selectedPhoto);
    form.append('primary', String(photos.length === 0));
    form.append('sortOrder', String(photos.length));
    const result = await apiRequest<{ photo: PhotoData }>(
      '/api/profile/photos',
      { method: 'POST', body: form },
    );
    setPhotos((current) => [...current, result.photo]);
    setSelectedPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview('');
  }

  async function next() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (step === 0) await saveProfile();
      if (step === 1) await uploadPhoto();
      if (step === 2) await saveInterests();
      if (step < steps.length - 1) setStep((current) => current + 1);
      else router.push('/app');
    } catch (saveError) {
      reportApiError(saveError, setError);
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(item: string) {
    setInterests((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Heart size={16} fill="currentColor" />
          </span>
          <span>
            DATING<span className="brand-period">.</span>
          </span>
        </Link>
        <span className="onboarding-save">
          {loaded ? 'Thông tin được lưu vào tài khoản' : 'Đang tải hồ sơ...'}
        </span>
      </header>
      <div className="onboarding-wrap">
        <div className="onboarding-progress">
          <div className="progress-track">
            <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="step-indicators">
            {steps.map((label, index) => (
              <button
                key={label}
                className={
                  index === step
                    ? 'onboarding-step-active'
                    : index < step
                      ? 'onboarding-step-done'
                      : ''
                }
                onClick={() => index < step && setStep(index)}
              >
                <span>
                  {index < step ? <Check size={13} /> : `0${index + 1}`}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
        <section className="onboarding-card" aria-busy={busy}>
          {step === 0 && (
            <>
              <span className="eyebrow">BƯỚC 1 · THÔNG TIN CƠ BẢN</span>
              <h1>
                Bắt đầu từ
                <br />
                <em>chính bạn.</em>
              </h1>
              <p className="onboarding-description">
                Chia sẻ một chút để mọi người có thể gọi tên bạn và hiểu bạn
                đang tìm kiếm điều gì.
              </p>
              <div className="onboarding-fields">
                <label className="form-label">
                  Tên hiển thị
                  <input
                    className="plain-input"
                    value={profile.displayName}
                    onChange={(event) =>
                      updateProfile('displayName', event.target.value)
                    }
                    placeholder="Tên bạn muốn mọi người gọi"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
                <div className="field-pair">
                  <label className="form-label">
                    Ngày sinh
                    <input
                      className="plain-input"
                      type="date"
                      max="9999-12-31"
                      value={profile.dateOfBirth}
                      onChange={(event) =>
                        updateProfile('dateOfBirth', event.target.value)
                      }
                      required
                    />
                  </label>
                  <label className="form-label">
                    Giới tính
                    <select
                      className="plain-input"
                      value={profile.gender}
                      onChange={(event) =>
                        updateProfile('gender', event.target.value)
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
                </div>
                <label className="form-label">
                  Thành phố
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      value={profile.city}
                      onChange={(event) =>
                        updateProfile('city', event.target.value)
                      }
                      placeholder="Ví dụ: TP. Hồ Chí Minh"
                      maxLength={120}
                    />
                  </div>
                  <small>
                    Chỉ hiển thị khu vực gần đúng, không chia sẻ vị trí chính
                    xác.
                  </small>
                </label>
                <label className="form-label">
                  Đôi điều về bạn
                  <textarea
                    className="plain-input"
                    rows={3}
                    value={profile.bio}
                    onChange={(event) =>
                      updateProfile('bio', event.target.value)
                    }
                    placeholder="Mình thích..."
                    maxLength={5000}
                  />
                </label>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <span className="eyebrow">BƯỚC 2 · ẢNH CỦA BẠN</span>
              <h1>
                Một nụ cười
                <br />
                <em>nói được nhiều điều.</em>
              </h1>
              <p className="onboarding-description">
                Ảnh được tải vào kho riêng tư của dự án, tối đa 8 MB mỗi ảnh.
              </p>
              <input
                ref={fileInput}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={selectPhoto}
              />
              <button
                type="button"
                className={`photo-upload-box ${photoPreview || photos.length ? 'photo-added' : ''}`}
                onClick={() => fileInput.current?.click()}
              >
                {photoPreview ? (
                  <>
                    <Image
                      className="upload-demo-avatar"
                      src={photoPreview}
                      alt="Xem trước ảnh hồ sơ"
                      width={160}
                      height={160}
                      unoptimized
                    />
                    <strong>Ảnh đã chọn</strong>
                    <span>Nhấn để chọn ảnh khác</span>
                  </>
                ) : photos[0] ? (
                  <>
                    <Image
                      className="upload-demo-avatar"
                      src={photos[0].signedUrl}
                      alt="Ảnh hồ sơ hiện tại"
                      width={160}
                      height={160}
                      unoptimized
                    />
                    <strong>Đã có {photos.length} ảnh</strong>
                    <span>Nhấn để chọn ảnh khác</span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon">
                      <ImagePlus size={24} />
                    </span>
                    <strong>Thêm ảnh đại diện</strong>
                    <span>JPG, PNG hoặc WEBP · tối đa 8 MB</span>
                  </>
                )}
              </button>
              <div className="upload-guidelines">
                <span>
                  <Check size={15} /> Ảnh rõ mặt và gần đây
                </span>
                <span>
                  <Check size={15} /> Ánh sáng tự nhiên
                </span>
                <span>
                  <Check size={15} /> Không sử dụng ảnh của người khác
                </span>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">BƯỚC 3 · ĐIỀU BẠN QUAN TÂM</span>
              <h1>
                Đâu là điều
                <br />
                <em>khiến bạn vui?</em>
              </h1>
              <p className="onboarding-description">
                Sở thích được lưu trong tùy chọn khám phá của bạn.
              </p>
              <div className="interest-picker">
                {interestOptions.map((item) => (
                  <label
                    key={item}
                    className={`interest-choice ${interests.includes(item) ? 'interest-selected' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={interests.includes(item)}
                      onChange={() => toggleInterest(item)}
                    />
                    {item}
                    {interests.includes(item) && <Check size={13} />}
                  </label>
                ))}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">BƯỚC 4 · XÁC MINH NGƯỜI THẬT</span>
              <h1>
                Kết nối an tâm
                <br />
                <em>bắt đầu từ sự tin cậy.</em>
              </h1>
              <p className="onboarding-description">
                Xác minh người thật hiện chưa được kết nối với nhà cung cấp.
                Trạng thái này không ảnh hưởng đến việc hoàn tất hồ sơ.
              </p>
              <div className="verification-card">
                <div className="verification-symbol">
                  <ShieldCheck size={27} />
                </div>
                <div>
                  <strong>Chưa khả dụng</strong>
                  <p>
                    Chúng tôi sẽ thông báo khi quy trình xác minh được cấu hình
                    an toàn.
                  </p>
                </div>
                <span className="verification-state">ĐỂ SAU</span>
              </div>
              <div className="verification-privacy">
                <ShieldCheck size={16} />
                <span>
                  <strong>Quyền riêng tư của bạn là ưu tiên.</strong>
                  <br />
                  Không tải hoặc lưu dữ liệu khuôn mặt khi chưa có nhà cung cấp
                  xác minh.
                </span>
              </div>
            </>
          )}
          {error && (
            <p className="auth-message auth-message-error" role="alert">
              {error}
            </p>
          )}
          <div className="onboarding-actions">
            {step > 0 ? (
              <button
                className="button button-outline"
                disabled={busy}
                onClick={() => setStep((current) => current - 1)}
              >
                <ArrowLeft size={15} /> Quay lại
              </button>
            ) : (
              <Link className="skip-onboarding" href="/app">
                Để sau
              </Link>
            )}
            <button
              className="button button-primary"
              disabled={busy || !loaded}
              onClick={() => void next()}
            >
              {busy
                ? 'Đang lưu...'
                : step === steps.length - 1
                  ? 'Hoàn thành hồ sơ'
                  : 'Lưu và tiếp tục'}{' '}
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <div className="onboarding-note">
          <ShieldCheck size={14} /> Bạn có thể cập nhật thông tin hoặc bỏ qua
          các bước tùy chọn bất cứ lúc nào.
        </div>
      </div>
      <footer className="auth-footer">
        <span>© 2026 DATING</span>
        <span>Thông tin vị trí chính xác không được hiển thị công khai.</span>
      </footer>
    </main>
  );
}

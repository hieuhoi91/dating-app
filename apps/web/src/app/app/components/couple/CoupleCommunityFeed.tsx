'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Camera, Heart, HeartHandshake, ImagePlus, MapPin, Send, Sparkles, Star, X } from 'lucide-react';
import { getRealtimeSocket } from '@/lib/realtime';
import CoupleLocationPicker, { type CoupleLocation } from './CoupleLocationPicker';
import type { CoupleNotice } from './types';

type FeedEntry = {
  id: string;
  kind: 'post' | 'memory';
  coupleId: string;
  createdBy: string;
  content: string;
  title: string | null;
  createdAt: string;
  memoryDate: string | null;
  locationName: string;
  locationArea: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  reactions: Record<string, number>;
  myReaction: string | null;
  members: { id: string; name: string; photo: string | null }[];
  photos: { id: string; role: string; url: string }[];
};
type PhotoPreview = { file: File; url: string };
const feedReactions = [
  { type: 'heart', emoji: '❤️', label: 'Thả tim' },
  { type: 'love', emoji: '😍', label: 'Yêu thích' },
  { type: 'laugh', emoji: '😂', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CoupleCommunityFeed({ coupleId, notify }: { coupleId: string; notify: CoupleNotice }) {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<CoupleLocation | null>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const [reactionMenuFor, setReactionMenuFor] = useState<string | null>(null);
  const [schedulingFor, setSchedulingFor] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const fileInputId = `couple-feed-photos-${coupleId}`;
  const cameraInputId = `couple-feed-camera-${coupleId}`;
  const previewsRef = useRef<PhotoPreview[]>([]);
  const reactionLongPressTimer = useRef<number | null>(null);
  const reactionLongPressTriggered = useRef(false);
  const reactionMenuCloseTimer = useRef<number | null>(null);

  useEffect(() => {
    previewsRef.current = photos;
  }, [photos]);

  useEffect(() => () => {
    previewsRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, []);

  useEffect(() => () => {
    if (reactionLongPressTimer.current !== null) window.clearTimeout(reactionLongPressTimer.current);
    if (reactionMenuCloseTimer.current !== null) window.clearTimeout(reactionMenuCloseTimer.current);
  }, []);

  function cancelReactionMenuClose() {
    if (reactionMenuCloseTimer.current !== null) {
      window.clearTimeout(reactionMenuCloseTimer.current);
      reactionMenuCloseTimer.current = null;
    }
  }

  function scheduleReactionMenuClose(entryId: string) {
    cancelReactionMenuClose();
    reactionMenuCloseTimer.current = window.setTimeout(() => {
      setReactionMenuFor((current) => current === entryId ? null : current);
      reactionMenuCloseTimer.current = null;
    }, 800);
  }

  const loadFeed = useCallback(async () => {
    const response = await fetch(`/api/couple/feed?coupleId=${encodeURIComponent(coupleId)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Không thể tải bảng tin Couple.');
    return result.feed as FeedEntry[];
  }, [coupleId]);

  useEffect(() => {
    let active = true;
    void loadFeed()
      .then((entries) => { if (active) setFeed(entries); })
      .catch((error: unknown) => {
        if (active) notify(error instanceof Error ? error.message : 'Không thể tải bảng tin Couple.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loadFeed, notify]);

  useEffect(() => {
    function handleRefresh() {
      void loadFeed()
        .then(setFeed)
        .catch((error: unknown) => notify(error instanceof Error ? error.message : 'Không thể cập nhật bảng tin Couple.'));
    }
    window.addEventListener('couple-feed-refresh', handleRefresh);
    return () => window.removeEventListener('couple-feed-refresh', handleRefresh);
  }, [loadFeed, notify]);

  useEffect(() => {
    let active = true;
    let socket: Awaited<ReturnType<typeof getRealtimeSocket>> | undefined;
    const handleCoupleUpdate = (event: { coupleId?: string }) => {
      if (event.coupleId && event.coupleId !== coupleId) return;
      void loadFeed()
        .then(setFeed)
        .catch((error: unknown) => notify(error instanceof Error ? error.message : 'Không thể cập nhật bảng tin Couple.'));
    };
    void getRealtimeSocket()
      .then((connectedSocket) => {
        if (!active) return;
        socket = connectedSocket;
        socket.on('couple:updated', handleCoupleUpdate);
      })
      .catch((error: unknown) => {
        if (active) notify(error instanceof Error ? error.message : 'Không thể kết nối bảng tin Couple.');
      });
    return () => {
      active = false;
      socket?.off('couple:updated', handleCoupleUpdate);
    };
  }, [coupleId, loadFeed, notify]);

  function addPhotos(fileList: FileList | null) {
    if (!fileList?.length) return;
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const next: PhotoPreview[] = [];
    const errors: string[] = [];
    const remaining = 6 - photos.length;
    Array.from(fileList).forEach((file) => {
      if (!supportedTypes.includes(file.type)) errors.push(`${file.name}: định dạng ảnh không hỗ trợ.`);
      else if (file.size === 0 || file.size > 8 * 1024 * 1024) errors.push(`${file.name}: ảnh phải nhỏ hơn 8 MB.`);
      else if (next.length < remaining) next.push({ file, url: URL.createObjectURL(file) });
      else errors.push('Mỗi bài viết có thể tải lên tối đa 6 ảnh.');
    });
    if (next.length) setPhotos((current) => [...current, ...next]);
    if (errors.length) notify(errors.join(' '));
  }

  function removePhoto(photoUrl: string) {
    const photo = photos.find((item) => item.url === photoUrl);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhotos((current) => current.filter((item) => item.url !== photoUrl));
  }

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    let postCreated = false;
    let postId: string | null = null;
    try {
      const response = await fetch('/api/couple/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId,
          content: content.trim(),
          locationName: location?.name ?? '',
          locationArea: location?.area ?? '',
          locationLatitude: location?.latitude ?? null,
          locationLongitude: location?.longitude ?? null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Không thể đăng bài.');
      if (typeof result.postId !== 'string') throw new Error('Bài viết đã lưu nhưng máy chủ không trả về mã bài viết.');
      postCreated = true;
      postId = result.postId;
      try {
        for (const [index, photo] of photos.entries()) {
          const photoForm = new FormData();
          photoForm.append('file', photo.file);
          const photoResponse = await fetch(`/api/couple/feed/${postId}/media`, { method: 'POST', body: photoForm });
          const photoResult = await photoResponse.json();
          if (!photoResponse.ok) throw new Error(photoResult.error ?? `Không thể tải ảnh ${index + 1}.`);
        }
      } catch (uploadError) {
        const rollback = await fetch(`/api/couple/feed/${postId}`, { method: 'DELETE' });
        if (!rollback.ok) {
          const rollbackResult = await rollback.json();
          throw new Error(`${uploadError instanceof Error ? uploadError.message : 'Không thể tải ảnh.'} Bài viết chưa được dọn thành công: ${rollbackResult.error ?? 'vui lòng kiểm tra bảng tin.'}`);
        }
        postCreated = false;
        throw uploadError;
      }
      const notificationResponse = await fetch(`/api/couple/feed/${postId}/notify`, { method: 'POST' });
      if (!notificationResponse.ok) {
        const notificationResult = await notificationResponse.json();
        throw new Error(notificationResult.error ?? 'Không gửi được thông báo cho người ấy.');
      }
      setContent('');
      setLocation(null);
      photos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPhotos([]);
      const entries = await loadFeed();
      setFeed(entries);
      notify('Bài viết đã được chia sẻ với cộng đồng Couple.');
    } catch (error) {
      if (postCreated) {
        setContent('');
        setLocation(null);
        photos.forEach((photo) => URL.revokeObjectURL(photo.url));
        setPhotos([]);
        const message = error instanceof Error ? error.message : 'chưa gửi được thông báo.';
        try {
          setFeed(await loadFeed());
          notify(`Bài viết đã đăng, nhưng ${message}`);
        } catch (refreshError) {
          notify(`Bài viết đã đăng, nhưng ${message} ${refreshError instanceof Error ? refreshError.message : 'Không thể làm mới bảng tin.'}`);
        }
      } else {
        notify(error instanceof Error ? error.message : 'Không thể đăng bài.');
      }
    } finally {
      setPosting(false);
    }
  }

  async function setReaction(entry: FeedEntry, reaction: typeof feedReactions[number]['type']) {
    if (reactingTo || entry.kind !== 'post') return;
    setReactingTo(entry.id);
    try {
      const response = await fetch(`/api/couple/feed/${entry.id}/reactions`, entry.myReaction === reaction
        ? { method: 'DELETE' }
        : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction, coupleId }),
        });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Không thể cập nhật cảm xúc.');
      setFeed(await loadFeed());
      setReactionMenuFor(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể cập nhật cảm xúc.');
    } finally {
      setReactingTo(null);
    }
  }

  async function scheduleDate(event: React.FormEvent<HTMLFormElement>, entry: FeedEntry) {
    event.preventDefault();
    if (savingPlan || !scheduleAt) return;
    setSavingPlan(true);
    try {
      const mapLink = entry.locationLatitude !== null && entry.locationLongitude !== null
        ? `https://www.openstreetmap.org/?mlat=${entry.locationLatitude}&mlon=${entry.locationLongitude}#map=17/${entry.locationLatitude}/${entry.locationLongitude}`
        : '';
      const locationText = [entry.locationName, entry.locationArea, mapLink].filter(Boolean).join(' · ').slice(0, 300);
      const response = await fetch('/api/couple/date-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId,
          title: scheduleTitle.trim(),
          startsAt: new Date(scheduleAt).toISOString(),
          location: locationText,
          notes: scheduleNotes.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Không thể lên lịch hẹn.');
      setSchedulingFor(null);
      notify('Đã thêm buổi hẹn vào lịch Couple.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể lên lịch hẹn.');
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <section className="couple-community">
      <header className="couple-community-heading">
        <div>
          <span className="eyebrow">CHUYỆN CỦA CÁC CẶP ĐÔI</span>
          <h2>Bảng tin Couple</h2>
        </div>
        <span className="couple-community-badge"><HeartHandshake size={15} /> Cộng đồng</span>
      </header>
      <p className="couple-community-intro">Chia sẻ khoảnh khắc đẹp và gợi ý những nơi hẹn hò cho các Couple khác.</p>

      <form className="couple-community-composer" onSubmit={(event) => void submitPost(event)}>
        <label className="couple-community-content-label" htmlFor="couple-feed-content">Hôm nay hai bạn muốn chia sẻ điều gì?</label>
        <textarea
          id="couple-feed-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Kể về một khoảnh khắc đáng nhớ, một buổi hẹn thật vui..."
          rows={4}
          maxLength={3000}
          required
        />
        <CoupleLocationPicker value={location} onChange={setLocation} />
        <div className="couple-feed-photo-actions">
          <label className="couple-feed-photo-button" htmlFor={cameraInputId}><Camera size={16} /> Chụp ảnh</label>
          <input id={cameraInputId} className="couple-feed-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" onChange={(event) => { addPhotos(event.currentTarget.files); event.currentTarget.value = ''; }} />
          <label className="couple-feed-photo-button" htmlFor={fileInputId}><ImagePlus size={16} /> Chọn ảnh từ máy</label>
          <input id={fileInputId} className="couple-feed-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => { addPhotos(event.currentTarget.files); event.currentTarget.value = ''; }} />
          <small>{photos.length}/6 ảnh · tối đa 8 MB mỗi ảnh</small>
        </div>
        {photos.length > 0 && (
          <div className="couple-feed-photo-previews">
            {photos.map((photo) => (
              <div key={photo.url}>
                <Image src={photo.url} alt={`Ảnh đã chọn: ${photo.file.name}`} width={160} height={120} unoptimized />
                <button type="button" aria-label={`Bỏ ảnh ${photo.file.name}`} onClick={() => removePhoto(photo.url)}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="couple-community-composer-footer">
          <span><Sparkles size={14} /> Bài viết, ảnh và vị trí sẽ hiển thị với các Couple đang hoạt động.</span>
          <button className="button button-primary" type="submit" disabled={posting || !content.trim()}>
            <Send size={15} /> {posting ? 'Đang đăng…' : 'Chia sẻ'}
          </button>
        </div>
      </form>

      <div className="couple-community-feed" aria-live="polite">
        {loading ? <p className="couple-community-empty">Đang tải bảng tin…</p> : feed.length === 0 ? (
          <div className="couple-community-empty">
            <HeartHandshake size={25} />
            <strong>Chưa có bài chia sẻ nào</strong>
            <span>Hãy đăng câu chuyện đầu tiên của hai bạn nhé.</span>
          </div>
        ) : feed.map((entry) => (
          <article className="couple-community-card" key={`${entry.kind}-${entry.id}`}>
            <header className="couple-community-card-header">
              <div className="couple-community-avatars" aria-hidden="true">
                {entry.members.slice(0, 2).map((member, index) => member.photo ? (
                  <Image key={member.id} src={member.photo} alt="" width={40} height={40} unoptimized className={index ? 'couple-community-avatar avatar-overlap' : 'couple-community-avatar'} />
                ) : (
                  <span key={member.id} className={index ? 'couple-community-avatar avatar-overlap' : 'couple-community-avatar'}>
                    {member.name.slice(0, 1).toLocaleUpperCase()}
                  </span>
                ))}
                {entry.members.length === 0 && <span className="couple-community-avatar"><HeartHandshake size={16} /></span>}
              </div>
              <div className="couple-community-byline">
                <strong>{entry.members.map((member) => member.name).join(' & ') || 'Một Couple'}</strong>
                <small>{formatDate(entry.createdAt)}</small>
              </div>
              {entry.kind === 'memory' && <span className="couple-community-memory-badge"><Star size={13} fill="currentColor" /> Kỷ niệm</span>}
            </header>
            {entry.title && <h3 className="couple-community-memory-title">{entry.title}</h3>}
            {entry.content && <p className="couple-community-post-content">{entry.content}</p>}
            {entry.photos.length > 0 && (
              <div className="couple-community-photos">
                {entry.photos.slice(0, 4).map((photo) => (
                  <Image key={photo.id} src={photo.url} alt={entry.title ? `Ảnh kỷ niệm ${entry.title}` : 'Ảnh kỷ niệm Couple'} width={720} height={520} unoptimized />
                ))}
              </div>
            )}
            {entry.locationName && (
              <div className="couple-community-place-row">
                <a
                  className="couple-community-place"
                  href={entry.locationLatitude !== null && entry.locationLongitude !== null
                    ? `https://www.openstreetmap.org/?mlat=${entry.locationLatitude}&mlon=${entry.locationLongitude}#map=17/${entry.locationLatitude}/${entry.locationLongitude}`
                    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(entry.locationName)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={16} />
                  <span><strong>{entry.locationName}</strong>{entry.locationArea && <small>{entry.locationArea}</small>}</span>
                </a>
                <button
                  type="button"
                  className="couple-feed-plan-button"
                  onClick={() => {
                    setSchedulingFor(entry.id);
                    setScheduleTitle(`Buổi hẹn: ${entry.locationName || 'địa điểm gợi ý'}`.slice(0, 160));
                    setScheduleNotes(entry.title ? `Gợi ý từ kỷ niệm: ${entry.title}` : 'Gợi ý từ bảng tin Couple.');
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setMinutes(Math.ceil(tomorrow.getMinutes() / 30) * 30, 0, 0);
                    setScheduleAt(new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
                  }}
                >
                  <CalendarDays size={15} /> Lên lịch hẹn
                </button>
              </div>
            )}
            {entry.memoryDate && <small className="couple-community-memory-date"><CalendarDays size={13} /> Kỷ niệm ngày {formatDate(entry.memoryDate)}</small>}
            {entry.kind === 'post' && (
              <div className="couple-feed-reaction-row">
                <div
                  className="couple-feed-reaction-picker"
                  onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') {
                      cancelReactionMenuClose();
                      setReactionMenuFor(entry.id);
                    }
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') scheduleReactionMenuClose(entry.id);
                  }}
                >
                  <button
                    type="button"
                    className={`couple-feed-reaction-button${entry.myReaction ? ' is-active' : ''}`}
                    onPointerDown={(event) => {
                      if (event.pointerType !== 'touch') return;
                      reactionLongPressTriggered.current = false;
                      if (reactionLongPressTimer.current !== null) window.clearTimeout(reactionLongPressTimer.current);
                      reactionLongPressTimer.current = window.setTimeout(() => {
                        reactionLongPressTriggered.current = true;
                        setReactionMenuFor(entry.id);
                        reactionLongPressTimer.current = null;
                      }, 500);
                    }}
                    onPointerUp={() => {
                      if (reactionLongPressTimer.current !== null) {
                        window.clearTimeout(reactionLongPressTimer.current);
                        reactionLongPressTimer.current = null;
                      }
                    }}
                    onPointerCancel={() => {
                      if (reactionLongPressTimer.current !== null) {
                        window.clearTimeout(reactionLongPressTimer.current);
                        reactionLongPressTimer.current = null;
                      }
                    }}
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={() => {
                      if (reactionLongPressTriggered.current) {
                        reactionLongPressTriggered.current = false;
                        return;
                      }
                      void setReaction(entry, 'heart');
                    }}
                    disabled={reactingTo !== null}
                    aria-label={entry.myReaction ? 'Đổi hoặc bỏ cảm xúc' : 'Thả cảm xúc'}
                    aria-pressed={entry.myReaction !== null}
                    aria-expanded={reactionMenuFor === entry.id}
                  ><Heart size={18} fill={entry.myReaction ? 'currentColor' : 'none'} /></button>
                  {reactionMenuFor === entry.id && (
                    <div
                      className="couple-feed-reaction-menu"
                      role="group"
                      aria-label="Chọn cảm xúc"
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse') cancelReactionMenuClose();
                      }}
                      onPointerLeave={(event) => {
                        if (event.pointerType === 'mouse') scheduleReactionMenuClose(entry.id);
                      }}
                    >
                      {feedReactions.map((reaction) => (
                        <button
                          key={reaction.type}
                          type="button"
                          aria-label={reaction.label}
                          title={reaction.label}
                          disabled={reactingTo !== null}
                          onClick={() => void setReaction(entry, reaction.type)}
                        >
                          {reaction.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span>
                  {feedReactions.flatMap((reaction) => (entry.reactions[reaction.type] ?? 0) > 0
                    ? [`${reaction.emoji} ${entry.reactions[reaction.type]}`]
                    : []).join(' · ') || 'Chưa có cảm xúc'}
                </span>
              </div>
            )}
            {schedulingFor === entry.id && (
              <form className="couple-feed-schedule-form" onSubmit={(event) => void scheduleDate(event, entry)}>
                <div className="couple-feed-schedule-heading">
                  <strong>Lên lịch hẹn cho hai bạn</strong>
                  <button type="button" aria-label="Đóng lịch hẹn" onClick={() => setSchedulingFor(null)}><X size={15} /></button>
                </div>
                <label>Tên buổi hẹn<input value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} maxLength={160} required /></label>
                <label>Thời gian<input type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} required /></label>
                <label>Ghi chú<textarea value={scheduleNotes} onChange={(event) => setScheduleNotes(event.target.value)} rows={2} maxLength={3000} /></label>
                <button className="button button-primary" type="submit" disabled={savingPlan}>
                  <CalendarDays size={15} /> {savingPlan ? 'Đang lưu…' : 'Thêm vào lịch Couple'}
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

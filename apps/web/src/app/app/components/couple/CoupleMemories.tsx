'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Bookmark, CalendarDays, ChevronLeft, ChevronRight, ImagePlus, Plus, Star, Upload, X } from 'lucide-react';
import CoupleLocationPicker, { type CoupleLocation } from './CoupleLocationPicker';
import type { CoupleNotice } from './types';

type Memory = {
  id: string;
  title: string;
  memory_date: string;
  description: string;
  isPublic: boolean;
  locationName: string;
  locationArea: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  thumbnail: string | null;
  gallery: string[];
};
type StoredMemory = {
  id: string;
  title: string;
  memory_date: string;
  description: string;
  is_public: boolean;
  location_name: string;
  location_area: string;
  location_latitude: number | null;
  location_longitude: number | null;
  memory_media: { media_role: 'thumbnail' | 'gallery'; sort_order: number; signedUrl: string | null }[];
};

export default function CoupleMemories({ coupleId, notify }: { coupleId: string; notify: CoupleNotice }) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState<CoupleLocation | null>(null);
  const [publishToFeed, setPublishToFeed] = useState(false);
  const [updatingMemoryId, setUpdatingMemoryId] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [pendingMemoryId, setPendingMemoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewingMemoryId, setViewingMemoryId] = useState<string | null>(null);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const objectUrls = useRef(new Set<string>());
  const filesByPreview = useRef(new Map<string, File>());
  const uploadedPreviews = useRef(new Set<string>());

  const loadMemories = useCallback(async () => {
    const response = await fetch(`/api/couple/memories?coupleId=${encodeURIComponent(coupleId)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? 'Không thể tải kỷ niệm.');
    return (result.memories as StoredMemory[]).map((memory) => ({
      id: memory.id,
      title: memory.title,
      memory_date: memory.memory_date,
      description: memory.description,
      isPublic: memory.is_public,
      locationName: memory.location_name,
      locationArea: memory.location_area,
      locationLatitude: memory.location_latitude,
      locationLongitude: memory.location_longitude,
      thumbnail: memory.memory_media.find((media) => media.media_role === 'thumbnail')?.signedUrl ?? null,
      gallery: memory.memory_media.filter((media) => media.media_role === 'gallery').sort((a, b) => a.sort_order - b.sort_order).flatMap((media) => media.signedUrl ? [media.signedUrl] : []),
    }));
  }, [coupleId]);
  const refreshMemories = useCallback(async () => setMemories(await loadMemories()), [loadMemories]);

  useEffect(() => {
    let active = true;
    void loadMemories()
      .then((loaded) => { if (active) setMemories(loaded); })
      .catch((error: unknown) => { if (active) notify(error instanceof Error ? error.message : 'Không thể tải kỷ niệm.'); });
    return () => { active = false; };
  }, [loadMemories, notify]);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const activeMemory = memories.find((memory) => memory.id === viewingMemoryId) ?? null;
  const activePhotos = activeMemory
    ? [...(activeMemory.thumbnail ? [activeMemory.thumbnail] : []), ...activeMemory.gallery]
    : [];
  const activeImageIndex = activePhotos.length
    ? ((viewingImageIndex % activePhotos.length) + activePhotos.length) % activePhotos.length
    : 0;
  const galleryStageRef = useRef<HTMLDivElement>(null);

  const moveImage = useCallback((direction: -1 | 1) => {
    if (activePhotos.length < 2) return;
    setViewingImageIndex((index) => (index + direction + activePhotos.length) % activePhotos.length);
  }, [activePhotos.length]);

  useEffect(() => {
    if (!activeMemory) return;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setViewingMemoryId(null);
      if (event.key === 'ArrowRight' && activePhotos.length > 1) setViewingImageIndex((index) => (index + 1) % activePhotos.length);
      if (event.key === 'ArrowLeft' && activePhotos.length > 1) setViewingImageIndex((index) => (index - 1 + activePhotos.length) % activePhotos.length);
    }
    const stage = galleryStageRef.current;
    function handleWheel(event: WheelEvent) {
      if (activePhotos.length < 2) return;
      event.preventDefault();
      moveImage(event.deltaY > 0 || event.deltaX > 0 ? 1 : -1);
    }
    window.addEventListener('keydown', handleKeyDown);
    stage?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      stage?.removeEventListener('wheel', handleWheel);
    };
  }, [activeMemory, activePhotos.length, moveImage]);

  function openMemory(memoryId: string) {
    setViewingMemoryId(memoryId);
    setViewingImageIndex(0);
  }

  function createPreview(file: File) {
    const url = URL.createObjectURL(file);
    objectUrls.current.add(url);
    return url;
  }

  function removePreview(url: string) {
    URL.revokeObjectURL(url);
    objectUrls.current.delete(url);
    filesByPreview.current.delete(url);
    uploadedPreviews.current.delete(url);
  }

  function clearForm() {
    if (thumbnail) removePreview(thumbnail);
    gallery.forEach(removePreview);
    setThumbnail(null);
    setGallery([]);
    setUploadError('');
    setTitle('');
    setDate('');
    setNote('');
    setLocation(null);
    setPublishToFeed(false);
    setPendingMemoryId(null);
    setIsAdding(false);
  }

  async function cancelMemory() {
    if (saving) return;
    if (pendingMemoryId) {
      try {
        const response = await fetch(`/api/couple/memories/${pendingMemoryId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Không thể hủy kỷ niệm.');
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Không thể hủy kỷ niệm.');
        return;
      }
    }
    clearForm();
  }

  function isSupportedImage(file: File) {
    return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type);
  }

  function selectThumbnail(file: File | undefined) {
    if (!file) return;
    setUploadError('');
    if (!isSupportedImage(file)) {
      setUploadError('Ảnh bìa chỉ hỗ trợ định dạng JPG, PNG, WEBP hoặc GIF.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Ảnh bìa cần có dung lượng tối đa 8 MB.');
      return;
    }
    if (thumbnail) removePreview(thumbnail);
    const preview = createPreview(file);
    filesByPreview.current.set(preview, file);
    setThumbnail(preview);
  }

  function selectGallery(files: FileList | null) {
    if (!files?.length) return;
    setUploadError('');
    const remaining = 6 - gallery.length;
    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      if (!isSupportedImage(file)) errors.push(`${file.name}: định dạng ảnh không hỗ trợ.`);
      else if (file.size > 8 * 1024 * 1024) errors.push(`${file.name}: vượt quá 8 MB.`);
      else if (validFiles.length < remaining) validFiles.push(file);
      else errors.push('Gallery chỉ nhận tối đa 6 ảnh.');
    });

    if (validFiles.length) {
      const previews = validFiles.map((file) => {
        const preview = createPreview(file);
        filesByPreview.current.set(preview, file);
        return preview;
      });
      setGallery((current) => [...current, ...previews]);
    }
    if (errors.length) setUploadError(errors.join(' '));
  }

  async function addMemory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !title.trim() || !date) return;
    setSaving(true);
    setUploadError('');
    try {
      let memoryId = pendingMemoryId;
      if (!memoryId) {
        const response = await fetch('/api/couple/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupleId,
            title: title.trim(),
            memoryDate: date,
            description: note.trim(),
            locationName: location?.name ?? '',
            locationArea: location?.area ?? '',
            locationLatitude: location?.latitude ?? null,
            locationLongitude: location?.longitude ?? null,
            isPublic: publishToFeed,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Không thể lưu kỷ niệm.');
        memoryId = result.memory.id as string;
        setPendingMemoryId(memoryId);
      }

      const pendingFiles = [
        ...(thumbnail ? [{ preview: thumbnail, role: 'thumbnail' as const, sortOrder: 0 }] : []),
        ...gallery.map((preview, index) => ({ preview, role: 'gallery' as const, sortOrder: index })),
      ];
      for (const item of pendingFiles) {
        if (uploadedPreviews.current.has(item.preview)) continue;
        const file = filesByPreview.current.get(item.preview);
        if (!file) continue;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('role', item.role);
        formData.append('sortOrder', String(item.sortOrder));
        const response = await fetch(`/api/couple/memories/${memoryId}/media`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Kỷ niệm đã lưu nhưng có ảnh chưa tải lên được.');
        uploadedPreviews.current.add(item.preview);
      }
      await refreshMemories();
      clearForm();
      setPendingMemoryId(null);
      if (publishToFeed) window.dispatchEvent(new Event('couple-feed-refresh'));
      notify(publishToFeed ? 'Kỷ niệm đã được chia sẻ lên bảng tin Couple.' : 'Kỷ niệm và ảnh đã được lưu riêng tư.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể lưu kỷ niệm.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublic(memory: Memory) {
    if (updatingMemoryId) return;
    setUpdatingMemoryId(memory.id);
    try {
      const response = await fetch(`/api/couple/memories/${memory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !memory.isPublic }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Không thể cập nhật trạng thái chia sẻ.');
      setMemories((current) => current.map((item) => item.id === memory.id ? { ...item, isPublic: !memory.isPublic } : item));
      window.dispatchEvent(new Event('couple-feed-refresh'));
      notify(memory.isPublic ? 'Kỷ niệm đã được ẩn khỏi bảng tin.' : 'Kỷ niệm đã được chia sẻ lên bảng tin Couple.');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái chia sẻ.');
    } finally {
      setUpdatingMemoryId(null);
    }
  }

  return (
    <section className="couple-panel">
      <div className="couple-panel-heading">
        <div><span className="eyebrow">CẤT GIỮ NHỮNG NGÀY ĐẸP</span><h2>Kỷ niệm của chúng mình</h2></div>
        <button className="button button-primary" onClick={() => { if (isAdding) void cancelMemory(); else setIsAdding(true); }}>
          {isAdding ? <><X size={15} /> Đóng</> : <><Plus size={16} /> Thêm kỷ niệm</>}
        </button>
      </div>
      <p className="couple-panel-intro">Kỷ niệm luôn riêng tư cho đến khi hai bạn bật dấu sao để chia sẻ lên bảng tin Couple.</p>
      {isAdding && (
        <form className="couple-entry-form" onSubmit={(event) => void addMemory(event)}>
          <label>Tên kỷ niệm<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Lần đầu cùng đi biển" maxLength={80} required /></label>
          <label>Ngày diễn ra<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="couple-form-wide">Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Điều gì khiến ngày này đặc biệt?" rows={3} maxLength={500} /></label>
          <div className="couple-form-wide"><CoupleLocationPicker value={location} onChange={setLocation} /></div>
          <label className="couple-memory-publish-toggle couple-form-wide">
            <input type="checkbox" checked={publishToFeed} onChange={(event) => setPublishToFeed(event.target.checked)} />
            <span><Star size={16} /> Đánh dấu sao và chia sẻ kỷ niệm này lên bảng tin Couple</span>
          </label>
          <div className="couple-memory-upload-grid couple-form-wide">
            <div className="couple-memory-upload-field">
              <span className="couple-upload-label">Ảnh thumbnail</span>
              <label className="couple-upload-zone" htmlFor="couple-memory-thumbnail">
                {thumbnail ? (
                  <Image className="couple-thumbnail-preview" src={thumbnail} alt="Xem trước ảnh thumbnail" width={800} height={450} unoptimized />
                ) : (
                  <><ImagePlus size={21} /><span>Chọn ảnh bìa</span><small>JPG, PNG, WEBP hoặc GIF · tối đa 8 MB</small></>
                )}
              </label>
              <input
                className="couple-file-input"
                id="couple-memory-thumbnail"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  selectThumbnail(event.currentTarget.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
              {thumbnail && (
                <button className="couple-remove-image" type="button" onClick={() => { removePreview(thumbnail); setThumbnail(null); }}>
                  <X size={13} /> Bỏ ảnh bìa
                </button>
              )}
            </div>
            <div className="couple-memory-upload-field">
              <span className="couple-upload-label">Gallery <small>({gallery.length}/6)</small></span>
              <label className="couple-upload-zone couple-gallery-upload-zone" htmlFor="couple-memory-gallery">
                <Upload size={19} /><span>Thêm ảnh vào gallery</span><small>Có thể chọn tối đa 6 ảnh, mỗi ảnh 8 MB</small>
              </label>
              <input
                className="couple-file-input"
                id="couple-memory-gallery"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={(event) => {
                  selectGallery(event.currentTarget.files);
                  event.currentTarget.value = '';
                }}
              />
              {gallery.length > 0 && (
                <div className="couple-gallery-preview">
                  {gallery.map((url, index) => (
                    <div className="couple-gallery-preview-item" key={url}>
                      <Image src={url} alt={`Ảnh gallery ${index + 1}`} width={160} height={110} unoptimized />
                      <button type="button" aria-label={`Xóa ảnh gallery ${index + 1}`} onClick={() => { removePreview(url); setGallery((items) => items.filter((item) => item !== url)); }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {uploadError && <p className="couple-upload-error couple-form-wide" role="alert">{uploadError}</p>}
          <div className="couple-entry-actions">
            <button className="button button-outline" type="button" onClick={() => void cancelMemory()} disabled={saving}>Hủy</button>
            <button className="button button-primary" type="submit" disabled={saving}><Bookmark size={15} /> {saving ? 'Đang lưu…' : 'Lưu kỷ niệm'}</button>
          </div>
        </form>
      )}
      <div className="couple-memory-grid">
        {memories.map((memory) => (
          <article className="couple-memory-card" key={memory.id}>
            {memory.thumbnail ? (
              <button className="couple-memory-thumbnail-button" onClick={() => openMemory(memory.id)} aria-label={`Xem kỷ niệm ${memory.title}`}>
                <Image className="couple-memory-thumbnail" src={memory.thumbnail} alt={`Ảnh bìa kỷ niệm ${memory.title}`} width={800} height={450} unoptimized />
              </button>
            ) : (
              <button className="couple-memory-art couple-memory-art-button" onClick={() => openMemory(memory.id)} aria-label={`Xem kỷ niệm ${memory.title}`}>
                <ImagePlus size={25} /><span>{memory.gallery.length ? `${memory.gallery.length} ảnh · Xem kỷ niệm` : 'Xem kỷ niệm'}</span>
              </button>
            )}
            <button className="couple-memory-copy couple-memory-details-button" onClick={() => openMemory(memory.id)} aria-label={`Đọc mô tả kỷ niệm ${memory.title}`}>
              <span><CalendarDays size={13} /> {new Date(`${memory.memory_date}T00:00:00`).toLocaleDateString('vi-VN')}</span>
              <h3>{memory.title}</h3>
              {memory.description && <p>{memory.description}</p>}
              {(memory.locationName || memory.locationArea) && <small className="couple-memory-location">{[memory.locationName, memory.locationArea].filter(Boolean).join(' · ')}</small>}
              {memory.gallery.length > 0 && <small className="couple-memory-photo-count">{memory.gallery.length} ảnh trong kỷ niệm · Nhấn để xem</small>}
            </button>
            <button
              className={`couple-memory-share-button${memory.isPublic ? ' is-shared' : ''}`}
              type="button"
              onClick={() => void togglePublic(memory)}
              disabled={updatingMemoryId !== null}
              aria-pressed={memory.isPublic}
              aria-label={memory.isPublic ? 'Ẩn kỷ niệm khỏi bảng tin Couple' : 'Chia sẻ kỷ niệm lên bảng tin Couple'}
            >
              <Star size={15} fill={memory.isPublic ? 'currentColor' : 'none'} />
              {updatingMemoryId === memory.id ? 'Đang cập nhật…' : memory.isPublic ? 'Đã chia sẻ' : 'Chia sẻ'}
            </button>
          </article>
        ))}
      </div>
      {activeMemory && (
          <div className="couple-gallery-lightbox" role="presentation" onClick={() => setViewingMemoryId(null)}>
            <section className="couple-gallery-dialog" role="dialog" aria-modal="true" aria-label={`Kỷ niệm: ${activeMemory.title}`} onClick={(event) => event.stopPropagation()}>
              <div className="couple-gallery-dialog-heading">
                <span>
                  <strong>{activeMemory.title}</strong>
                  <small>{new Date(`${activeMemory.memory_date}T00:00:00`).toLocaleDateString('vi-VN')}</small>
                </span>
                <button aria-label="Đóng chi tiết kỷ niệm" onClick={() => setViewingMemoryId(null)}><X size={19} /></button>
              </div>
              {activeMemory.description && <p className="couple-gallery-description">{activeMemory.description}</p>}
              <div
                className="couple-gallery-large-image"
                ref={galleryStageRef}
              >
                {activePhotos.length ? (
                  <>
                    <Image src={activePhotos[activeImageIndex]} alt={`${activeMemory.title}, ảnh ${activeImageIndex + 1}`} width={1400} height={1000} unoptimized />
                    {activePhotos.length > 1 && (
                      <>
                        <button className="couple-gallery-arrow gallery-arrow-previous" aria-label="Ảnh trước" onClick={() => moveImage(-1)}><ChevronLeft size={23} /></button>
                        <button className="couple-gallery-arrow gallery-arrow-next" aria-label="Ảnh tiếp theo" onClick={() => moveImage(1)}><ChevronRight size={23} /></button>
                        <span className="couple-gallery-counter">{activeImageIndex + 1} / {activePhotos.length}</span>
                      </>
                    )}
                  </>
                ) : (
                  <div className="couple-gallery-no-image"><ImagePlus size={30} /><span>Kỷ niệm này chưa có ảnh</span></div>
                )}
              </div>
              {activePhotos.length > 1 && <small className="couple-gallery-hint">Dùng nút trước/sau để xem ảnh. Trên máy tính có thể dùng con lăn chuột.</small>}
            </section>
          </div>
      )}
    </section>
  );
}

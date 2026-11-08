'use client';

import { useEffect, useState } from 'react';
import { BookHeart, CalendarDays, Plus, X } from 'lucide-react';
import type { CoupleNotice } from './types';
import { apiRequest, reportApiError } from '@/lib/client-api';

type Entry = { id: string; entry_date: string; title: string; body: string };

export default function CoupleJournal({ coupleId, notify }: { coupleId: string; notify: CoupleNotice }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    let active = true;
    void apiRequest<{ entries: Entry[] }>(`/api/couple/journal?coupleId=${encodeURIComponent(coupleId)}`)
      .then((result) => { if (active) setEntries(result.entries); })
      .catch((error: unknown) => { if (active) reportApiError(error, notify); });
    return () => { active = false; };
  }, [coupleId, notify]);

  async function addEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !text.trim()) return;
    try {
      const { entry } = await apiRequest<{ entry: Entry }>('/api/couple/journal', {
        method: 'POST',
        body: JSON.stringify({ coupleId, title: title.trim(), body: text.trim() }),
      });
      setEntries((items) => [entry, ...items]);
      setTitle('');
      setText('');
      setIsAdding(false);
      notify('Nhật ký đã được lưu.');
    } catch (error) {
      reportApiError(error, notify);
    }
  }

  return (
    <section className="couple-panel">
      <div className="couple-panel-heading">
        <div><span className="eyebrow">MỘT TRANG CHUNG MỖI NGÀY</span><h2>Nhật ký của chúng mình</h2></div>
        <button className="button button-primary" onClick={() => setIsAdding((open) => !open)}>
          {isAdding ? <><X size={15} /> Đóng</> : <><Plus size={16} /> Viết nhật ký</>}
        </button>
      </div>
      <p className="couple-panel-intro">Ghi lại cảm xúc, câu chuyện và những điều hai bạn muốn nhớ về hôm nay.</p>
      {isAdding && (
        <form className="couple-entry-form couple-journal-form" onSubmit={(event) => void addEntry(event)}>
          <label>Tiêu đề<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Hôm nay của chúng mình..." maxLength={80} required /></label>
          <label className="couple-form-wide">Câu chuyện<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Viết điều bạn muốn lưu lại..." rows={4} maxLength={1200} required /></label>
          <div className="couple-entry-actions">
            <button className="button button-outline" type="button" onClick={() => setIsAdding(false)}>Hủy</button>
            <button className="button button-primary" type="submit"><BookHeart size={15} /> Lưu nhật ký</button>
          </div>
        </form>
      )}
      <div className="couple-journal-list">
        {entries.map((entry) => (
          <article className="couple-journal-entry" key={entry.id}>
            <span className="couple-journal-date"><CalendarDays size={14} /> {new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <h3>{entry.title}</h3>
            <p>{entry.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

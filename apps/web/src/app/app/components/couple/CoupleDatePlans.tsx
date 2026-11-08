'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CalendarHeart, Clock3, MapPin, Plus, X } from 'lucide-react';
import type { CoupleNotice } from './types';
import { apiRequest, reportApiError } from '@/lib/client-api';

type Plan = { id: string; title: string; starts_at: string; location: string; notes: string };

export default function CoupleDatePlans({ coupleId, notify }: { coupleId: string; notify: CoupleNotice }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [place, setPlace] = useState('');

  useEffect(() => {
    let active = true;
    void apiRequest<{ plans: Plan[] }>(`/api/couple/date-plans?coupleId=${encodeURIComponent(coupleId)}`)
      .then((result) => { if (active) setPlans(result.plans); })
      .catch((error: unknown) => { if (active) reportApiError(error, notify); });
    return () => { active = false; };
  }, [coupleId, notify]);

  async function addPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !date) return;
    try {
      const { plan } = await apiRequest<{ plan: Plan }>('/api/couple/date-plans', {
        method: 'POST',
        body: JSON.stringify({
          coupleId,
          title: title.trim(),
          startsAt: new Date(`${date}T${time}`).toISOString(),
          location: place.trim(),
        }),
      });
      setPlans((items) => [...items, plan].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setTitle('');
      setDate('');
      setTime('18:00');
      setPlace('');
      setIsAdding(false);
      notify('Lịch hẹn đã được lưu.');
    } catch (error) {
      reportApiError(error, notify);
    }
  }

  return (
    <section className="couple-panel">
      <div className="couple-panel-heading">
        <div><span className="eyebrow">HẸN NHAU TRONG NHỮNG NGÀY TỚI</span><h2>Lịch hẹn của hai bạn</h2></div>
        <button className="button button-primary" onClick={() => setIsAdding((open) => !open)}>
          {isAdding ? <><X size={15} /> Đóng</> : <><Plus size={16} /> Lên lịch hẹn</>}
        </button>
      </div>
      <p className="couple-panel-intro">Cùng lên kế hoạch cho buổi hẹn tiếp theo hoặc lưu lại ngày kỷ niệm.</p>
      {isAdding && (
        <form className="couple-entry-form" onSubmit={(event) => void addPlan(event)}>
          <label>Tên buổi hẹn<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Cùng đi xem triển lãm" maxLength={80} required /></label>
          <label>Ngày<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label>Giờ<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
          <label>Địa điểm<input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="Tùy chọn" maxLength={100} /></label>
          <div className="couple-entry-actions">
            <button className="button button-outline" type="button" onClick={() => setIsAdding(false)}>Hủy</button>
            <button className="button button-primary" type="submit"><CalendarHeart size={15} /> Lưu lịch hẹn</button>
          </div>
        </form>
      )}
      <div className="couple-date-list">
        {plans.map((plan) => (
          <article className="couple-date-card" key={plan.id}>
            <div className="couple-date-calendar"><span>{new Date(plan.starts_at).toLocaleDateString('vi-VN', { month: 'short' })}</span><strong>{new Date(plan.starts_at).getDate()}</strong></div>
            <div className="couple-date-copy"><h3>{plan.title}</h3><span><CalendarDays size={13} /> {new Date(plan.starts_at).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span><Clock3 size={13} /> {new Date(plan.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} <MapPin size={13} /> {plan.location || 'Chưa chọn địa điểm'}</span></div>
          </article>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect } from "react";
import { Heart, Sparkles, X } from "lucide-react";

export default function CoupleCelebration({
  title,
  message,
  onClose,
  onContinue,
}: {
  title: string;
  message: string;
  onClose: () => void;
  onContinue?: () => void;
}) {
  useEffect(() => {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    let cancelled = false;
    let closeTimer: number | undefined;
    const closeContext = () => {
      if (context.state !== "closed") {
        void context.close().catch((error: unknown) => {
          console.warn("Could not close Couple celebration audio", error);
        });
      }
    };
    void context.resume().then(() => {
      if (cancelled) return;
      const now = context.currentTime;
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = now + index * 0.13;
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.25);
      });
      closeTimer = window.setTimeout(closeContext, 700);
    }).catch((error: unknown) => {
      console.warn("Could not play Couple celebration sound", error);
      closeContext();
    });

    return () => {
      cancelled = true;
      if (closeTimer !== undefined) window.clearTimeout(closeTimer);
      closeContext();
    };
  }, []);

  return (
    <div className="modal-backdrop couple-celebration-backdrop">
      <section
        className="couple-celebration"
        role="dialog"
        aria-modal="true"
        aria-labelledby="couple-celebration-title"
      >
        <button className="modal-close icon-button" onClick={onClose} aria-label="Đóng">
          <X size={19} />
        </button>
        <div className="couple-celebration-icon" aria-hidden="true">
          <Sparkles className="couple-celebration-sparkle sparkle-left" size={20} />
          <Heart
            className="couple-celebration-heart"
            size={43}
            fill="currentColor"
          />
          <Heart
            className="couple-celebration-mini-heart mini-heart-left"
            size={15}
            fill="currentColor"
          />
          <Heart
            className="couple-celebration-mini-heart mini-heart-right"
            size={12}
            fill="currentColor"
          />
          <Sparkles className="couple-celebration-sparkle sparkle-right" size={17} />
        </div>
        <span className="eyebrow">MỘT KHỞI ĐẦU ĐẸP</span>
        <h2 id="couple-celebration-title">{title}</h2>
        <p>{message}</p>
        <button className="button button-primary" onClick={onContinue ?? onClose}>
          Mở không gian Couple
        </button>
      </section>
    </div>
  );
}

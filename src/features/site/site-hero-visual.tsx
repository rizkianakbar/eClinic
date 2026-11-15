'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import ownerShot from '../../../public/landing/owner-phone.png';
import queueShot from '../../../public/landing/queue.png';

/** The resting angle of the screens (degrees), flattened to 0 as the visitor scrolls the hero away. */
const TILT = { x: 14, y: -18, z: 4 };
/** How far the cursor leans the screens (degrees each way). */
const LEAN = 4;

/**
 * The hero's product shot: the real queue screen as a large window in perspective, the owner's phone in front. It
 * turns to face the visitor as they scroll in and leans a little toward the cursor. Updates go to CSS variables on
 * animation frames; reduced motion: flat and still.
 */
export function SiteHeroVisual() {
  const t = useTranslations('site.hero');
  const scene = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scene.current;

    if (!element) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.style.setProperty('--flat', '1');

      return;
    }

    let frame = 0;
    let lean = { x: 0, y: 0 };

    const apply = () => {
      frame = 0;

      const flat = Math.min(1, window.scrollY / 520);

      element.style.setProperty('--flat', flat.toFixed(3));
      element.style.setProperty('--lean-x', lean.x.toFixed(2));
      element.style.setProperty('--lean-y', lean.y.toFixed(2));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      const box = element.getBoundingClientRect();

      lean = {
        x: ((event.clientY - (box.top + box.height / 2)) / box.height) * -LEAN,
        y: ((event.clientX - (box.left + box.width / 2)) / box.width) * LEAN,
      };
      schedule();
    };

    apply();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('pointermove', onPointer);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={scene} className="relative [perspective:1800px]" style={{ ['--flat' as string]: 0 }}>
      <div
        className="relative transition-transform duration-500 ease-out [transform-style:preserve-3d] lg:w-[118%]"
        style={{
          transform: `rotateX(calc((1 - var(--flat)) * ${TILT.x}deg + var(--lean-x, 0) * 1deg)) rotateY(calc((1 - var(--flat)) * ${TILT.y}deg + var(--lean-y, 0) * 1deg)) rotateZ(calc((1 - var(--flat)) * ${TILT.z}deg))`,
        }}>
        {/* The desk: the real queue screen in a browser window. */}
        <div className="overflow-hidden rounded-xl border bg-card shadow-[0_2px_4px_rgb(20_32_29/0.05),0_40px_80px_-32px_rgb(15_47_40/0.45)]">
          <div className="flex items-center gap-1.5 border-b bg-muted/70 px-3 py-2">
            <span className="size-2.5 rounded-full bg-foreground/10" />
            <span className="size-2.5 rounded-full bg-foreground/10" />
            <span className="size-2.5 rounded-full bg-foreground/10" />
          </div>
          <Image
            src={queueShot}
            alt={t('visualAlt')}
            priority
            sizes="(min-width: 1024px) 680px, 100vw"
            className="h-auto w-full"
          />
        </div>

        {/* The owner's phone, in front: the same day, on the go. */}
        <div
          className="absolute -bottom-10 left-2 w-[30%] min-w-32 rounded-[1.75rem] bg-foreground p-1.5 shadow-[0_30px_60px_-24px_rgb(15_47_40/0.6)] sm:-left-10"
          style={{ transform: 'translateZ(60px)' }}>
          <Image src={ownerShot} alt="" sizes="220px" className="h-auto w-full rounded-[1.375rem]" />
        </div>
      </div>
    </div>
  );
}

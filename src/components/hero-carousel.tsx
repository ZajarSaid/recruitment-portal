"use client";

import Image from "next/image";
import { useState } from "react";

const slides = [
  { src: "/c1.jpg", alt: "Zango Referral Hospital healthcare professionals" },
  { src: "/c2.jpg", alt: "Care team at Zango Referral Hospital" },
  { src: "/c3.png", alt: "Zango Referral Hospital facilities" },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  return (
    <div
      role="group"
      aria-label="Hospital photos"
      className="relative min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 shadow-sm dark:border-zinc-800"
    >
      <div
        className="flex motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div key={slide.src} className="relative aspect-[4/3] w-full shrink-0 sm:aspect-[16/9] lg:aspect-[4/3]" aria-hidden={i !== index}>
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(min-width: 1152px) 536px, (min-width: 1024px) 48vw, 100vw"
              className="object-cover"
              preload={i === 0}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 rounded-full bg-black/65 px-1">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            className="grid size-11 place-items-center rounded-full focus-visible:outline-white"
            aria-label={`Show photo ${i + 1}: ${slide.alt}`}
            aria-pressed={i === index}
          >
            <span
              className={`h-2.5 rounded-full ${i === index ? "w-5 bg-white" : "w-2.5 bg-white/60"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

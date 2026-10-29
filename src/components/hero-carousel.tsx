"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function HeroCarousel() {
  const slides = [
    { src: "/c1.jpg", alt: "Zango Referral Hospital healthcare professionals" },
    { src: "/c2.jpg", alt: "Care team at Zango Referral Hospital" },
    { src: "/c3.png", alt: "Zango Referral Hospital facilities" },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900 shadow-sm dark:border-zinc-800">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.src} className="relative min-w-full">
            <Image
              src={slide.src}
              alt={slide.alt}
              width={800}
              height={400}
              className="h-[280px] w-full object-cover sm:h-[340px] md:h-[380px] lg:h-[420px]"
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index
                ? "bg-white"
                : "bg-white/50 hover:bg-white/80"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

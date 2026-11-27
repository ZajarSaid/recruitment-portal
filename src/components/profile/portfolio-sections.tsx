"use client";

import { useId, useState, type ReactNode } from "react";

import { ProfileLayout, profileSectionClassName } from "@/components/profile/profile-layout";

type PortfolioSection = { id: string; label: string; content: ReactNode };

export function PortfolioSections({
  sections,
  completion,
}: {
  sections: [PortfolioSection, ...PortfolioSection[]];
  completion: ReactNode;
}) {
  const [selected, setSelected] = useState(sections[0].id);
  const prefix = useId();

  return (
    <ProfileLayout sections={
      <ul className="grid gap-1">
        {sections.map(({ id, label }) => (
          <li key={id} className="min-w-0">
            <button
              type="button"
              id={`${prefix}-button-${id}`}
              aria-current={selected === id ? "true" : undefined}
              aria-controls={`${prefix}-panel-${id}`}
              className={profileSectionClassName}
              onClick={() => setSelected(id)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    }>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          {sections.map(({ id, content }) => (
            <section
              key={id}
              id={`${prefix}-panel-${id}`}
              aria-labelledby={`${prefix}-button-${id}`}
              hidden={selected !== id}
            >
              {content}
            </section>
          ))}
        </div>
        <aside aria-label="Profile progress" className="min-w-0 xl:sticky xl:top-24">
          {completion}
        </aside>
      </div>
    </ProfileLayout>
  );
}

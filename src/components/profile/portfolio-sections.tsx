"use client";

import { useId, useState, type ReactNode } from "react";

import { profileSectionClassName } from "@/components/profile/profile-layout";

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
    <div className="grid min-w-0 items-start gap-5 md:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-[11rem_minmax(0,1fr)_15rem] xl:grid-cols-[13rem_minmax(0,1fr)_17rem]">
      <aside className="min-w-0 rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm md:sticky md:top-4 lg:top-24 dark:border-zinc-800 dark:bg-zinc-950">
        <nav aria-label="Profile sections">
          <ul className="grid gap-1 max-md:grid-cols-2">
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
        </nav>
      </aside>
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
      <aside aria-label="Profile progress" className="min-w-0 md:col-start-2 lg:sticky lg:top-24 lg:col-start-3 lg:row-start-1">
        {completion}
      </aside>
    </div>
  );
}

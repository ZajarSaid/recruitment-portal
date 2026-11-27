"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";

import { ProfileLayout, profileSectionClassName } from "@/components/profile/profile-layout";

type PortfolioPanel = { id: string; label: string; content: ReactNode };
type PortfolioSection = PortfolioPanel | { id: string; label: string; href: string };

export function PortfolioSections({
  sections,
  completion,
  sidebarHeader,
  overview,
}: {
  sections: [PortfolioPanel, ...PortfolioSection[]];
  completion: ReactNode;
  sidebarHeader?: ReactNode;
  overview?: ReactNode;
}) {
  const [selected, setSelected] = useState(sections[0].id);
  const prefix = useId();

  return (
    <ProfileLayout sidebarHeader={sidebarHeader} sections={
      <ul className="grid gap-1">
        {sections.map((section) => (
          <li key={section.id} className="min-w-0">
            {"href" in section ? (
              <Link href={section.href} className={profileSectionClassName}>{section.label}</Link>
            ) : (
              <button
                type="button"
                id={`${prefix}-button-${section.id}`}
                aria-current={selected === section.id ? "true" : undefined}
                aria-controls={`${prefix}-panel-${section.id}`}
                className={profileSectionClassName}
                onClick={() => setSelected(section.id)}
              >
                {section.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    }>
      {selected === sections[0].id && overview}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          {sections.filter((section): section is PortfolioPanel => "content" in section).map(({ id, content }) => (
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

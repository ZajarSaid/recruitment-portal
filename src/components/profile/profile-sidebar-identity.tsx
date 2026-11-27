import type { ReactNode } from "react";

export function ProfileSidebarIdentity({
  name,
  photoSource,
  children,
}: {
  name: string;
  photoSource: string | null;
  children?: ReactNode;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2)
    .map((part) => Array.from(part)[0]).join("").toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-indigo-100 pb-3 md:block dark:border-zinc-800">
      {photoSource ? (
        // eslint-disable-next-line @next/next/no-img-element -- Profile photos come from the existing upload route.
        <img src={photoSource} alt="" width={216} height={216}
          className="size-14 shrink-0 rounded-lg bg-indigo-50 object-cover md:aspect-square md:h-auto md:w-full dark:bg-indigo-950" />
      ) : (
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg bg-indigo-100 text-lg font-semibold text-indigo-800 md:aspect-square md:h-auto md:w-full md:text-4xl dark:bg-indigo-950 dark:text-indigo-200">
          {initials}
        </span>
      )}
      <div className="min-w-0 md:mt-3">
        <p className="wrap-anywhere text-sm font-semibold">{name}</p>
        {children}
      </div>
    </div>
  );
}

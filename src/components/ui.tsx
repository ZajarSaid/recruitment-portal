import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-indigo-100 bg-white/90 p-6 shadow-sm shadow-indigo-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      {children}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  neutral:
    "bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  green:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-800",
  amber:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:ring-amber-800",
  red: "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-900/50 dark:text-red-300 dark:ring-red-800",
  blue: "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:ring-blue-800",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones | string;
}) {
  const toneClass = badgeTones[tone] ?? badgeTones.neutral;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

const alertTones: Record<string, string> = {
  error: "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  info: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
};

export function Alert({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: keyof typeof alertTones | string;
}) {
  const toneClass = alertTones[tone] ?? alertTones.info;
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClass}`}>
      {children}
    </div>
  );
}

export function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-sm text-red-600 dark:text-red-400">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      <FieldErrors errors={error} />
    </div>
  );
}

const controlClasses =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-900/50";

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClasses} ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={`${controlClasses} ${className}`} {...props} />
  );
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClasses} ${className}`} {...props} />;
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center dark:border-zinc-700 dark:bg-transparent">
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";

import { Badge, FieldErrors, Select, TextInput } from "@/components/ui";
import {
  DOCUMENT_TEMPLATES,
  type RequirementChoiceValue,
} from "@/lib/documents";

export type DocumentTypeOption = {
  id: string;
  name: string;
  category: string | null;
};

export type JobFormRequirement = {
  id: string;
  documentTypeId: string | null;
  customName: string | null;
  description: string | null;
  requirementStatus: "REQUIRED" | "OPTIONAL";
};

type EditorRow = {
  key: string;
  id?: string;
  documentTypeId: string;
  customName: string;
  description: string;
  status: RequirementChoiceValue;
};

const CUSTOM = "__custom__";

const emptyRow = (key: string): EditorRow => ({
  key,
  documentTypeId: "",
  customName: "",
  description: "",
  status: "REQUIRED",
});

function toEditorRow(
  requirement: JobFormRequirement,
  index: number,
): EditorRow {
  return {
    key: `existing-${requirement.id ?? index}`,
    id: requirement.id,
    documentTypeId: requirement.documentTypeId ?? CUSTOM,
    customName: requirement.customName ?? "",
    description: requirement.description ?? "",
    status: requirement.requirementStatus,
  };
}

export function DocumentRequirementsEditor({
  documentTypes,
  existing = [],
  errors,
}: {
  documentTypes: DocumentTypeOption[];
  existing?: JobFormRequirement[];
  errors?: string[];
}) {
  const [rows, setRows] = useState<EditorRow[]>(() =>
    existing.map(toEditorRow),
  );
  const [templateId, setTemplateId] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const counter = useRef(0);

  const nextKey = () => {
    counter.current += 1;
    return `new-${counter.current}`;
  };

  const typeByName = useMemo(() => {
    const map = new Map<string, DocumentTypeOption>();
    for (const type of documentTypes) {
      map.set(type.name.trim().toLowerCase(), type);
    }
    return map;
  }, [documentTypes]);

  const groupedTypes = useMemo(() => {
    const groups = new Map<string, DocumentTypeOption[]>();
    for (const type of documentTypes) {
      const key = type.category?.trim() || "Other";
      const bucket = groups.get(key) ?? [];
      bucket.push(type);
      groups.set(key, bucket);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [documentTypes]);

  const typeById = useMemo(() => {
    const map = new Map<string, string>();
    for (const type of documentTypes) map.set(type.id, type.name);
    return map;
  }, [documentTypes]);

  function updateRow(key: string, patch: Partial<EditorRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(nextKey())]);
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function moveRow(key: string, direction: -1 | 1) {
    setRows((current) => {
      const index = current.findIndex((row) => row.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function applyTemplate(id: string) {
    const template = DOCUMENT_TEMPLATES.find((entry) => entry.id === id);
    if (!template) return;
    setRows((current) => {
      const existingNames = new Set(
        current
          .map((row) => row.customName.trim().toLowerCase())
          .filter(Boolean),
      );
      const added: EditorRow[] = [];
      for (const item of template.items) {
        const type = typeByName.get(item.name.trim().toLowerCase());
        const marker = (type?.name ?? item.name).trim().toLowerCase();
        if (existingNames.has(marker)) continue;
        existingNames.add(marker);
        added.push({
          key: nextKey(),
          documentTypeId: type?.id ?? CUSTOM,
          customName: type ? "" : item.name,
          description: item.description,
          status:
            item.defaultStatus === "REQUIRED" ? "REQUIRED" : "OPTIONAL",
        });
      }
      return [...current, ...added];
    });
  }

  const effectiveRows = rows.filter((row) => row.status !== "NOT_APPLICABLE");

  const serialized = effectiveRows.map((row) => ({
    id: row.id,
    documentTypeId: row.documentTypeId === CUSTOM ? null : row.documentTypeId || null,
    customName:
      row.documentTypeId === CUSTOM ? row.customName.trim() || null : null,
    description: row.description.trim() || null,
    requirementStatus: row.status,
  }));

  const requiredCount = effectiveRows.filter(
    (row) => row.status === "REQUIRED",
  ).length;
  const optionalCount = effectiveRows.length - requiredCount;

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Document requirements
            </h2>
            {effectiveRows.length === 0 ? (
              <Badge tone="neutral">None</Badge>
            ) : (
              <>
                {requiredCount > 0 && (
                  <Badge tone="red">{requiredCount} required</Badge>
                )}
                {optionalCount > 0 && (
                  <Badge tone="amber">{optionalCount} optional</Badge>
                )}
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Optional. Configure the documents applicants should attach. You can
            still publish a vacancy with no requirements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      <div className={collapsed ? "hidden" : undefined}>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <span className="block">Load a template</span>
            <Select
              className="mt-1 w-56"
              value={templateId}
              onChange={(event) => {
                const value = event.target.value;
                setTemplateId(value);
                if (value) applyTemplate(value);
                setTemplateId("");
              }}
            >
              <option value="">Choose a template…</option>
              {DOCUMENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </Select>
          </label>
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Add custom requirement
          </button>
        </div>

        <FieldErrors errors={errors} />

        {rows.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No document requirements. Applicants will only provide the text
            summary.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {rows.map((row, index) => (
              <li
                key={row.key}
                className={`rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 ${
                  row.status === "NOT_APPLICABLE" ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    #{index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveRow(row.key, -1)}
                      disabled={index === 0}
                      aria-label="Move requirement up"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(row.key, 1)}
                      disabled={index === rows.length - 1}
                      aria-label="Move requirement down"
                      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label="Remove requirement"
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="block">Document type</span>
                    <Select
                      className="mt-1"
                      value={row.documentTypeId}
                      onChange={(event) =>
                        updateRow(row.key, { documentTypeId: event.target.value })
                      }
                    >
                      <option value="">Select a document type…</option>
                      <option value={CUSTOM}>Custom document…</option>
                      {groupedTypes.map(([category, types]) => (
                        <optgroup key={category} label={category}>
                          {types.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </Select>
                  </label>

                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="block">Requirement</span>
                    <Select
                      className="mt-1"
                      value={row.status}
                      onChange={(event) =>
                        updateRow(row.key, {
                          status: event.target.value as RequirementChoiceValue,
                        })
                      }
                    >
                      <option value="REQUIRED">Required</option>
                      <option value="OPTIONAL">Optional</option>
                      <option value="NOT_APPLICABLE">
                        Not applicable (hide)
                      </option>
                    </Select>
                  </label>
                </div>

                {row.documentTypeId === CUSTOM && (
                  <label className="mt-3 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    <span className="block">Custom document name</span>
                    <TextInput
                      className="mt-1"
                      value={row.customName}
                      onChange={(event) =>
                        updateRow(row.key, { customName: event.target.value })
                      }
                      placeholder="e.g. Referee letters"
                    />
                  </label>
                )}

                <label className="mt-3 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  <span className="block">
                    Description for applicants (optional)
                  </span>
                  <TextInput
                    className="mt-1"
                    value={row.description}
                    onChange={(event) =>
                      updateRow(row.key, { description: event.target.value })
                    }
                    placeholder="Explain what this document should contain."
                  />
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
            Applicant preview
          </p>
          {effectiveRows.length === 0 ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Applicants will only provide a text summary — no documents
              required.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {effectiveRows.map((row) => {
                const label =
                  row.documentTypeId && row.documentTypeId !== CUSTOM
                    ? (typeById.get(row.documentTypeId) ?? "Document")
                    : row.customName.trim() || "Untitled requirement";
                return (
                  <li
                    key={row.key}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {label}
                    </span>
                    <Badge tone={row.status === "REQUIRED" ? "red" : "amber"}>
                      {row.status === "REQUIRED" ? "Required" : "Optional"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <input
        type="hidden"
        name="documentRequirements"
        value={JSON.stringify(serialized)}
      />
    </section>
  );
}

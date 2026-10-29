import { describe, expect, it } from "vitest";

import {
  DOCUMENT_TEMPLATES,
  buildDocumentTypeCatalog,
  getDocumentTemplate,
} from "@/lib/documents";

describe("document templates", () => {
  it("exposes the expected reusable templates", () => {
    const ids = DOCUMENT_TEMPLATES.map((template) => template.id).sort();
    expect(ids).toEqual(
      ["finance-procurement", "general", "hr-admin", "it", "medical", "nursing"],
    );
  });

  it("gives every template at least one item with valid defaults", () => {
    for (const template of DOCUMENT_TEMPLATES) {
      expect(template.items.length).toBeGreaterThan(0);
      for (const item of template.items) {
        expect(item.name.trim().length).toBeGreaterThan(0);
        expect(["REQUIRED", "OPTIONAL"]).toContain(item.defaultStatus);
      }
    }
  });

  it("looks up a template by id", () => {
    expect(getDocumentTemplate("medical")?.label).toContain("Medical");
    expect(getDocumentTemplate("does-not-exist")).toBeUndefined();
  });

  it("includes the policy-sensitive general documents", () => {
    const general = getDocumentTemplate("general");
    const names = general?.items.map((item) => item.name) ?? [];
    expect(names).toContain("Curriculum Vitae (CV)");
    expect(names).toContain("Birth certificate");
    expect(names).toContain("National identity document");
  });

  it("builds a de-duplicated catalogue", () => {
    const catalog = buildDocumentTypeCatalog();
    const names = catalog.map((type) => type.name);
    expect(names.length).toBe(new Set(names).size);
    expect(names).toContain("Academic transcripts");
    // "Academic transcripts" appears in several templates but only once.
    expect(
      names.filter((name) => name === "Academic transcripts"),
    ).toHaveLength(1);
    for (const type of catalog) {
      expect(type.name.trim().length).toBeGreaterThan(0);
      expect(typeof type.category).toBe("string");
    }
  });
});

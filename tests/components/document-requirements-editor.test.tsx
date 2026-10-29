// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentRequirementsEditor } from "@/components/jobs/document-requirements-editor";

const documentTypes = [
  { id: "t1", name: "Curriculum Vitae", category: "General" },
  { id: "t2", name: "Academic transcripts", category: "Education" },
];

function serialized(): unknown {
  const input = document.querySelector<HTMLInputElement>(
    'input[name="documentRequirements"]',
  );
  return JSON.parse(input!.value);
}

describe("DocumentRequirementsEditor", () => {
  it("shows an applicant preview for existing requirements", () => {
    render(
      <DocumentRequirementsEditor
        documentTypes={documentTypes}
        existing={[
          {
            id: "r1",
            documentTypeId: "t1",
            customName: null,
            description: null,
            requirementStatus: "REQUIRED",
          },
          {
            id: "r2",
            documentTypeId: null,
            customName: "Referee letters",
            description: null,
            requirementStatus: "OPTIONAL",
          },
        ]}
      />,
    );

    expect(screen.getByText("Applicant preview")).toBeDefined();
    expect(screen.getAllByText("Curriculum Vitae").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Referee letters").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Required").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Optional").length).toBeGreaterThan(0);
  });

  it("shows an empty state and an explicit preview when nothing is configured", () => {
    render(<DocumentRequirementsEditor documentTypes={documentTypes} />);

    expect(screen.getByText(/No document requirements/)).toBeDefined();
    expect(screen.getByText(/no documents\s+required/i)).toBeDefined();
    expect(serialized()).toEqual([]);
  });

  it("collapses the controls without dropping the serialized value", () => {
    render(
      <DocumentRequirementsEditor
        documentTypes={documentTypes}
        existing={[
          {
            id: "r1",
            documentTypeId: "t1",
            customName: null,
            description: null,
            requirementStatus: "REQUIRED",
          },
        ]}
      />,
    );

    expect(serialized()).toEqual([
      {
        id: "r1",
        documentTypeId: "t1",
        customName: null,
        description: null,
        requirementStatus: "REQUIRED",
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(serialized()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(serialized()).toHaveLength(1);
  });

  it("reflects a required/optional change in the serialized payload", () => {
    render(
      <DocumentRequirementsEditor
        documentTypes={documentTypes}
        existing={[
          {
            id: "r1",
            documentTypeId: "t1",
            customName: null,
            description: null,
            requirementStatus: "REQUIRED",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Required"), {
      target: { value: "OPTIONAL" },
    });

    expect(serialized()).toEqual([
      {
        id: "r1",
        documentTypeId: "t1",
        customName: null,
        description: null,
        requirementStatus: "OPTIONAL",
      },
    ]);
  });
});

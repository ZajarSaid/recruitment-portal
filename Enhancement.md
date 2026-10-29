# Enhancement Task: Add Vacancy-Specific Document Attachments to the Existing Hospital Recruitment Portal

## Project Context

The recruitment portal in the root directory has already been developed using Next.js. Candidates can currently apply for vacancies by submitting a text summary, while administrators and recruiters can create vacancies without configuring attachment requirements.

Extend the existing application to support document uploads for candidates and configurable attachment requirements for each vacancy.

**Important:** This is an enhancement to an existing project. Do not rebuild the application, replace its architecture, or unnecessarily rewrite existing features. First understand the current implementation, then integrate the new functionality into the existing codebase.

## Phase 1: Inspect the Existing Application

Before writing code:

1. Inspect the existing project structure, framework conventions, authentication, authorization, database schema, and application workflows.
2. Identify the existing:
   - Vacancy creation and editing forms.
   - Candidate application form and submission logic.
   - Candidate, recruiter, and administrator roles.
   - Vacancy and application database models.
   - Existing file storage or upload functionality, if any.
3. Determine how the current text-summary application is stored and processed.
4. Identify the existing validation rules, UI components, and server-side actions or API routes.
5. Produce a short implementation plan describing the required modifications and any database migrations.

Do not remove or replace existing functionality simply because a new implementation would be easier.

## Phase 2: Introduce Configurable Vacancy Document Requirements

Modify the existing vacancy creation and editing workflow.

Administrators and authorized recruiters must be able to configure document requirements when creating or editing a vacancy.

### Vacancy creation behavior

Add a document requirements section to the existing vacancy form.

The recruiter should be able to:

- Create a vacancy without configuring any document requirements.
- Publish a vacancy with no attachments required, preserving the existing workflow.
- Add document requirements before publishing.
- Select whether each document is required, optional, or not applicable.
- Add custom document requirements.
- Edit or remove requirements before publication.
- Reorder requirements displayed to applicants.

The document requirements section should be optional, not a mandatory obstacle to vacancy creation.

### Default document templates

Provide reusable templates that recruiters can customize.

**General application documents**
- CV.
- Application letter.
- Birth certificate, only when required by the recruitment policy.
- National identity document, where applicable.
- Other supporting documents.

**Medical and clinical positions**
- Relevant medical or clinical qualification.
- Professional registration certificate.
- Valid practising licence, where applicable.
- Internship completion certificate, where required.
- Academic transcripts.
- Employment or experience certificates.
- Relevant specialist qualifications.

**Nursing and midwifery positions**
- Relevant nursing or midwifery qualification.
- Applicable professional registration.
- Valid practising licence, where required.
- Internship or clinical placement evidence, where required.
- Academic transcripts.
- Employment or experience certificates.
- Specialty training certificates.

**HR and administrative positions**
- Relevant academic qualification.
- Academic transcripts.
- Employment or experience certificates.
- Relevant HR or administration professional certifications.

**IT positions**
- Relevant ICT qualification.
- Academic transcripts.
- Employment or experience certificates.
- Relevant technical certifications.
- Portfolio or project evidence, if required.

**Finance, procurement, and support positions**
- Relevant academic, vocational, or professional qualification.
- Relevant professional registration or licence, where applicable.
- Experience certificates.
- Role-specific permits or certifications, where applicable.

These templates are starting points only. Do not force every position in a category to use identical requirements. Recruiters must be able to customize the final list.

## Phase 3: Extend the Database

Inspect the current database models before adding or modifying tables.

Reuse existing models where appropriate. Introduce the following entities or equivalent relationships only if they do not already exist:

### A. DocumentType
Stores reusable document types, such as CV, academic certificate, professional licence, and application letter.

Possible fields:
- id
- name
- description
- category, if useful

### B. VacancyDocumentRequirement
Connects a vacancy to its document requirements.

Possible fields:
- id
- vacancyId
- documentTypeId, nullable if custom document types are supported
- customName, nullable
- description
- requirementStatus: REQUIRED or OPTIONAL
- displayOrder
- allowed file types or references to upload policies, if needed

A document marked NOT APPLICABLE should normally be omitted from the vacancy's active requirements rather than presented to candidates.

### C. ApplicationDocument
Stores metadata for a document uploaded for a particular application.

Possible fields:
- id
- applicationId
- vacancyDocumentRequirementId
- storageKey or private file URL
- originalFileName
- mimeType
- fileSize
- reviewStatus: PENDING, ACCEPTED, or REJECTED
- reviewComment, nullable
- reviewedBy, nullable
- createdAt
- updatedAt

Adapt these fields to the project's existing naming conventions and database provider.

Continue using the existing Application and Vacancy models. Do not create duplicate candidate or vacancy entities.

Preserve the existing text-summary field. It must not be removed or made unusable by the new upload feature.

Use migrations supported by the project's current database technology.

## Phase 4: Add Candidate Document Uploads

Extend the existing candidate application form.

When a candidate selects a vacancy:

1. Retrieve the document requirements configured for that vacancy.
2. Display the requirements in the application form.
3. Clearly identify required and optional documents.
4. Provide an individual upload control for each document requirement.
5. Allow the candidate to continue providing the existing text summary.
6. Allow candidates to omit optional documents.
7. Validate required documents before final submission.

### Submission rules

- A vacancy with no document requirements must continue to accept applications through the existing workflow.
- A vacancy with only optional documents must allow submission without uploading any files.
- A vacancy with required documents must not accept final submission until every required document has been uploaded successfully.
- Do not require the candidate to upload a document twice to satisfy multiple requirements unless the recruitment policy explicitly requires separate files.
- Display useful validation messages and identify the missing documents.
- Preserve existing authentication, vacancy eligibility, deadline, and duplicate-application rules.

If the application currently saves an application before all documents are uploaded, implement a safe draft or staged-upload workflow so incomplete uploads do not leave misleading completed applications.

## Phase 5: File Validation and Secure Storage

Implement secure file handling appropriate for a recruitment system.

1. Validate file size and actual file type on the server.
2. Use a configurable allowlist, with PDF as the default and JPG/PNG enabled only where appropriate.
3. Set a reasonable configurable maximum file size.
4. Generate safe storage keys instead of trusting user-provided filenames.
5. Store files in private storage, not publicly accessible directories.
6. Restrict access to the candidate who owns the application and authorized recruitment personnel.
7. Prevent users from accessing files belonging to other candidates by manipulating application or document IDs.
8. Provide authorized download or preview functionality through protected routes or signed URLs.
9. Handle failed uploads and database errors without marking missing files as successfully uploaded.

Inspect the current hosting and storage configuration before choosing an implementation. If the application is deployed on Vercel, do not rely on its local filesystem for persistent candidate documents. Use an appropriate persistent private object-storage service and store its file reference in the database.

Do not expose storage credentials or private file URLs to unauthorized users.

## Phase 6: Recruiter and Administrator Document Review

Extend the existing recruitment dashboard.

For each application, authorized recruiters and administrators should be able to:

- View the candidate's application summary.
- See the documents required for that vacancy.
- Identify uploaded, missing, accepted, and rejected documents.
- Preview or securely download uploaded documents.
- Mark documents as accepted or rejected.
- Provide a reason when rejecting a document.
- Identify whether all mandatory documents have been submitted.
- View the candidate's existing text summary and other application details.

Document verification should remain distinct from the application's overall recruitment decision.

Do not automatically reject an application solely because an uploaded document is pending review. Missing required documents at submission and documents later rejected during verification are different states that must be handled explicitly.

## Phase 7: UI and User Experience

Integrate the feature into the existing design system.

### Recruiter/admin interface
- Add a collapsible or clearly separated document requirements section to vacancy creation and editing.
- Show a preview of the final requirements before publication.
- Make required and optional status easy to change.
- Provide useful empty states when no requirements are configured.
- Clearly distinguish existing vacancies with no document requirements from vacancies with configured requirements.

### Candidate interface
- Display the vacancy's attachment requirements before or during application.
- Show required and optional labels.
- Show selected filenames, upload progress, and upload errors.
- Allow replacement of files before submission, subject to the recruitment policy.
- Preserve the existing application summary input.
- Clearly explain why submission is blocked when a required document is missing.

Ensure that the interface works on desktop and mobile devices.

## Phase 8: Backward Compatibility and Existing Applications

This phase is critical.

1. Existing vacancies without document requirements must continue to work.
2. Existing applications containing only text summaries must remain accessible.
3. Existing recruiters must retain their current vacancy management permissions.
4. Do not make historical applications incomplete merely because they lack newly introduced document records.
5. Editing a vacancy's requirements must not silently alter the requirements that applied to applications already submitted.
6. Where necessary, preserve a snapshot or version of the requirements applicable at the time of submission.
7. Avoid destructive database migrations or changes that could lose existing application data.

## Phase 9: Testing and Verification

Test the feature using the existing testing framework and conventions.

At minimum, verify:

1. A recruiter can publish a vacancy without attachment requirements.
2. A recruiter can create a vacancy with required and optional documents.
3. A recruiter can customize the suggested requirements for medical, nursing, HR, and IT positions.
4. Candidates applying to a vacancy with no requirements can submit as before.
5. Candidates can omit optional documents.
6. Candidates cannot submit an application while required documents are missing.
7. Candidates can submit once all mandatory documents have been uploaded.
8. Invalid file types and oversized files are rejected.
9. Unauthorized users cannot view or download private documents.
10. Recruiters cannot modify vacancies outside their permissions.
11. Existing text-summary applications remain functional.
12. Existing applications are not broken by database migrations or requirement changes.
13. Document review statuses and rejection reasons are saved and displayed correctly.

Run the available tests, linting, type checks, and production build. Fix regressions introduced by the enhancement.

## Implementation Rules

- Work in the existing project and follow its established conventions.
- Do not introduce Django or a separate backend framework; the application uses Next.js.
- Do not replace the current database, authentication system, or UI framework without a demonstrated technical necessity.
- Do not add dependencies unless they solve a specific requirement.
- Do not implement all vacancy types as hardcoded conditionals throughout the application. Use configurable document requirements and reusable templates.
- Do not assume every hospital position requires a degree, professional licence, or birth certificate.
- Do not mark an application as fully submitted when mandatory document uploads have failed.
- Keep database changes minimal, incremental, and reversible where practical.

## Expected Deliverables

After implementation, provide:

1. A brief summary of the existing code inspected.
2. The database changes and migrations introduced.
3. The files created or modified.
4. The upload and storage approach used.
5. A description of how vacancy-specific requirements work.
6. Test results and production-build status.
7. Any required environment variables or manual deployment steps.
8. Any remaining limitations or decisions requiring human approval.

Implement the phases incrementally. Verify each phase before proceeding to the next. Do not stop after producing a plan: proceed with implementation unless a genuine blocker requires clarification.
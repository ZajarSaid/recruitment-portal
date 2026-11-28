import Link from "next/link";
import type { ReactNode } from "react";

import type { CandidateCertification, CandidateEducation, CandidateEmployment } from "@/generated/prisma/client";
import { ProfilePhotoField } from "@/components/applications/profile-photo-field";
import { Badge, Card } from "@/components/ui";
import { ProfileDocumentField } from "@/components/profile/profile-document-field";
import { ProfileSidebarIdentity } from "@/components/profile/profile-sidebar-identity";
import { PortfolioSections } from "@/components/profile/portfolio-sections";
import { PortfolioEditor, RemovePortfolioRecord, type PortfolioInput } from "@/components/profile/portfolio-editor";
import type { CurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { DOCUMENT_ACCEPT_ATTRIBUTE, formatFileSize } from "@/lib/document-files";
import { formatDate } from "@/lib/format";
import { candidatePortfolioCompletion, summarizeCandidateApplications } from "@/lib/portfolio-summary";
import { profileStepHref } from "@/lib/profile-steps";
import { missingRequiredProfileDocuments, type CandidateProfileWithDocuments } from "@/lib/profile";
import {
  BIRTH_MONTH_LABELS, COMPUTER_LITERACY_LABELS, EDUCATION_LEVEL_LABELS,
  findProfileDocumentSpec, getCategoryDocumentList, IDENTITY_DOCUMENT, JOB_CATEGORY_LABELS, OPTIONAL_PORTFOLIO_DOCUMENTS,
} from "@/lib/profile-documents";

const muted = "text-sm leading-relaxed text-slate-600 dark:text-zinc-400";
const link = "inline-flex min-h-11 items-center text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300";
const ruled = "divide-y divide-indigo-100 dark:divide-zinc-800";
const timeline = "mt-4 space-y-5 border-l border-indigo-200 pl-4 dark:border-indigo-900";
const timelineItem = "relative min-w-0 before:absolute before:top-2 before:-left-[1.34rem] before:size-2.5 before:rounded-full before:border-2 before:border-white before:bg-indigo-600 dark:before:border-zinc-950 dark:before:bg-indigo-400";
const portfolioDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
});

function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3 dark:border-zinc-800">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-zinc-50">{children}</h2>
      {action}
    </div>
  );
}

function DisplayField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className={muted}>{label}</dt>
      <dd className="mt-0.5 wrap-anywhere text-sm font-semibold">{value || "Not provided"}</dd>
    </div>
  );
}

function inputDate(value?: Date | null) {
  return value?.toISOString().slice(0, 10);
}

function dateRange(start?: Date | null, end?: Date | null, current = false) {
  if (current && start) return `${portfolioDate.format(start)} – Present`;
  if (start && end) return `${portfolioDate.format(start)} – ${portfolioDate.format(end)}`;
  if (start) return `Started ${portfolioDate.format(start)}`;
  if (end) return `Completed ${portfolioDate.format(end)}`;
  return null;
}

function educationFields(record?: CandidateEducation): PortfolioInput[] {
  return [
    { name: "qualification", label: "Qualification", value: record?.qualification, maxLength: 160, required: true },
    { name: "institution", label: "Institution", value: record?.institution, maxLength: 160, required: true },
    { name: "fieldOfStudy", label: "Field of study", value: record?.fieldOfStudy, maxLength: 160 },
    { name: "grade", label: "Grade or GPA", value: record?.grade, maxLength: 40 },
    { name: "startDate", label: "Start date", value: inputDate(record?.startDate), type: "date" },
    { name: "endDate", label: "Completion date", value: inputDate(record?.endDate), type: "date" },
  ];
}

function employmentFields(record?: CandidateEmployment): PortfolioInput[] {
  return [
    { name: "jobTitle", label: "Job title", value: record?.jobTitle, maxLength: 160, required: true },
    { name: "organization", label: "Organization", value: record?.organization, maxLength: 160, required: true },
    { name: "startDate", label: "Start date", value: inputDate(record?.startDate), type: "date", required: true },
    { name: "endDate", label: "End date", value: inputDate(record?.endDate), type: "date" },
    { name: "current", label: "I currently work here", value: record?.current, type: "checkbox" },
    { name: "description", label: "Responsibilities", value: record?.description, maxLength: 4000, type: "textarea" },
  ];
}

function certificationFields(record?: CandidateCertification): PortfolioInput[] {
  return [
    { name: "name", label: "Certification or licence name", value: record?.name, maxLength: 160, required: true },
    { name: "issuer", label: "Issuing organization", value: record?.issuer, maxLength: 160, required: true },
    { name: "registrationNumber", label: "Registration or licence number", value: record?.registrationNumber, maxLength: 120 },
    { name: "issueDate", label: "Issue date", value: inputDate(record?.issueDate), type: "date" },
    { name: "expiryDate", label: "Expiry date", value: inputDate(record?.expiryDate), type: "date" },
  ];
}

function RecordRow({ title, subtitle, dates, actions, children }: {
  title: string; subtitle: string; dates?: string | null; actions: ReactNode; children?: ReactNode;
}) {
  return (
    <li className={timelineItem}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="wrap-anywhere font-semibold">{title}</h3>
          <p className={`wrap-anywhere ${muted}`}>{subtitle}</p>
          {dates && <p className="mt-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">{dates}</p>}
          {children}
        </div>
        <div className="flex flex-wrap items-start gap-2">{actions}</div>
      </div>
    </li>
  );
}

export async function CandidatePortfolio({
  user, profile, photoSource, canApply, applicationRequirement, maxUploadBytes,
}: {
  user: CurrentUser;
  profile: CandidateProfileWithDocuments;
  photoSource: string | null;
  canApply: boolean;
  applicationRequirement: string | null;
  maxUploadBytes: number;
}) {
  const [records, applicationGroups] = await Promise.all([
    profile && prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: {
        education: { orderBy: [{ startDate: "desc" }, { id: "desc" }] },
        employment: { orderBy: [{ startDate: "desc" }, { id: "desc" }] },
        skills: { orderBy: { name: "asc" } },
        certifications: { orderBy: [{ issueDate: "desc" }, { id: "desc" }] },
      },
    }),
    prisma.application.groupBy({
      by: ["status"], where: { candidateId: user.id }, _count: { _all: true },
    }),
  ]);

  const education = records?.education ?? [];
  const employment = records?.employment ?? [];
  const skills = records?.skills ?? [];
  const certifications = records?.certifications ?? [];
  const documents = (profile?.documents ?? []).filter(({ documentKey }) =>
    documentKey !== IDENTITY_DOCUMENT.key,
  );
  const category = profile?.category ?? "GENERAL";
  const categorySpecs = [...getCategoryDocumentList(category), ...OPTIONAL_PORTFOLIO_DOCUMENTS];
  const additionalSpecs = documents
    .filter(({ documentKey }) => !categorySpecs.some(({ key }) => key === documentKey))
    .flatMap(({ documentKey }) => {
      const spec = findProfileDocumentSpec(documentKey);
      return spec ? [{ ...spec, required: false }] : [];
    });
  const missing = missingRequiredProfileDocuments(profile);
  const counts = summarizeCandidateApplications(applicationGroups);
  const completion = candidatePortfolioCompletion({
    hasLocation: Boolean(profile?.location || profile?.physicalAddress),
    hasEducation: Boolean(profile?.educationLevel || education.length),
    hasRequiredDocuments: categorySpecs.some(({ required }) => required) ? missing.length === 0 : null,
  });

  const location = profile?.location || profile?.physicalAddress;
  const educationLevel = profile?.educationLevel ? EDUCATION_LEVEL_LABELS[profile.educationLevel] : null;
  const contactFields: PortfolioInput[] = [
    { name: "headline", label: "Professional headline", value: profile?.headline, maxLength: 160 },
    { name: "location", label: "City or region", value: profile?.location, maxLength: 160 },
    { name: "phone", label: "Phone number", value: profile?.phone, type: "tel", maxLength: 40 },
    { name: "birthYear", label: "Birth year", value: profile?.birthYear, type: "number" },
    { name: "birthMonth", label: "Birth month", value: profile?.birthMonth,
      options: BIRTH_MONTH_LABELS.map((label, index) => ({ label, value: String(index + 1) })) },
    { name: "languages", label: "Languages", value: profile?.languages, maxLength: 500 },
    { name: "computerLiteracy", label: "Computer literacy", value: profile?.computerLiteracy,
      options: Object.entries(COMPUTER_LITERACY_LABELS).map(([value, label]) => ({ value, label })) },
    { name: "physicalAddress", label: "Physical address", value: profile?.physicalAddress, maxLength: 500, type: "textarea" },
  ];

  return (
    <main className="mx-auto w-full max-w-[100rem] px-3 py-4 sm:px-5 sm:py-6">
      <PortfolioSections
        sidebarHeader={
          <ProfileSidebarIdentity name={user.name} photoSource={photoSource}>
            <p className="wrap-anywhere text-xs text-slate-600 dark:text-zinc-400">{profile?.headline || JOB_CATEGORY_LABELS[category]}</p>
          </ProfileSidebarIdentity>
        }
        overview={
          <header className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="wrap-anywhere text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {user.name.trim().split(/\s+/)[0]}</h1>
                <p className={muted}>Track your applications and complete your profile.</p>
              </div>
              <Link href="/profile?section=applications" className={link}>My applications</Link>
            </div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-indigo-100 bg-indigo-100 sm:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800">
              {[
                { label: "Total applications", value: counts.total, tone: "text-indigo-800 dark:text-indigo-200" },
                { label: "Pending", value: counts.pending, tone: "text-amber-800 dark:text-amber-200" },
                { label: "Shortlisted", value: counts.shortlisted, tone: "text-emerald-800 dark:text-emerald-200" },
                { label: "Rejected", value: counts.rejected, tone: "text-slate-800 dark:text-zinc-200" },
              ].map(({ label, value, tone }) => (
                <div key={label} className="min-w-0 bg-white px-3 py-4 text-center dark:bg-zinc-950">
                  <dt className={muted}>{label}</dt>
                  <dd className={"mt-1 text-3xl font-semibold tabular-nums " + tone}>{value}</dd>
                </div>
              ))}
            </dl>
          </header>
        }
        completion={
          <Card className="bg-white">
            <SectionHeading>Profile Completion</SectionHeading>
            <div className="mt-4 space-y-2">
              <span className="block text-2xl font-semibold tabular-nums text-indigo-800 dark:text-indigo-200">{completion.percentage}%</span>
              <progress value={completion.percentage} max={100} aria-label="Profile completion"
                className="block h-2.5 w-full appearance-none overflow-hidden rounded-full bg-indigo-100 [&::-webkit-progress-bar]:bg-indigo-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-indigo-600 dark:[&::-webkit-progress-bar]:bg-zinc-800 dark:[&::-webkit-progress-value]:bg-indigo-400 dark:[&::-moz-progress-bar]:bg-indigo-400" />
            </div>
            <p className={`mt-2 ${muted}`}>{completion.percentage === 100 ? "Your core profile is complete." : "Complete these sections to finish your profile."}</p>
            <ul className="mt-3 space-y-2">
              {completion.checklist.map(({ label, complete, suggestion }) => (
                <li key={label} className="flex items-start gap-2 text-sm">
                  <span className={complete ? "text-emerald-700 dark:text-emerald-300" : "text-indigo-600 dark:text-indigo-300"} aria-hidden="true">{complete ? "✓" : "○"}</span>
                  <div>
                    <span className="sr-only">{complete ? "Complete: " : "Incomplete: "}</span>
                    <span className="font-medium">{label}</span>
                    {!complete && <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">{suggestion}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-indigo-100 pt-3 dark:border-zinc-800">
              <p className="text-sm font-semibold">Application eligibility</p>
              <p className={`mt-1 ${muted}`}>
                {canApply ? "You meet the profile requirement to apply." : applicationRequirement}
              </p>
              <Link href="/profile?section=edit" className={link}>Review application requirements</Link>
            </div>
          </Card>
        }
        sections={[
          {
            id: "dashboard",
            label: "Dashboard",
            content: (
              <Card className="bg-white">
                <SectionHeading>Application tips</SectionHeading>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/60">
                    <h3 className="font-semibold">Complete your profile</h3>
                    <p className={`mt-1 ${muted}`}>Fill in the required details and upload your supporting documents before applying.</p>
                    <Link href="/profile?section=edit" className={link}>Review profile steps</Link>
                  </div>
                  <div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-950/50">
                    <h3 className="font-semibold">Apply for a vacancy</h3>
                    <p className={`mt-1 ${muted}`}>Choose a vacancy, read the requirements, and submit your application online.</p>
                    <Link href="/jobs" className={link}>Browse vacancies</Link>
                  </div>
                </div>
              </Card>
            ),
          },
          {
            id: "personal",
            label: "Personal details",
            content: (
              <Card className="bg-white">
                <SectionHeading action={<PortfolioEditor kind="contact" title="Edit personal information" label="Edit" fields={contactFields} />}>
                  Personal Information
                </SectionHeading>
                <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  <DisplayField label="Full name" value={user.name} />
                  <DisplayField label="Email address" value={user.email} />
                  <DisplayField label="Phone number" value={profile?.phone} />
                  <DisplayField label="Location" value={location} />
                  {profile?.location && profile.physicalAddress && <DisplayField label="Physical address" value={profile.physicalAddress} />}
                  {profile?.birthMonth && profile.birthYear ? <DisplayField label="Birth month and year" value={`${BIRTH_MONTH_LABELS[profile.birthMonth - 1]} ${profile.birthYear}`} /> : null}
                  {profile?.languages && <DisplayField label="Languages" value={profile.languages} />}
                  {profile?.computerLiteracy && <DisplayField label="Computer literacy" value={COMPUTER_LITERACY_LABELS[profile.computerLiteracy]} />}
                </dl>
                <Link href={profileStepHref("personal-details", null, false)} className={`mt-4 ${link}`}>
                  Manage NIDA number and identity document
                </Link>
                <details className="mt-4">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300">Manage profile photo</summary>
                  <ProfilePhotoField
                    initial={profile?.photoPublicId ? { publicId: profile.photoPublicId, url: profile.photoUrl } : null}
                    savedPreview={photoSource}
                    maxBytes={maxUploadBytes}
                  />
                </details>
              </Card>
            ),
          },
          {
            id: "summary",
            label: "Professional summary",
            content: (
              <Card className="bg-white">
                <SectionHeading action={<PortfolioEditor kind="summary" title="Edit professional summary" label="Edit" fields={[
                  { name: "experienceSummary", label: "Professional summary", value: profile?.experienceSummary, maxLength: 2000, type: "textarea" },
                ]} />}>Professional Summary</SectionHeading>
                <p className={`mt-4 wrap-anywhere whitespace-pre-wrap ${muted}`}>
                  {profile?.experienceSummary || "Introduce yourself with a short summary of your background, qualifications, and career interests."}
                </p>
              </Card>
            ),
          },
          {
            id: "education",
            label: "Academic qualifications",
            content: (
              <Card className="bg-white">
                <SectionHeading action={<PortfolioEditor kind="education" title="Add education" label="Add Education" fields={educationFields()} />}>Education</SectionHeading>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className={muted}>{educationLevel ? `Highest education level: ${educationLevel}` : "Highest education level not selected."}</p>
                  <PortfolioEditor kind="academic-level" title="Edit education level" label="Edit level" fields={[
                    { name: "educationLevel", label: "Highest education level", value: profile?.educationLevel,
                      options: Object.entries(EDUCATION_LEVEL_LABELS).map(([value, label]) => ({ value, label })) },
                  ]} />
                </div>
                {education.length ? (
                  <ol className={timeline}>
                    {education.map((item) => (
                      <RecordRow key={item.id} title={item.qualification} subtitle={item.institution}
                        dates={dateRange(item.startDate, item.endDate)} actions={
                          <>
                            <PortfolioEditor kind="education" title="Edit education" label="Edit" id={item.id} fields={educationFields(item)} />
                            <RemovePortfolioRecord kind="education" id={item.id} name={item.qualification} />
                          </>
                        }>
                        {(item.fieldOfStudy || item.grade) && <p className={`mt-2 wrap-anywhere ${muted}`}>{[item.fieldOfStudy, item.grade && `Grade: ${item.grade}`].filter(Boolean).join(" · ")}</p>}
                      </RecordRow>
                    ))}
                  </ol>
                ) : <p className={`mt-3 ${muted}`}>Add qualifications and the institutions where you studied.</p>}
              </Card>
            ),
          },
          {
            id: "experience",
            label: "Work experience",
            content: (
              <Card className="bg-white">
                <SectionHeading action={<PortfolioEditor kind="employment" title="Add work experience" label="Add Experience" fields={employmentFields()} />}>Work Experience</SectionHeading>
                {employment.length ? (
                  <ol className={timeline}>
                    {employment.map((item) => (
                      <RecordRow key={item.id} title={item.jobTitle} subtitle={item.organization}
                        dates={dateRange(item.startDate, item.endDate, item.current)} actions={
                          <>
                            <PortfolioEditor kind="employment" title="Edit work experience" label="Edit" id={item.id} fields={employmentFields(item)} />
                            <RemovePortfolioRecord kind="employment" id={item.id} name={item.jobTitle} />
                          </>
                        }>
                        {item.current && <div className="mt-2"><Badge tone="green">Current role</Badge></div>}
                        {item.description && <p className={`mt-2 wrap-anywhere whitespace-pre-wrap ${muted}`}>{item.description}</p>}
                      </RecordRow>
                    ))}
                  </ol>
                ) : <p className={`mt-4 ${muted}`}>Add relevant employment, placements, or volunteer roles if you have them.</p>}
              </Card>
            ),
          },
          {
            id: "skills",
            label: "Professional skills",
            content: (
              <Card className="bg-white">
                <SectionHeading action={<PortfolioEditor kind="skill" title="Add professional skill" label="Add Skill" fields={[
                  { name: "name", label: "Skill", maxLength: 80, required: true },
                ]} />}>Professional Skills</SectionHeading>
                {skills.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {skills.map((item) => (
                      <li key={item.id} className="flex min-w-0 max-w-full items-center rounded-full bg-indigo-50 pl-3 text-sm font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
                        <span className="min-w-0 wrap-anywhere">{item.name}</span>
                        <RemovePortfolioRecord kind="skill" id={item.id} name={item.name} compact />
                      </li>
                    ))}
                  </ul>
                ) : <p className={`mt-4 ${muted}`}>Add skills relevant to the roles you’re interested in.</p>}
              </Card>
            ),
          },
          {
            id: "certifications",
            label: "Certifications",
            content: (
              <Card className="bg-white">
                <SectionHeading action={<PortfolioEditor kind="certification" title="Add certification or licence" label="Add Certification" fields={certificationFields()} />}>
                  Professional Certifications
                </SectionHeading>
                {certifications.length ? (
                  <ol className={timeline}>
                    {certifications.map((item) => (
                      <RecordRow key={item.id} title={item.name} subtitle={item.issuer} actions={
                        <>
                          <PortfolioEditor kind="certification" title="Edit certification or licence" label="Edit" id={item.id} fields={certificationFields(item)} />
                          <RemovePortfolioRecord kind="certification" id={item.id} name={item.name} />
                        </>
                      }>
                        <div className={`mt-2 space-y-1 wrap-anywhere ${muted}`}>
                          {item.registrationNumber && <p>Registration or licence number: {item.registrationNumber}</p>}
                          {item.issueDate && <p>Issued {portfolioDate.format(item.issueDate)}</p>}
                          {item.expiryDate && <p>Expires {portfolioDate.format(item.expiryDate)}</p>}
                        </div>
                      </RecordRow>
                    ))}
                  </ol>
                ) : <p className={`mt-4 ${muted}`}>Add relevant certifications, professional registrations, or practising licences if applicable.</p>}
              </Card>
            ),
          },
          {
            id: "documents",
            label: "Documents",
            content: (
              <Card className="bg-white">
                <SectionHeading>Documents</SectionHeading>
                {documents.length ? (
                  <ul className={`mt-2 ${ruled}`}>
                    {documents.map((document) => {
                      const href = `/profile/documents/${encodeURIComponent(document.id)}`;
                      return (
                        <li key={document.id} className="py-3">
                          <p className="wrap-anywhere text-sm font-semibold">{findProfileDocumentSpec(document.documentKey)?.label ?? document.originalFileName}</p>
                          <p className="mt-1 wrap-anywhere text-xs text-slate-600 dark:text-zinc-400">
                            {document.originalFileName} · {formatFileSize(document.fileSize)}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-zinc-400">
                            {document.mimeType === "application/pdf" ? "PDF" : document.mimeType.split("/").at(-1)?.toUpperCase()} · {formatDate(document.updatedAt)}
                          </p>
                          <div className="flex flex-wrap gap-x-3">
                            <a href={href} className={link}>View</a>
                            <a href={`${href}?download=1`} className={link}>Download</a>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : <p className={`mt-3 ${muted}`}>No profile documents uploaded yet.</p>}
                {missing.length > 0 && <p className={`mt-2 ${muted}`}>Still needed: {missing.map(({ label }) => label).join(", ")}.</p>}
                {profile ? (
                  <details className="mt-2">
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300">Manage documents</summary>
                    <p className={muted}>PDF, JPEG or PNG, up to {formatFileSize(maxUploadBytes)} per file.</p>
                    <ul className={`mt-2 ${ruled}`}>
                      {[...categorySpecs, ...additionalSpecs].map((spec) => {
                        const file = documents.find(({ documentKey }) => documentKey === spec.key);
                        return (
                          <li key={spec.key}>
                            <ProfileDocumentField
                              document={spec}
                              initial={file ? { id: file.id, documentKey: file.documentKey, originalFileName: file.originalFileName, mimeType: file.mimeType, fileSize: file.fileSize, url: null } : null}
                              accept={DOCUMENT_ACCEPT_ATTRIBUTE}
                              canUpload
                              compact
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : <p className={`mt-2 ${muted}`}>Save your personal information to enable uploads.</p>}
              </Card>
            ),
          },
          {
            id: "languages",
            label: "Language proficiency",
            href: profileStepHref("languages", null, false),
          },
          {
            id: "computer-literacy",
            label: "Computer literacy",
            href: profileStepHref("computer-literacy", null, false),
          },
        ]}
      />
    </main>
  );
}

import { Badge } from "@/components/ui";
import { formatFileSize } from "@/lib/document-files";
import { humanizeStatus } from "@/lib/format";

type DocumentView = {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  reviewStatus: "PENDING" | "ACCEPTED" | "REJECTED";
  reviewComment: string | null;
  cloudUrl?: string | null;
};

export type DocumentReviewItem = {
  id: string;
  label: string;
  description: string | null;
  requirementStatus: "REQUIRED" | "OPTIONAL";
  document: DocumentView | null;
};

const reviewTone: Record<string, string> = {
  MISSING: "neutral",
  PENDING: "amber",
  ACCEPTED: "green",
  REJECTED: "red",
};

const reviewLabel: Record<string, string> = {
  MISSING: "Not submitted",
  PENDING: "Pending review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

function DocumentReviewRow({
  applicationId,
  item,
}: {
  applicationId: string;
  item: DocumentReviewItem;
}) {
  const document = item.document;
  const status = document ? document.reviewStatus : "MISSING";
  const baseUrl = document?.cloudUrl
    ? document.cloudUrl
    : `/applications/${applicationId}/documents/${document?.id}`;
  const downloadUrl = document?.cloudUrl
    ? document.cloudUrl
    : `${baseUrl}?download=1`;

  return (
    <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {item.label}{" "}
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              ({item.requirementStatus === "REQUIRED" ? "required" : "optional"})
            </span>
          </p>
          {item.description && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {item.description}
            </p>
          )}
        </div>
        <Badge tone={reviewTone[status] ?? "neutral"}>
          {reviewLabel[status] ?? humanizeStatus(status)}
        </Badge>
      </div>

      {document ? (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <a
              href={baseUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {document.originalFileName}
            </a>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatFileSize(document.fileSize)}
            </span>
            <a
              href={downloadUrl}
              className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-300"
            >
              Download
            </a>
          </div>

          {document.reviewComment && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Reviewer note: {document.reviewComment}
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          The candidate has not uploaded this document.
        </p>
      )}
    </div>
  );
}

export function ApplicationDocumentsReview({
  applicationId,
  items,
  extra,
  requiredCount,
  requiredSubmitted,
  missingRequired,
  photoUrl,
}: {
  applicationId: string;
  items: DocumentReviewItem[];
  extra: DocumentView[];
  requiredCount: number;
  requiredSubmitted: number;
  missingRequired: number;
  photoUrl?: string | null;
}) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Documents
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {requiredSubmitted}/{requiredCount} required submitted
          {missingRequired > 0 ? ` · ${missingRequired} missing` : ""}
        </span>
      </div>

      {photoUrl && (
        <div className="mt-3 flex items-center gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          {/* Profile photo is served from Cloudinary; not run through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Candidate profile photograph"
            className="h-16 w-16 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
          />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Profile photograph
            </p>
            <a
              href={photoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              View full size
            </a>
          </div>
        </div>
      )}

      {items.length === 0 && extra.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          This vacancy requested no documents.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item) => (
            <DocumentReviewRow
              key={item.id}
              applicationId={applicationId}
              item={item}
            />
          ))}
          {extra.map((document) => (
            <div
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-zinc-300 p-3 text-sm dark:border-zinc-700"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  Additional document
                </p>
                <a
                  href={
                    document.cloudUrl ??
                    `/applications/${applicationId}/documents/${document.id}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  {document.originalFileName}
                </a>{" "}
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  ({formatFileSize(document.fileSize)})
                </span>
              </div>
              <Badge tone={reviewTone[document.reviewStatus] ?? "neutral"}>
                {reviewLabel[document.reviewStatus] ??
                  humanizeStatus(document.reviewStatus)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

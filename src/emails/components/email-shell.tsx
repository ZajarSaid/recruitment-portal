import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

/**
 * Shared UI tokens so every transactional email renders with one consistent
 * look. Plain inline styles are used instead of Tailwind so the markup stays
 * dependable across the mail clients Resend delivers to.
 */
const palette = {
  background: "#f1f5f9",
  card: "#ffffff",
  heading: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  accent: "#1d4ed8",
  accentDark: "#1e3a8a",
  border: "#e2e8f0",
  soft: "#eff6ff",
} as const;

const styles = {
  body: {
    backgroundColor: palette.background,
    color: palette.body,
    fontFamily:
      "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: "0",
    padding: "0",
  } as React.CSSProperties,
  wrapper: {
    padding: "32px 16px",
  } as React.CSSProperties,
  container: {
    backgroundColor: palette.card,
    borderRadius: "12px",
    border: `1px solid ${palette.border}`,
    margin: "0 auto",
    maxWidth: "560px",
    overflow: "hidden",
  } as React.CSSProperties,
  brandBar: {
    backgroundColor: palette.accentDark,
    padding: "20px 32px",
  } as React.CSSProperties,
  brandText: {
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    margin: "0",
  } as React.CSSProperties,
  heading: {
    color: palette.heading,
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: "1.35",
    margin: "0 0 16px",
    padding: "28px 32px 0",
  } as React.CSSProperties,
  content: {
    padding: "20px 32px 8px",
  } as React.CSSProperties,
  footerKeys: {
    color: palette.muted,
    fontSize: "12px",
    lineHeight: "1.6",
    margin: "0 0 4px",
    padding: "16px 32px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  divided: {
    borderColor: palette.border,
    margin: "24px 32px 0",
  } as React.CSSProperties,
};

export function EmailShell({
  preview,
  heading,
  children,
}: {
  preview: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Section style={styles.wrapper}>
          <Container style={styles.container}>
            <Section style={styles.brandBar}>
              <Text style={styles.brandText}>Recruitment Portal</Text>
            </Section>
            <Text style={styles.heading}>{heading}</Text>
            <Section style={styles.content}>{children}</Section>
            <Hr style={styles.divided} />
            <Text style={styles.footerKeys}>
              You are receiving this email because of your account on the
              Recruitment Portal. Replies are not monitored.
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}

export function EmailParagraph({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Text
      style={{
        fontSize: "15px",
        lineHeight: "1.65",
        margin: "0 0 14px",
        ...style,
      }}
    >
      {children}
    </Text>
  );
}

export function EmailMuted({ children }: { children: React.ReactNode }) {
  return (
    <EmailParagraph style={{ color: palette.muted, fontSize: "13px" }}>
      {children}
    </EmailParagraph>
  );
}

/**
 * Highlighted summary block used to present the key facts of a job
 * (title, department, location, dates, ...) in a scannable format.
 */
export function EmailSummaryCard({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <Section
      style={{
        backgroundColor: palette.soft,
        border: `1px solid ${palette.border}`,
        borderRadius: "8px",
        margin: "0 0 20px",
        padding: "16px 20px",
      }}
    >
      {rows.map((row) => (
        <Text
          key={row.label}
          style={{
            fontSize: "14px",
            lineHeight: "1.6",
            margin: "0",
          }}
        >
          <strong style={{ color: palette.heading }}>{row.label}:</strong>{" "}
          {row.value}
        </Text>
      ))}
    </Section>
  );
}

export function EmailButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ margin: "24px 0 8px" }}>
      <Link
        href={href}
        style={{
          backgroundColor: palette.accent,
          borderRadius: "8px",
          color: "#ffffff",
          display: "inline-block",
          fontSize: "15px",
          fontWeight: 600,
          letterSpacing: "0.2px",
          padding: "12px 24px",
          textDecoration: "none",
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

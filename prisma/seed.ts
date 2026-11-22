import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure .env before seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(connectionString),
});

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

type SeedJob = {
  title: string;
  department: string;
  location: string;
  description: string;
  qualifications: string;
  category: "GENERAL" | "MEDICINE" | "IT" | "BUSINESS";
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  opensAt: Date;
  closesAt: Date;
};

const seedJobs: SeedJob[] = [
  {
    title: "Senior Software Engineer",
    department: "ICT",
    location: "Dodoma",
    description:
      "Design, build and maintain the core recruitment platform services and integrations.",
    qualifications:
      "Bachelor's degree in Computer Science or related field, 5+ years of professional software engineering experience, strong TypeScript and PostgreSQL skills.",
    category: "IT",
    status: "PUBLISHED",
    opensAt: new Date(now - 2 * DAY),
    closesAt: new Date(now + 20 * DAY),
  },
  {
    title: "Human Resources Officer",
    department: "Human Resources",
    location: "Dar es Salaam",
    description:
      "Coordinate recruitment, onboarding and personnel administration activities.",
    qualifications:
      "Bachelor's degree in Human Resources Management, 3+ years of HR experience, familiarity with Tanzanian labour law.",
    category: "BUSINESS",
    status: "PUBLISHED",
    opensAt: new Date(now - 1 * DAY),
    closesAt: new Date(now + 14 * DAY),
  },
  {
    title: "Finance and Accounts Officer",
    department: "Finance",
    location: "Dodoma",
    description:
      "Prepare financial statements, manage payroll and support annual audits.",
    qualifications:
      "Bachelor's degree in Accounting or Finance, CPA (T) qualification is an added advantage, 2+ years of experience.",
    category: "BUSINESS",
    status: "PUBLISHED",
    opensAt: new Date(now + 5 * DAY),
    closesAt: new Date(now + 35 * DAY),
  },
  {
    title: "Records Management Assistant",
    department: "Records",
    location: "Mwanza",
    description:
      "Maintain physical and electronic personnel records and support the records officer.",
    qualifications:
      "Diploma in Records Management or related field, 1+ year of experience with document management systems.",
    category: "GENERAL",
    status: "DRAFT",
    opensAt: new Date(now),
    closesAt: new Date(now + 30 * DAY),
  },
];

type SeedUser = {
  name: string;
  /** Real, final email for the account. */
  email: string;
  /**
   * Placeholder email used by earlier versions of the seed. When present, an
   * existing row with this email is claimed and renamed instead of creating
   * a duplicate - this keeps job assignments from old seeds intact.
   */
  previousEmail?: string;
  role: "ADMIN" | "RECRUITER" | "CANDIDATE";
  plainPassword: string;
};

const seedUsers: SeedUser[] = [
  {
    name: "Portal Administrator",
    email: "zacharia1199@outlook.com",
    previousEmail: "admin@recruitment.go.tz",
    role: "ADMIN",
    plainPassword: "Admin@12345",
  },
  {
    name: "Grace Mushi",
    email: "zacharia1199@gmail.com",
    previousEmail: "recruiter@recruitment.go.tz",
    role: "RECRUITER",
    plainPassword: "Recruiter@12345",
  },
  {
    name: "Juma Ally",
    email: "candidate@recruitment.go.tz",
    role: "CANDIDATE",
    plainPassword: "Candidate@12345",
  },
];

/**
 * Creates the account when it is new, refreshes its credentials when it
 * already exists, and absorbs the legacy demo row (if any) so repeated runs
 * are safe. All writes go through the unique `email`, so a P2002 collision
 * can only happen for genuinely conflicting accounts.
 */
async function upsertSeedUser(seed: SeedUser) {
  const passwordHash = await hash(seed.plainPassword);
  const data = {
    name: seed.name,
    role: seed.role,
    passwordHash,
    isActive: true,
  };
  const eligibleRole = seed.role === "CANDIDATE" ? undefined : { not: "CANDIDATE" as const };

  let user = await prisma.user.findUnique({ where: { email: seed.email } });

  if (!user && seed.previousEmail) {
    const legacy = await prisma.user.findUnique({
      where: { email: seed.previousEmail },
    });
    if (legacy) {
      user = await prisma.user.update({
        where: { id: legacy.id, role: eligibleRole },
        data: { ...data, email: seed.email },
      });
    }
  }

  if (user) {
    return prisma.user.update({ where: { id: user.id, role: eligibleRole }, data });
  }

  return prisma.user.create({
    data: { ...data, email: seed.email },
  });
}

async function main() {
  const [admin, recruiter] = await Promise.all([
    upsertSeedUser(seedUsers[0]),
    upsertSeedUser(seedUsers[1]),
  ]);

  await upsertSeedUser(seedUsers[2]);

  // Give the demo candidate a completed master profile so the profile-based
  // application flow can be exercised immediately.
  const candidate = await prisma.user.findUnique({
    where: { email: seedUsers[2].email },
    select: { id: true },
  });
  if (candidate) {
    await prisma.candidateProfile.upsert({
      where: { userId: candidate.id },
      create: {
        userId: candidate.id,
        educationLevel: "BACHELOR",
        birthYear: 1996,
        birthMonth: 4,
        physicalAddress: "Plot 12, Kikuyu Avenue, Kariakoo, Ilala, Dar es Salaam",
        computerLiteracy: "INTERMEDIATE",
        languages: "Kiswahili, English",
        category: "IT",
      },
      update: {
        educationLevel: "BACHELOR",
        birthYear: 1996,
        birthMonth: 4,
        physicalAddress: "Plot 12, Kikuyu Avenue, Kariakoo, Ilala, Dar es Salaam",
        computerLiteracy: "INTERMEDIATE",
        languages: "Kiswahili, English",
        category: "IT",
      },
    });
  }

  for (const job of seedJobs) {
    const existing = await prisma.job.findFirst({
      where: { title: job.title },
    });

    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: { ...job, recruiterId: recruiter.id },
      });
    } else {
      await prisma.job.create({
        data: {
          ...job,
          createdById: admin.id,
          recruiterId: recruiter.id,
        },
      });
    }
  }

  const [users, jobs, profiles] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.candidateProfile.count(),
  ]);

  console.log("Seed complete.");
  console.log(`  Users:             ${users}`);
  console.log(`  Jobs:              ${jobs}`);
  console.log(`  Candidate profiles: ${profiles}`);
  console.log("Sample accounts:");
  for (const seed of seedUsers) {
    console.log(`  ${seed.email.padEnd(28)} / ${seed.plainPassword} (${seed.role})`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

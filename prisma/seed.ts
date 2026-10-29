import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { buildDocumentTypeCatalog } from "../src/lib/documents";

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
    status: "DRAFT",
    opensAt: new Date(now),
    closesAt: new Date(now + 30 * DAY),
  },
];

async function main() {
  const [adminHash, recruiterHash, candidateHash] = await Promise.all([
    hash("Admin@12345"),
    hash("Recruiter@12345"),
    hash("Candidate@12345"),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@recruitment.go.tz" },
    update: { passwordHash: adminHash, isActive: true, role: "ADMIN" },
    create: {
      name: "Portal Administrator",
      email: "admin@recruitment.go.tz",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const recruiter = await prisma.user.upsert({
    where: { email: "recruiter@recruitment.go.tz" },
    update: { passwordHash: recruiterHash, isActive: true, role: "RECRUITER" },
    create: {
      name: "Grace Mushi",
      email: "recruiter@recruitment.go.tz",
      passwordHash: recruiterHash,
      role: "RECRUITER",
    },
  });

  await prisma.user.upsert({
    where: { email: "candidate@recruitment.go.tz" },
    update: { passwordHash: candidateHash, isActive: true, role: "CANDIDATE" },
    create: {
      name: "Juma Ally",
      email: "candidate@recruitment.go.tz",
      passwordHash: candidateHash,
      role: "CANDIDATE",
    },
  });

  for (const type of buildDocumentTypeCatalog()) {
    await prisma.documentType.upsert({
      where: { name: type.name },
      update: { description: type.description, category: type.category },
      create: {
        name: type.name,
        description: type.description,
        category: type.category,
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

  const [users, jobs, documentTypes] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.documentType.count(),
  ]);

  console.log("Seed complete.");
  console.log(`  Users:          ${users}`);
  console.log(`  Jobs:           ${jobs}`);
  console.log(`  Document types: ${documentTypes}`);
  console.log("Sample accounts:");
  console.log("  admin@recruitment.go.tz     / Admin@12345 (ADMIN)");
  console.log("  recruiter@recruitment.go.tz / Recruiter@12345 (RECRUITER)");
  console.log("  candidate@recruitment.go.tz / Candidate@12345 (CANDIDATE)");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

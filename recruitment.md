Build a functional, secure, database-driven recruitment portal that simulates the core recruitment activities of the Public Service Recruitment Secretariat (PSRS).
Project: Secure Job Recruitment Management Portal
1. Project Introduction
Build a simple, secure, full-stack job recruitment portal that simulates the core recruitment activities of the Public Service Recruitment Secretariat (PSRS).
The system should allow candidates to register, browse published job vacancies, submit applications, and track their application statuses. Recruiters should manage job vacancies, review applications, and update recruitment decisions. Administrators should manage users, roles, jobs, and the overall recruitment process.
The application must be functional, database-driven, secure, and suitable for demonstrating during a software development interview. Do not build only a UI or use mock data as the permanent data source.
2. Required Technology Stack
Use the following technologies:
•	Framework: Next.js with React, TypeScript, and App Router.
•	Backend logic: Next.js Server Actions and Route Handlers.
•	Database: PostgreSQL.
•	ORM: Prisma. 7.10
•	Authentication: A reliable authentication library compatible with Next.js.
•	Styling: Tailwind CSS.
•	Validation: Zod.
•	Testing: Vitest and React Testing Library, with integration tests where appropriate.
•	Version control: Git.
Important restrictions:
•	Use Next.js for both the frontend and server-side application logic.
•	Do not use Django, Django REST Framework, Python, or a separate backend framework.
•	Do not connect to PostgreSQL directly from browser code.
•	Do not introduce microservices, Redis, or other unnecessary infrastructure.
•	Store secrets in environment variables.
•	Provide a .env.example file without real credentials.
3. User Roles
Candidate
•	Register, log in, and manage their profile.
•	Browse and search published jobs.
•	View job descriptions, qualifications, salaries, locations, and deadlines.
•	Submit an application with a professional summary or resume text.
•	View their submitted applications and statuses.
•	Access only their own private application information.
Recruiter
•	Create, edit, publish, and close job vacancies.
•	View applications for jobs they are authorized to manage.
•	Review candidate information and resume summaries.
•	Shortlist or reject candidates.
•	Move applications into review and add optional review notes.
•	View application statistics for their assigned jobs.
Administrator
•	Manage user accounts and roles.
•	Oversee jobs and applications.
•	Assign recruiters to jobs where appropriate.
•	View basic recruitment statistics.
•	Access administrative functions unavailable to other users.
All permissions must be enforced on the server. Hiding buttons or pages in the frontend is not sufficient.
4. Core Functional Requirements
4.1 Job management
Each job should contain:
•	Unique ID.
•	Job title.
•	Department.
•	Job location.
•	Salary, presented as Negotiable (no fixed figure or range is captured).
•	Job description.
•	Required qualifications.
•	Application opening and closing dates.
•	Status: DRAFT, PUBLISHED, or CLOSED.
•	Recruiter or creator reference.
•	Creation and update timestamps.
Only published jobs within their application period may accept applications.
4.2 Candidate applications
Each application should contain:
•	Candidate reference.
•	Job reference.
•	Resume text or professional summary.
•	Submission timestamp.
•	Current application status.
•	Optional evaluation result.
•	Review information where appropriate.
A candidate must not be able to submit multiple applications for the same job. Enforce this rule through server-side validation and a database-level unique constraint.
Reject applications for unpublished jobs, closed jobs, or jobs whose application deadlines have passed.
Candidates must not be able to modify their own review decisions, scores, or application statuses.
4.3 Application evaluation
Keep evaluation simple and transparent.
•	If a resume quality score is implemented, use a documented, deterministic rubric with a fixed range, such as 1–10.
•	Save the score so it remains consistent when the application is viewed again.
•	Never generate a new random score on each page load.
•	Candidates must not choose or modify their own scores.
•	Do not implement distance calculations, residential-location comparisons, location-priority points, or location-based scoring.
•	Do not use a candidate's physical location to rank applications.
•	Recruiters must be able to review qualifications and application information independently of numerical scores.
•	Clearly identify any automated evaluation as a simulated assessment, not an objective or legally validated measure of candidate suitability.
4.4 Application status workflow
Implement this lifecycle:
SUBMITTED → UNDER_REVIEW → SHORTLISTED or REJECTED
Only authorized recruiters and administrators can change statuses.
Record each status change with:
•	Application reference.
•	Previous status.
•	New status.
•	User who made the change.
•	Timestamp.
•	Optional review note.
Reject unauthorized changes and invalid status transitions.
5. Database Design
Use PostgreSQL and Prisma ORM.
Start with these essential models:
1.	User: Name, normalized email, authentication information, role, active status, and timestamps.
2.	Job: Vacancy details, salary, location, deadlines, publication status, creator or recruiter assignment, and timestamps.
3.	Application: Candidate, job, resume summary, submission date, and status.
4.	ApplicationEvaluation: Optional resume score, evaluation method, and evaluation timestamp.
5.	ApplicationStatusHistory: Previous status, new status, actor, timestamp, and optional review notes.
Add other models only when needed for actual functionality.
Requirements:
•	Define proper relationships, indexes, and constraints.
•	Enforce unique candidate-job applications at the database level.
•	Use Prisma migrations for schema changes.
•	Use database transactions for operations that must succeed or fail together.
•	Preserve recruitment history where practical.
•	Use server-side database access only.
•	Never expose credentials or privileged database operations to the browser.
Avoid unnecessary duplication between application records and evaluation records.
6. Required Pages
Public pages
•	Home page.
•	Job listings.
•	Individual job details.
•	Registration.
•	Login.
•	Password recovery.
Candidate dashboard
•	Profile management.
•	My applications.
•	Application submission form.
•	Application details and status tracking.
Recruiter dashboard
•	Job management.
•	Create and edit job forms.
•	Applications grouped by job.
•	Candidate application review.
•	Optional evaluation results.
•	Shortlisting and rejection controls.
•	Review notes and status history.
Administrator dashboard
•	User and role management.
•	Job oversight.
•	Application oversight.
•	Basic recruitment statistics.
Use a responsive, accessible interface with loading states, validation messages, success notifications, empty states, and error handling.
Public job pages should have meaningful titles and descriptions for search engines. Private dashboards and candidate information must be protected from unauthorized access and indexing.
7. Authentication and Security
Implement:
•	Secure registration, login, and logout.
•	Secure password hashing if using password-based authentication.
•	Password recovery where supported by the selected authentication library.
•	Role-based access control.
•	Server-side validation of all sensitive operations.
•	Record-level access control for candidate applications.
•	Appropriate session and cookie security.
•	Authentication rate limiting where practical.
•	Safe error handling and logging.
•	Environment-based configuration.
•	HTTPS-ready production settings.
Prefer secure HTTP-only cookies or a properly configured authentication library. Never store long-lived authentication credentials in browser localStorage.
Never trust a role, candidate ID, score, or status supplied by the browser without verifying it on the server.
Do not hardcode production credentials, disable security checks, or allow unrestricted access to protected operations.
8. Development Phases
Work through these phases in order. Do not attempt to build everything at once.
Phase 1: Workspace inspection and planning
•	Inspect the existing project before making changes.
•	Identify the current folder structure, dependencies, and configuration.
•	Confirm the Next.js, TypeScript, PostgreSQL, and Prisma architecture.
•	Propose the database schema and application folder structure.
•	Identify authentication and authorization requirements.
•	Create a concise implementation checklist.
•	Explain major architectural decisions briefly.
Completion criteria: The architecture and implementation plan are clear and approved before substantial implementation begins.
Phase 2: Project setup and database
•	Configure Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.
•	Set up environment variables.
•	Create the initial Prisma schema.
•	Generate and apply database migrations.
•	Add a small set of demonstration jobs and users if appropriate.
•	Verify database connectivity and basic CRUD operations.
Completion criteria: The application connects to PostgreSQL, and records can be saved and retrieved successfully.
Phase 3: Authentication and authorization
•	Implement registration, login, and logout.
•	Add password recovery if supported by the selected authentication approach.
•	Define Candidate, Recruiter, and Administrator roles.
•	Protect private pages and server-side operations.
•	Verify that each role can perform only authorized actions.
•	Prevent users from changing their own roles or accessing other candidates' private data.
Completion criteria: Users can authenticate, and unauthorized access is rejected on the server.
Phase 4: Job management
•	Build public job listings and job details.
•	Implement job creation, editing, publishing, and closing.
•	Add form validation and deadline checks.
•	Restrict job management to authorized recruiters and administrators.
•	Ensure only eligible published jobs accept applications.
Completion criteria: Jobs can be managed and displayed correctly, with data persisted in PostgreSQL.
Phase 5: Candidate applications
•	Implement application submission.
•	Build the candidate dashboard and application history.
•	Validate resume summaries and required fields on the server.
•	Prevent duplicate applications.
•	Reject applications to ineligible jobs.
•	Ensure candidates can view only their own applications.
•	Verify that application records remain available after refreshing or signing in again.
Completion criteria: A candidate can successfully submit one application per eligible job and track its status.
Phase 6: Recruiter review and evaluation
•	Display applications grouped by job.
•	Show candidate information and resume summaries to authorized reviewers.
•	Implement optional deterministic resume scoring without any location-based points.
•	Allow recruiters to move applications into review, shortlist candidates, or reject applications.
•	Add optional review notes.
•	Record status changes in the database.
•	Show recruiters a clear application review interface.
Completion criteria: Recruiters can review applications, make decisions, and preserve status history.
Phase 7: Administrator dashboard
•	Implement user and role management.
•	Provide oversight of all jobs and applications.
•	Add basic statistics, including published jobs, submitted applications, shortlisted candidates, and rejected applications.
•	Restrict administrative operations to authorized administrators.
Completion criteria: Administrators can oversee the recruitment process securely.
Phase 8: Testing and security verification
Write automated tests covering:
•	Registration, login, and logout.
•	Role-based permissions.
•	Job creation, publication, and closure.
•	Invalid or expired job applications.
•	Duplicate-application prevention.
•	Candidate privacy and record ownership.
•	Valid and invalid status transitions.
•	Prevention of unauthorized role, score, and status changes.
•	Evaluation consistency if scoring is implemented.
Then:
•	Run linting.
•	Run TypeScript checks.
•	Run automated tests.
•	Run the production build.
•	Fix failures before proceeding.
Completion criteria: Core tests pass, and the production build succeeds.
Phase 9: Final verification and documentation
•	Test the complete workflow from registration to recruiter decision.
•	Verify that records persist in PostgreSQL.
•	Check permissions for all three user roles.
•	Document installation, environment variables, migrations, testing, and deployment.
•	Provide a .env.example file.
•	Write a README with setup instructions and troubleshooting.
•	Report completed features, test results, and any incomplete work honestly.
Completion criteria: Another developer can set up the project and reproduce the core recruitment workflow using the documentation.
9. Rules OpenCode Must Follow
1.	Work phase by phase.
2.	Inspect existing files before modifying or deleting them.
3.	Do not overwrite working code unnecessarily.
4.	Keep the code simple, readable, and maintainable.
5.	Validate all sensitive inputs and permissions on the server.
6.	Never expose secrets or database credentials.
7.	Use Prisma migrations for database changes.
8.	Do not use Django, Python, or a separate backend framework.
9.	Do not implement distance-based scoring or location-priority points.
10.	Do not add unrelated features such as payroll, employee onboarding, or interview scheduling unless explicitly requested.
11.	Do not claim that a feature works or a test passes unless it has actually been verified.
12.	Maintain a progress checklist showing completed phases, current tasks, test results, and next steps.
13.	Fix errors before moving to the next phase.
14.	If a requirement is ambiguous, explain the issue and propose the simplest reliable solution before proceeding.
15.	Prioritize working functionality, security, database integrity, and clear documentation over visual polish or unnecessary features.
10. Definition of Done
The project is complete when:
•	Candidates can register, log in, browse jobs, apply, and track application statuses.
•	Recruiters can manage vacancies and review applications.
•	Administrators can manage users and oversee recruitment.
•	Permissions are enforced on the server.
•	PostgreSQL reliably stores jobs, applications, evaluations, and status history.
•	Duplicate applications are prevented.
•	Application status transitions are controlled and recorded.
•	Any evaluation is consistent, transparent, and independent of physical location.
•	Automated tests pass.
•	The production build succeeds.
•	Setup and deployment instructions are complete.
Final priority: Deliver a secure, functional, and demonstrable recruitment portal using Next.js as the only application framework, with PostgreSQL as the database. Complete the core workflow before adding optional features.



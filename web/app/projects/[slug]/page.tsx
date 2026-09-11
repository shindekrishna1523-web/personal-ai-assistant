import Link from "next/link";
import { projects } from "../../data/projects";
import Screenshot from "../Screenshot";

type PageProps = {
    params: Promise<{ slug: string }>;
};

//function Screenshot({
//    src,
//    alt,
//    title,
//}: {
//    src: string;
//    alt: string;
//    title: string;
//}) {
//    return (
//        <div className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
//            <div className="relative aspect-video overflow-hidden bg-black">
//                <Image
//                    src={src}
//                    alt={alt}
//                    fill
//                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
//                    sizes="(max-width: 768px) 100vw, 50vw"
//                />
//            </div>

//            <div className="border-t border-white/10 px-5 py-4">
//                <p className="text-sm font-medium text-white">{title}</p>
//            </div>
//        </div>
//    );
//}

function ArchitectureBox({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-white">
                {title}
            </h3>

            <p className="text-sm leading-6 text-zinc-400">
                {description}
            </p>
        </div>
    );
}

export default async function ProjectCaseStudy({ params }: PageProps) {
    const { slug } = await params;

    const project = projects.find((item) => item.id === slug);

    if (!project) {
        return (
            <main className="min-h-screen bg-[#050505] px-6 py-24 text-white">
                <div className="mx-auto max-w-4xl">
                    <p className="mb-4 text-sm uppercase tracking-[0.25em] text-zinc-500">
                        404
                    </p>

                    <h1 className="text-4xl font-bold">
                        Project not found
                    </h1>

                    <Link
                        href="/"
                        className="mt-8 inline-flex rounded-full border border-white/15 px-5 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
                    >
                        ← Back to Portfolio
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050505] text-white">
            {/* NAVBAR */}
            <header className="border-b border-white/10 bg-[#050505]/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <Link
                        href="/"
                        className="text-lg font-bold tracking-[0.2em] text-white"
                    >
                        SR.DEV
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:border-white/25 hover:text-white"
                        >
                            ← Portfolio
                        </Link>

                        {project.github && (
                            <a
                                href={project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-400 transition hover:border-white/25 hover:text-white sm:inline-flex"
                            >
                                GitHub ↗
                            </a>
                        )}

                        {project.live && (
                            <a
                                href={project.live}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
                            >
                                Live Demo ↗
                            </a>
                        )}
                    </div>
                </div>
            </header>

            {/* HERO */}
            <section className="border-b border-white/10">
                <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
                    <div className="max-w-5xl">
                        <div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">
                            <span>{project.number}</span>
                            <span className="text-zinc-700">/</span>
                            <span>{project.category}</span>
                        </div>

                        <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
                            {project.title}
                        </h1>

                        <p className="mt-8 max-w-3xl text-lg leading-8 text-zinc-400 md:text-xl">
                            {project.description}
                        </p>

                        <div className="mt-10 flex flex-wrap gap-3">
                            {project.technologies.slice(0, 8).map((tech) => (
                                <span
                                    key={tech}
                                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-zinc-300"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* PROJECT META */}
            <section className="border-b border-white/10">
                <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
                    <div className="px-6 py-8">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                            Role
                        </p>

                        <p className="mt-2 text-sm text-zinc-300">
                            {project.role ?? "Full-Stack Developer"}
                        </p>
                    </div>

                    <div className="px-6 py-8">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                            Stack
                        </p>

                        <p className="mt-2 text-sm text-zinc-300">
                            Next.js · .NET · PostgreSQL · AI
                        </p>
                    </div>

                    <div className="px-6 py-8">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                            Deployment
                        </p>

                        <p className="mt-2 text-sm text-zinc-300">
                            Vercel · Render
                        </p>
                    </div>
                </div>
            </section>

            {/* OVERVIEW */}
            <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                <div className="grid gap-12 md:grid-cols-[0.7fr_1.3fr]">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-600">
                            01 — Overview
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                            Built as a real-world AI application.
                        </h2>
                    </div>

                    <div className="space-y-6 text-base leading-8 text-zinc-400">
                        <p>
                            Personal AI Assistant is a full-stack application
                            designed to provide users with an intelligent
                            conversational experience through a modern web
                            interface.
                        </p>

                        <p>
                            The system combines a Next.js frontend with an
                            ASP.NET Core Web API, persistent database storage,
                            authentication and Gemini AI integration.
                        </p>

                        <p>
                            The application also supports conversation history,
                            AI memory, file and image uploads and responsive
                            interaction across devices.
                        </p>
                    </div>
                </div>
            </section>

            {/* SCREENSHOTS */}
            <section className="border-y border-white/10 bg-white/[0.015]">
                <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                    <div className="mb-12">
                        <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-600">
                            02 — Product Screens
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                            Application interface
                        </h2>

                        <p className="mt-4 max-w-2xl text-zinc-400">
                            Selected screens from the Personal AI Assistant
                            application.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Screenshot
                            src="/images/personal-ai-assistant/01-login-page.png"
                            alt="Personal AI Assistant login page"
                            title="Login"
                        />

                        <Screenshot
                            src="/images/personal-ai-assistant/02-register-page.png"
                            alt="Personal AI Assistant registration page"
                            title="Registration"
                        />

                        <Screenshot
                            src="/images/personal-ai-assistant/03-chat-interface.png"
                            alt="Personal AI Assistant chat interface"
                            title="AI Chat Interface"
                        />

                        <Screenshot
                            src="/images/personal-ai-assistant/04-file-image-upload.png"
                            alt="Personal AI Assistant file and image upload"
                            title="File & Image Upload"
                        />

                        <Screenshot
                            src="/images/personal-ai-assistant/05-dark-mode.png"
                            alt="Personal AI Assistant dark mode interface"
                            title="Dark Mode"
                        />

                        <Screenshot
                            src="/images/personal-ai-assistant/06-memory-reminder.png"
                            alt="Personal AI Assistant memory feature"
                            title="AI Memory"
                        />
                    </div>
                </div>
            </section>

            {/* TECHNOLOGY */}
            <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                <div className="grid gap-12 md:grid-cols-[0.7fr_1.3fr]">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-600">
                            03 — Technology
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                            Technology stack
                        </h2>
                    </div>

                    <div className="flex flex-wrap content-start gap-3">
                        {project.technologies.map((technology) => (
                            <span
                                key={technology}
                                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
                            >
                                {technology}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="border-y border-white/10 bg-white/[0.015]">
                <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                    <div className="grid gap-12 md:grid-cols-[0.7fr_1.3fr]">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-600">
                                04 — Features
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                                What it can do
                            </h2>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {(project.features ?? []).map((feature, index) => (
                                <div
                                    key={feature}
                                    className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20"
                                >
                                    <span className="text-xs text-zinc-600">
                                        {String(index + 1).padStart(2, "0")}
                                    </span>

                                    <span className="text-sm leading-6 text-zinc-300">
                                        {feature}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ARCHITECTURE */}
            <section className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                <div className="mb-12">
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-600">
                        05 — Architecture
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                        How the system works
                    </h2>

                    <p className="mt-4 max-w-3xl leading-7 text-zinc-400">
                        {project.architecture}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <ArchitectureBox
                        title="Frontend"
                        description="Next.js, React, TypeScript and Tailwind CSS provide the responsive user interface and client-side experience."
                    />

                    <ArchitectureBox
                        title="Backend"
                        description="ASP.NET Core Web API and C# handle authentication, business logic, AI requests and RESTful API operations."
                    />

                    <ArchitectureBox
                        title="Data & AI"
                        description="PostgreSQL provides persistent application data while Google Gemini powers AI-generated responses."
                    />
                </div>

                <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#080808] p-6 md:p-10">
                    <div className="grid gap-4 text-center md:grid-cols-5">
                        {[
                            "Next.js",
                            "ASP.NET Core",
                            "REST API",
                            "PostgreSQL",
                            "Gemini AI",
                        ].map((item, index) => (
                            <div key={item} className="relative">
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-5">
                                    <p className="text-sm font-medium text-white">
                                        {item}
                                    </p>
                                </div>

                                {index < 4 && (
                                    <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-zinc-600 md:block">
                                        →
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* DEPLOYMENT */}
            <section className="border-y border-white/10 bg-white/[0.015]">
                <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
                    <div className="grid gap-12 md:grid-cols-[0.7fr_1.3fr]">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-600">
                                06 — Deployment
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                                Running in the cloud.
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {(project.deployment ?? []).map((item) => (
                                <div
                                    key={item}
                                    className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-300"
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center md:p-16">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-600">
                        Explore the project
                    </p>

                    <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">
                        See the application in action.
                    </h2>

                    <p className="mx-auto mt-5 max-w-2xl leading-7 text-zinc-400">
                        Explore the live application or review the source code
                        on GitHub.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        {project.live && (
                            <a
                                href={project.live}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
                            >
                                Open Live Demo ↗
                            </a>
                        )}

                        {project.github && (
                            <a
                                href={project.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-white/15 px-6 py-3 text-sm text-zinc-300 transition hover:border-white/30 hover:text-white"
                            >
                                View Source on GitHub ↗
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
                    <p>SR.DEV · Krishnakant Shinde</p>

                    <Link
                        href="/"
                        className="transition hover:text-zinc-300"
                    >
                        Back to Portfolio ↑
                    </Link>
                </div>
            </footer>
        </main>
    );
}
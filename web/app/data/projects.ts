export type Project = {
    id: string;
    number: string;
    category: string;
    title: string;
    description: string;
    technologies: string[];
    featured?: boolean;
    github?: string;
    live?: string;
    role?: string;
    architecture?: string;
    features?: string[];
    deployment?: string[];
};

export const projects: Project[] = [
    {
        id: "personal-ai-assistant",
        number: "01",
        category: "AI - FULL-STACK - CLOUD",
        title: "Personal AI Assistant",

        description:
            "A full-stack AI-powered personal assistant that enables users to chat with AI, maintain conversation history, manage memories, upload files and images, and receive AI-generated responses through a responsive web interface.",

        technologies: [
            "Next.js 16",
            "React",
            "TypeScript",
            "Tailwind CSS",
            ".NET 8",
            "ASP.NET Core",
            "C#",
            "EF Core",
            "PostgreSQL",
            "Gemini AI",
            "JWT",
            "REST API",
            "Vercel",
            "Render",
        ],

        featured: true,

        github:
            "https://github.com/shindekrishna1523-web/personal-ai-assistant",

        live:
            "https://personal-ai-assistant-chi-six.vercel.app/login",

        role: "Full-Stack Developer",

        architecture:
            "Next.js frontend connected to an ASP.NET Core Web API, with PostgreSQL persistence and Google Gemini AI integration.",

        features: [
            "AI-powered conversational chat",
            "Conversation history",
            "AI memory management",
            "JWT authentication",
            "Real-time AI response streaming",
            "File and image uploads",
            "Responsive web interface",
            "RESTful backend APIs",
            "PostgreSQL data persistence",
            "Cloud deployment",
        ],

        deployment: [
            "Frontend deployed on Vercel",
            "Backend deployed on Render",
            "PostgreSQL database",
        ],
    },
];
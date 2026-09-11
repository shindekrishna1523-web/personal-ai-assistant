"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ScreenshotProps = {
    src: string;
    alt: string;
    title: string;
};

export default function Screenshot({
    src,
    alt,
    title,
}: ScreenshotProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    return (
        <>
            {/* Screenshot Card */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="group block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition duration-300 hover:border-white/25 hover:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-white/30"
                aria-label={`View larger image: ${title}`}
            >
                <div className="relative aspect-video overflow-hidden bg-black">
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-300 group-hover:bg-black/35">
                        <span className="translate-y-2 rounded-full border border-white/20 bg-black/60 px-5 py-2 text-sm text-white opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            Click to enlarge ↗
                        </span>
                    </div>
                </div>

                <div className="border-t border-white/10 px-5 py-4">
                    <p className="text-sm font-medium text-white">
                        {title}
                    </p>
                </div>
            </button>

            {/* Fullscreen Lightbox */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 md:p-8"
                    onClick={() => setIsOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${title} enlarged view`}
                >
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white backdrop-blur transition hover:bg-white/20"
                        aria-label="Close image"
                    >
                        ×
                    </button>

                    {/* Image Container */}
                    <div
                        className="relative h-[90vh] w-full max-w-7xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Image
                            src={src}
                            alt={alt}
                            fill
                            className="object-contain"
                            sizes="100vw"
                            priority
                        />
                    </div>

                    {/* Bottom Label */}
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-5 py-2 text-sm text-zinc-300 backdrop-blur">
                        {title} · Press ESC to close
                    </div>
                </div>
            )}
        </>
    );
}
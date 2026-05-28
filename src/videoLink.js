const VIDEO_EXT = /\.(mp4|webm|mov|ogg)(\?|$)/i;

/**
 * YouTube watch / share / embed URL-ből kinyeri a videó azonosítót.
 */
export function parseYouTubeVideoId(url) {
    const raw = String(url ?? "").trim();
    if (!raw) return null;

    try {
        const u = new URL(raw);
        const host = u.hostname.replace(/^www\./i, "").toLowerCase();

        if (host === "youtu.be") {
            const id = u.pathname.replace(/^\//, "").split("/")[0];
            return id || null;
        }

        if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
            if (u.pathname === "/watch" || u.pathname.startsWith("/watch/")) {
                return u.searchParams.get("v");
            }
            const parts = u.pathname.split("/").filter(Boolean);
            if (parts[0] === "embed" || parts[0] === "v" || parts[0] === "shorts") {
                return parts[1] || null;
            }
        }
    } catch {
        return null;
    }

    return null;
}

export function isYouTubeUrl(url) {
    return parseYouTubeVideoId(url) != null;
}

export function directVideoSrc(videoLink) {
    const raw = String(videoLink ?? "").trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
    return `/${raw}`;
}

/**
 * @returns {{ kind: 'youtube' | 'file', src: string } | null}
 */
export function resolveVideoPlayback(videoLink) {
    const raw = String(videoLink ?? "").trim();
    if (!raw) return null;

    const ytId = parseYouTubeVideoId(raw);
    if (ytId) {
        return {
            kind: "youtube",
            src: `https://www.youtube.com/embed/${ytId}`,
        };
    }

    return { kind: "file", src: directVideoSrc(raw) };
}

export function isLikelyPlayableVideo(value) {
    const v = String(value ?? "").trim();
    if (!v) return false;
    if (isYouTubeUrl(v)) return true;
    if (/^https?:\/\//i.test(v)) return true;
    return VIDEO_EXT.test(v);
}

export function inferVideoMod(videoLink) {
    const v = String(videoLink ?? "").trim();
    if (!v) return "url";
    if (/^https?:\/\//i.test(v)) return "url";
    return "file";
}

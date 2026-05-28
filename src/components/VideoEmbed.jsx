import { resolveVideoPlayback } from "../videoLink";

/**
 * Közvetlen videófájl (<video>) vagy YouTube beágyazás (<iframe>) megjelenítése.
 */
export default function VideoEmbed({
    videoLink,
    className,
    videoClassName,
    iframeClassName,
    title = "Gyakorlat videó",
    ...rest
}) {
    const playback = resolveVideoPlayback(videoLink);
    if (!playback) return null;

    if (playback.kind === "youtube") {
        return (
            <iframe
                className={iframeClassName ?? className}
                src={playback.src}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                {...rest}
            />
        );
    }

    return (
        <video
            className={videoClassName ?? className}
            src={playback.src}
            controls
            preload="metadata"
            playsInline
            {...rest}
        />
    );
}

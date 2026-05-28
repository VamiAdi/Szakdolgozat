import { useRef, useState } from "react";
import { adminAuthedFetch, apiUrl } from "../adminAuth";
import { isLikelyPlayableVideo } from "../videoLink";
import VideoEmbed from "./VideoEmbed";
import "./AdminVideoField.css";

/**
 * Videó megadása URL-lel vagy fájlfeltöltéssel (admin gyakorlat űrlap / tábla).
 */
export default function AdminVideoField({
    id,
    mod,
    onModChange,
    value,
    onChange,
    disabled = false,
    compact = false,
    onPendingFileChange,
}) {
    const inputRef = useRef(null);
    const [pendingFile, setPendingFile] = useState(null);
    const [feltoltes, setFeltoltes] = useState(false);
    const [hiba, setHiba] = useState("");

    const showPreview = isLikelyPlayableVideo(value);

    async function handleFeltoltes(fajl = pendingFile) {
        if (!fajl || disabled || feltoltes) return;
        setFeltoltes(true);
        setHiba("");
        try {
            const fd = new FormData();
            fd.append("video", fajl);
            const res = await adminAuthedFetch(apiUrl("/api/admin/videok/feltoltes"), {
                method: "POST",
                body: fd,
            });
            const adat = await res.json().catch(() => ({}));
            if (!res.ok) {
                setHiba(adat.message || "A feltöltés sikertelen.");
                return;
            }
            onChange(adat.filename || "");
            onModChange("file");
            setPendingFile(null);
            onPendingFileChange?.(null);
            if (inputRef.current) inputRef.current.value = "";
        } catch (err) {
            console.error(err);
            setHiba("Nem sikerült a kapcsolat a szerverrel.");
        } finally {
            setFeltoltes(false);
        }
    }

    function handleModValtas(ujMod) {
        if (disabled || ujMod === mod) return;
        onModChange(ujMod);
        setHiba("");
        setPendingFile(null);
        onPendingFileChange?.(null);
        if (inputRef.current) inputRef.current.value = "";
    }

    return (
        <div className={`admin-video-field ${compact ? "admin-video-field--compact" : ""}`}>
            <div className="admin-video-mod" role="tablist" aria-label="Videó megadás módja">
                <button
                    type="button"
                    role="tab"
                    aria-selected={mod === "url"}
                    className={`admin-video-mod-btn ${mod === "url" ? "aktiv" : ""}`}
                    onClick={() => handleModValtas("url")}
                    disabled={disabled}
                >
                    URL
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={mod === "file"}
                    className={`admin-video-mod-btn ${mod === "file" ? "aktiv" : ""}`}
                    onClick={() => handleModValtas("file")}
                    disabled={disabled}
                >
                    Fájl
                </button>
            </div>

            {mod === "url" ? (
                <input
                    id={id}
                    className="admin-input admin-video-input"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder="https://… vagy /video.mp4"
                />
            ) : (
                <div className="admin-video-feltoltes">
                    <input
                        ref={inputRef}
                        id={id}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/ogg,.mp4,.webm,.mov,.ogg"
                        className="admin-video-fajl-rejtett"
                        disabled={disabled || feltoltes}
                        onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            setPendingFile(f);
                            onPendingFileChange?.(f);
                            setHiba("");
                        }}
                    />
                    <label
                        htmlFor={id}
                        className={`admin-btn ghost admin-video-fajl-label ${disabled || feltoltes ? "szurke" : ""}`}
                    >
                        Fájl kiválasztása
                    </label>
                    <span className="admin-video-fajlnev" title={pendingFile?.name || value || ""}>
                        {pendingFile?.name || (value ? value : "Nincs kiválasztott fájl")}
                    </span>
                    <button
                        type="button"
                        className={`admin-btn primary admin-video-feltolt-btn ${!pendingFile || feltoltes ? "szurke" : ""}`}
                        disabled={!pendingFile || feltoltes || disabled}
                        onClick={() => void handleFeltoltes()}
                    >
                        {feltoltes ? <span className="admin-spinner" /> : null}
                        Feltöltés
                    </button>
                </div>
            )}

            {!compact && (
                <p className="admin-help admin-video-help">
                    {mod === "url"
                        ? "YouTube link, külső videó URL vagy a public mappában lévő fájl elérési útja."
                        : "A feltöltött videó fájlnévvel a public/ mappába kerül."}
                </p>
            )}

            {hiba && (
                <p className="admin-video-hiba" role="alert">
                    {hiba}
                </p>
            )}

            {showPreview && (
                <div className="admin-video-elonezet">
                    <VideoEmbed
                        videoLink={value}
                        className="admin-video-elonezet-elem"
                        title="Videó előnézet"
                    />
                </div>
            )}
        </div>
    );
}

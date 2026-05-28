import "./ExpertPortrait.css";

const KATI_PORTRAIT = "/Kati.jpeg";
const TOZSER_ANITA_PORTRAIT = "/tozseranita.svg";

export { KATI_PORTRAIT, TOZSER_ANITA_PORTRAIT };

export default function ExpertPortrait({ src, alt = "", size = "sm" }) {
    const sizeClass = size === "md" ? "expert-portrait--md" : "expert-portrait--sm";
    const isSvg = typeof src === "string" && src.endsWith(".svg");

    if (!src) {
        return (
            <div className={`expert-portrait ${sizeClass} expert-portrait--empty`} aria-hidden="true">
                <div className="expert-portrait-inner" />
            </div>
        );
    }

    return (
        <div className={`expert-portrait ${sizeClass}${isSvg ? " expert-portrait--svg" : ""}`}>
            <div className="expert-portrait-inner">
                <img src={src} alt={alt} />
            </div>
        </div>
    );
}

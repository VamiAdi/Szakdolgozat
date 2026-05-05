import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getUser, sessionFrissiteseHaKell } from "./auth";

/** Csak bejelentkezve engedi az al-útvonalat; egyébként → /belepes (state.from). */
export default function VedettUt({ children }) {
    const location = useLocation();
    const [status, setStatus] = useState("checking");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await sessionFrissiteseHaKell();
            if (cancelled) return;
            setStatus(getUser() ? "ok" : "redirect");
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    if (status === "checking") return null;
    if (status === "redirect") {
        return (
            <Navigate
                to="/belepes"
                replace
                state={{ from: location.pathname }}
            />
        );
    }
    return <>{children}</>;
}

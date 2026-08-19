import {createCookieSessionStorage, redirect} from "react-router";

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not defined in the environment variables.");
}


export const { getSession, commitSession, destroySession } = createCookieSessionStorage({
    cookie: {
        name: "__staff_session_v2",
        secrets: [SESSION_SECRET],
        httpOnly: true,
        sameSite: "none",
        secure: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30, 
    },
});

// Guard for staff-only loaders and actions. Throws a redirect (instead of
// returning it) so the caller stops right here when there is no valid session.
export const requireStaff = async (request: Request) => {
    const session = await getSession(request.headers.get("Cookie"));

    if (session.get("staff") !== true) {
        throw redirect("/staff/login");
    }
    return session;
};

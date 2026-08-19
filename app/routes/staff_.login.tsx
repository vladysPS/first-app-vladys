import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { getSession, commitSession} from "../staff-session.server";
import {redirect, useActionData, Form} from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import { useRef} from "react";

export const loader = async({request}:LoaderFunctionArgs)=>{
    const session = await getSession(request.headers.get("Cookie"));
    if (session.get("staff") === true) {
        return redirect("/staff");
    }
    return null;
}

export const action = async({request}:ActionFunctionArgs) => {
    const formData = await request.formData();
    const password = String(formData.get("password"));
    console.log("*** Message from the server")
    console.log("*** Password:", password)
    if (password === process.env.STAFF_PASSWORD) {
        const session = await getSession(request.headers.get("Cookie"));
        session.set("staff", true);
        const cookie = await commitSession(session);
        console.log("*** [login] password OK, returning redirect to /staff");
        console.log("*** [login] Set-Cookie:", cookie);
        return redirect("/staff", {
            headers: {
                "Set-Cookie": await commitSession(session),
            }, 
        });
    } else {
        return { ok: false, error: "Invalid password" };
    }
}

export default function StaffLogin() {
    const formRef = useRef<HTMLFormElement>(null);
    const actionData = useActionData<typeof action>();

    return (
        <AppProvider embedded={false}>
            <s-page heading="STAFF LOGIN">
                <Form ref={formRef} method="post">
                    <s-password-field
                        name="password"
                        label="Password"
                        placeholder="Enter your password"
                        minLength={8}
                    ></s-password-field>
                    <s-box paddingBlockStart="small-100">
                        <s-button variant="primary" type="submit">Login</s-button>
                    </s-box>
                </Form>
                {actionData && !actionData.ok && (
                    <s-box paddingBlockStart="small-100">
                        <s-banner tone="critical">{actionData.error}</s-banner>
                    </s-box>
                )}
            </s-page>
        </AppProvider>
    );
}
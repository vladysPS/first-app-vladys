import type { LoaderFunctionArgs, ActionFunctionArgs} from "react-router";
import { Resend } from 'resend';
import { useLoaderData, useFetcher } from "react-router";
import prisma from "../db.server";
import { requireStaff } from "../staff-session.server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useEffect, useState } from "react"

export const loader = async ({ request }: LoaderFunctionArgs) => {
    await requireStaff(request);

    const id = Number(new URL(request.url).searchParams.get("details"));
    if (!Number.isInteger(id) || id <= 0) {
        throw new Response("Ticket no válido", { status: 400 });
    }

    const ticketDetails = await prisma.clientTicket.findUnique({ where: { id } });
    if (!ticketDetails) {
        throw new Response("Ticket no encontrado", { status: 404 });
    }

    return { ticketDetails };
};

type BadgeTone = "success" | "caution" | "warning" | "critical";

const PRIORITY_TONE: Record<string, BadgeTone> = {
    Baja: "success",
    Media: "caution",
    Alta: "warning",
    Urgente: "critical",
};
const TICKET_STATE: Record<string, BadgeTone> = {
    enviado: "success",
    leido: "caution",
    procesando: "warning",
    resuelto: "critical",
};

export const action = async ({ request }: ActionFunctionArgs) => {
    await requireStaff(request);

    const id = Number(new URL(request.url).searchParams.get("details"));

    const ticketDetails = await prisma.clientTicket.findUnique({ where: { id } });
    if (!ticketDetails) {
        throw new Response("Ticket no encontrado", { status: 404 });
    }

    const shopEmail = ticketDetails.email;

    console.log("checking we have an email before sending,",shopEmail)


    const formData = await request.formData();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const responseSubject = String( formData.get("responseSubject") ?? "");
    const responseMessage = String( formData.get("responseMessage") ?? "");
    
    // para utilizar el email del cliente necesitariamos verificar el nuestro en resend
    const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'incidencias@pangoestudio.com',
        to: [shopEmail, 'vladyslavk@pangostudio.com'],
        subject: `${responseSubject}`,
        html: `<p>${responseMessage}</p>`,
    });

    if (emailError) {
        console.error("Resend failed to send the ticket email", emailError);
        return { ok: false as const };
    }

    console.log("Ticket email sent", emailData);
    return { ok: true as const };
    
}

export default function StaffDetails() {
    const { ticketDetails } = useLoaderData<typeof loader>();
    const fetcher = useFetcher<typeof action>();
    const [saved, setSaved] = useState(false);
    // cambiar la key vuelve a montar el formulario y lo deja vacío
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data?.ok) {
            setSaved(true);
            setFormKey((k) => k + 1);
            const t = setTimeout(() => setSaved(false), 3000);
            return () => clearTimeout(t);
        }
    }, [fetcher.state, fetcher.data]);

    const createdAt = new Date(ticketDetails.createdAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <AppProvider embedded={false}>
            <s-page >
                <s-section>
                    <s-box paddingBlock="none">
                        <s-stack direction="inline" justifyContent="space-between" alignItems="center" gap="base">
                            <s-heading>TIENDA: {ticketDetails.store}</s-heading>
                            <s-link href="/staff"><s-button>Volver al panel</s-button></s-link>
                        </s-stack>
                    </s-box>
                </s-section>
                <s-section>
                    <s-stack direction="block" gap="base">
                        <s-stack direction="inline" gap="base" alignItems="center">
                            <s-badge tone={PRIORITY_TONE[ticketDetails.priority] ?? "auto"}>
                                {ticketDetails.priority}
                            </s-badge>
                            <s-badge tone={TICKET_STATE[ticketDetails.state] ?? "auto"}>
                                {ticketDetails.state}
                            </s-badge>
                            <s-text color="subdued">Ticket #{ticketDetails.id}</s-text>
                        </s-stack>

                        <s-divider></s-divider>

                        <s-grid gridTemplateColumns="auto 1fr" gap="base">
                            <s-text type="strong">Dominio</s-text>
                            <s-link href={`https://${ticketDetails.storeDomain}`}>
                                {ticketDetails.storeDomain}
                            </s-link>

                            <s-text type="strong">Fecha</s-text>
                            <s-text>{createdAt}</s-text>

                            <s-text type="strong">Correo</s-text>
                            <s-text>{ticketDetails.email}</s-text>
                        </s-grid>
                    </s-stack>
                </s-section>

                <s-section>
                    <s-stack direction="block" justifyContent="start" gap="none">
                        <s-heading>ASUNTO:</s-heading>
                        <s-paragraph>{ticketDetails.subject}</s-paragraph>
                    </s-stack>
                    <s-stack direction="block" justifyContent="start" gap="none" paddingBlock="base large">
                        <s-heading>MENSAJE:</s-heading>
                        <s-paragraph>{ticketDetails.ticketDescription}</s-paragraph>
                    </s-stack>                    
                </s-section>


                <s-section heading="Responder">
                    <fetcher.Form method="post" key={formKey}>
                        <s-stack direction="block" gap="base">
                            {saved && (
                                <s-banner tone="success">Respuesta enviada</s-banner>
                            )}
                            <s-text-field
                                label="Asunto"
                                name="responseSubject"
                                defaultValue={`RE: ${ticketDetails.subject}`}
                                required
                            ></s-text-field>

                            <s-text-area
                                label="Mensaje"
                                name="responseMessage"
                                rows={6}
                                placeholder="Escribe tu respuesta..."
                                required
                            ></s-text-area>

                            <s-stack direction="inline" justifyContent="end">
                                <s-button
                                    type="submit"
                                    variant="primary"
                                    loading={fetcher.state !== "idle"}
                                >
                                    Enviar respuesta
                                </s-button>
                            </s-stack>
                        </s-stack>
                    </fetcher.Form>
                </s-section>

            </s-page>
        </AppProvider>
    );
}

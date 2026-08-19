import {useLoaderData, useFetcher} from "react-router";
import { useEffect, useState} from "react"
import type { ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import prisma from "../db.server";
import { requireStaff } from "../staff-session.server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

export const loader = async({request}:LoaderFunctionArgs)=>{
    await requireStaff(request);
    const allTickets = await prisma.clientTicket.findMany();
    return { tickets: allTickets };
}

export const action = async({request}:ActionFunctionArgs) => {
    await requireStaff(request);
    const formData = await request.formData();
    const ticketId = Number(formData.get("ticketId"));
    const state = String(formData.get("state"))
    console.log("*** Message from the server")
    console.log("*** Ticket id:", ticketId)
    console.log("*** State:", state)
    await prisma.clientTicket.update({ where: { id: ticketId }, data: { state } });
    return { ok: true }; 
}

export default function StaffPanel() {
    const {tickets} = useLoaderData<typeof loader>();
    const fetcher = useFetcher();

    const [saved, setSaved] = useState(false);

    useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
        setSaved(true);
        const t = setTimeout(() => setSaved(false), 3000);
        return () => clearTimeout(t);
    }
    }, [fetcher.state, fetcher.data]);

    const handleActionClick = (ticketId:string, newState:string)=>{
        console.log("*** checking the two data");
        console.log("*** ticketID:", ticketId);
        console.log("*** state:", newState);
        fetcher.submit(
            { ticketId: ticketId, state: newState },  
            { method: "post" }                                
        );
    }

    const PRIORITY_TONE = {
        Baja: "success",
        Media: "caution",
        Alta: "warning",
        Urgente: "critical",
    };
    const TICKET_STATE = {
        enviado: "success",
        leido: "caution",
        procesando: "warning",
        resuelto: "critical",
    };
    return (
        <AppProvider embedded={false}>
            <s-page heading="STAFF PANEL">
                <s-section padding="none">
                    {saved && (
                        <s-banner tone="success">
                            Estado actualizado
                        </s-banner>
                    )}
                <s-table>
                    <s-table-header-row>
                        <s-table-header listSlot="primary">Nombre de tienda</s-table-header>
                        <s-table-header listSlot="inline">Prioridad</s-table-header>
                        <s-table-header listSlot="labeled">Estado</s-table-header>
                        <s-table-header listSlot="labeled">Asunto</s-table-header>
                        <s-table-header listSlot="labeled">Fecha</s-table-header>
                    </s-table-header-row>
                
                    <s-table-body>
                        {tickets.length === 0 ? (          
                        <s-table-row>
                            <s-table-cell>Todavía no tienes tickets.</s-table-cell>
                        </s-table-row>) : (  
                            tickets.map((ticket)=>(
                                <s-table-row key={ticket.id}>
                                    <s-table-cell>{ticket.store}</s-table-cell>
                                    <s-table-cell>
                                        <s-badge tone={PRIORITY_TONE[ticket.priority] ?? "auto"}>{ticket.priority}</s-badge>
                                    </s-table-cell>
                                    <s-table-cell>
                                        <s-button commandFor={`menu-${ticket.id}`}>{ticket.state}</s-button>
                                            <s-menu id={`menu-${ticket.id}`} accessibilityLabel="Customer actions">
                                                {Object.keys(TICKET_STATE)
                                                .filter((s) => s !== ticket.state)
                                                .map((s) => (
                                                    <s-button key={s} onClick={() => handleActionClick(`${ticket.id}`,`${s}`)}>{s}</s-button>
                                                ))}
                                            </s-menu>
                                    </s-table-cell>
                                    <s-table-cell>{ticket.subject}</s-table-cell>
                                    <s-table-cell>{new Date(ticket.createdAt).toLocaleDateString("es-ES")}</s-table-cell>
                                </s-table-row>
                            ))        
                        )}
                    </s-table-body>
                </s-table>
                </s-section>
            </s-page>
        </AppProvider>
    )
} 


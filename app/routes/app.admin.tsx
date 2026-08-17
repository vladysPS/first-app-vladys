import {LoaderFunctionArgs, useLoaderData} from "react-router";
import prisma from "../db.server";
import {authenticate} from "../shopify.server";

export const loader = async({request}:LoaderFunctionArgs)=>{
    const { admin, session } = await authenticate.admin(request);

    const allTickets = await prisma.clientTicket.findMany();
    return { tickets: allTickets };
}

export default function AdminPanel() {
    const {tickets} = useLoaderData<typeof loader>();
    console.log("tickets data", tickets)

    const handleActionClick = (state:string)=>{
        console.log("clicked button with state", state)
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
        <s-page heading="ADMIN PANEL">
            <s-section padding="none">
                
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
                                    <s-button commandFor="customer-menu">{ticket.state}</s-button>
                                        <s-menu id="customer-menu" accessibilityLabel="Customer actions">
                                            {Object.keys(TICKET_STATE)
                                            .filter((s) => s !== ticket.state)
                                            .map((s) => (
                                                <s-button key={s} onClick={() => handleActionClick(`${s}`)}>{s}</s-button>
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
    )
}
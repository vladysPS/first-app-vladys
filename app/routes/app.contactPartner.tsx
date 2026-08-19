import { useEffect, useRef} from "react";
import { Resend } from 'resend';
import type { ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {useFetcher, useLoaderData} from "react-router";
import {authenticate} from "../shopify.server";
import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

import prisma from "../db.server";

type FormErrors = {
  store?: string;
  storeDomain?: string;
  priority?: string;
  subject?: string;
  ticketDescription?: string;
};

async function getShopName(admin: AdminApiContext) {
  const response = await admin.graphql(
    `#graphql
      query getShopName {
        shop {
          name
          email
        }
      }`,
  );
  const { data } = await response.json();

  return data.shop;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const tickets = await prisma.clientTicket.findMany({
    where: {
      storeDomain: `${session.shop}`,
    },
    orderBy: {
      createdAt: "desc",
    },
  });


  return {
    storeName: await getShopName(admin),
    storeDomain: session.shop,
    tickets: tickets,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session} = await authenticate.admin(request);
  const shopInfo = await getShopName(admin);
  const shopEmail = shopInfo.email; // need to validate email to be able to send with it 
  const shopName = shopInfo.name;

  const formData = await request.formData();
  const priority = String(formData.get("priority") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const ticketDescription = String(
    formData.get("ticketDescription") ?? "",
  ).trim();

  const errors: FormErrors = {};
  if (!priority) errors.priority = "Selecciona una prioridad";
  if (!subject) errors.subject = "El asunto es obligatorio";
  if (!ticketDescription) { 
    errors.ticketDescription = "La descripción es obligatoria";
  } else if (ticketDescription.length < 20){
    errors.ticketDescription = "Mínimo 20 carácteres"
  }

  if (Object.keys(errors).length > 0) {
    return {ok: false as const, errors};
  }

  
  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log("Sending email with Resend...", resend);

  (async function () {
  const { data, error } = await resend.emails.send({
      from: `${shopName} <onboarding@resend.dev>`,
      to: ['vladyslavk@pangostudio.com'],
      subject: `${priority} | ${subject}`,
      html: `<p>${ticketDescription}</p>`,
    });

    if (error) {
      return console.error({ error });
    }

    console.log({ data });
  })();

  const ticket = await prisma.clientTicket.create({
    data: { store :  shopName,
            storeDomain: session.shop,
            priority: priority,
            subject: subject,
            ticketDescription: ticketDescription,
            state: "enviado",
            createdAt: new Date()
          },
  });

  return { ok: true as const, ticketId: ticket.id };
};

export default function ContactPartner() {
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const shopify = useAppBridge();

  const STATE_TONE = {
    enviado: "info",
    leido: "caution",
    procesando: "warning",
    resuelto: "success",
  };

  const { tickets } = useLoaderData<typeof loader>();

  const isSending = fetcher.state !== "idle";
  const errors =
  fetcher.data && !fetcher.data.ok ? fetcher.data.errors : undefined;

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      shopify.toast.show("Ticket enviado");
      formRef.current?.reset();
    }
  }, [fetcher.state, fetcher.data, shopify]);

  return (
    <s-page heading="FORMULARIO DE CONTACTO">
      <s-section>
        <s-paragraph>RELLENA EL FORMULARIO PARA CONTACTAR CON NOSOTROS :)</s-paragraph>

        <fetcher.Form ref={formRef} method="post">
          <s-box paddingBlockStart="small-100">
            <s-select
              label="Prioridad"
              placeholder="Elige una opción"
              required
              name="priority"
              error={errors?.priority}
            >
              <s-option value="Baja">Baja</s-option>
              <s-option value="Media">Media</s-option>
              <s-option value="Alta">Alta</s-option>
              <s-option value="Urgente">Urgente</s-option>
            </s-select>
          </s-box>

          <s-box paddingBlockStart="small-100">
            <s-text-field
              label="Asunto"
              placeholder="Asunto"
              required
              name="subject"
              error={errors?.subject}
            />
          </s-box>

          <s-box paddingBlockStart="small-100">
            <s-text-area
              label="Descripción del problema"
              placeholder="Por favor explica de una manera detallada el problema"
              rows={3}
              name="ticketDescription"
              autocomplete="off"
              required
              error={errors?.ticketDescription}
            />
          </s-box>

          <s-box paddingBlockStart="base">
            <s-button type="submit">{isSending ? "Enviando..." : "Enviar"}</s-button>
          </s-box>
        </fetcher.Form>
      </s-section>
      <s-section>
        <s-paragraph>TICKETS EN CURSO</s-paragraph>

        {tickets.length === 0 ? (
          <s-box paddingBlockStart="small-100">
            <s-paragraph>Todavía no has enviado ningún ticket.</s-paragraph>
          </s-box>
        ) : (
          tickets.map((ticket) => (
            <s-box key={ticket.id} paddingBlockStart="base">
              <s-paragraph>
                <s-stack direction="inline" gap="base" paddingBlockEnd="small-100">
                  <s-badge size="base" tone={STATE_TONE[ticket.state] ?? "auto"}>ESTADO: {ticket.state}</s-badge> 
                </s-stack>
                <s-stack direction="inline" gap="base">
                  <s-badge tone="caution">Prioridad: {ticket.priority}</s-badge>
                  <s-badge size="base"> Asunto: {ticket.subject}</s-badge> 
                </s-stack>
              </s-paragraph>
              <s-box paddingBlock="small-100">
                <s-paragraph>{ticket.ticketDescription}</s-paragraph>
                <s-paragraph>
                  {new Date(ticket.createdAt).toLocaleDateString("es-ES")}
                </s-paragraph>
              </s-box>
              <s-divider></s-divider>
            </s-box>
            
          ))
        )}
      </s-section>
    </s-page>

    
  );
}

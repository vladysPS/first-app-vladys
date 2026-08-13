import { useEffect, useRef } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import {useFetcher} from "react-router";
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
        }
      }`,
  );
  const { data } = await response.json();

  return data.shop.name as string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  return {
    storeName: await getShopName(admin),
    storeDomain: session.shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session} = await authenticate.admin(request);

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

  
  console.log("*** entered in action ***")

  const ticket = await prisma.clientTicket.create({
    data: { store :  await getShopName(admin),
            storeDomain: session.shop,  
            priority: priority,
            subject: subject,
            ticketDescription: ticketDescription,
            createdAt: new Date()
          },
  }); 
   
  return { ok: true as const, ticketId: ticket.id };
};

export default function ContactPartner() {
  const fetcher = useFetcher<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const shopify = useAppBridge();
    
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
              <s-option value="1">Baja</s-option>
              <s-option value="2">Media</s-option>
              <s-option value="3">Alta</s-option>
              <s-option value="4">Urgente</s-option>
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
            {fetcher.data?.error && <p style={{ color: "red" }}>{fetcher.data.error}</p>}
          </s-box>
        </fetcher.Form>
      </s-section>
    </s-page>
  );
}

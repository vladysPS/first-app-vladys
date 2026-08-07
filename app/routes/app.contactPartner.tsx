import { useState } from "react";

type FormErrors = {
  priority?: string;
  subject?: string;
  ticketDescription?: string;
};

export default function ContactPartner() {
  const [priority, setPriority] = useState("");
  const [subject, setSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!priority) next.priority = "Selecciona una prioridad";
    if (!subject.trim()) next.subject = "El asunto es obligatorio";
    if (!ticketDescription.trim()) {
      next.ticketDescription = "La descripción es obligatoria";
    } else if (ticketDescription.trim().length < 20) {
      next.ticketDescription = "Mínimo 20 caracteres";
    }
    return next;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    console.log("Formulario enviado:", { priority, subject, ticketDescription });
  };

  return (
    <s-page heading="FORMULARIO DE CONTACTO">
      <s-section>
        <s-paragraph>RELLENA EL FORMULARIO PARA CONTACTAR CON NOSOTROS :)</s-paragraph>

        <form onSubmit={handleSubmit} noValidate>
          <s-select
            label="Prioridad"
            placeholder="Elige una opción"
            value={priority}
            required
            error={errors.priority}
            onChange={(e: any) => {
              setPriority(e.currentTarget.value);
              clearError("priority");
            }}
          >
            <s-option value="1">Baja</s-option>
            <s-option value="2">Media</s-option>
            <s-option value="3">Alta</s-option>
            <s-option value="4">Urgente</s-option>
          </s-select>

          <s-text-field
            label="Asunto"
            placeholder="Asunto"
            value={subject}
            required
            error={errors.subject}
            onInput={(e: any) => {
              setSubject(e.currentTarget.value);
              clearError("subject");
            }}
          />

          <s-text-area
            label="Descripción del problema"
            placeholder="Por favor explica de una manera detallada el problema"
            rows="3"
            autocomplete="off"
            value={ticketDescription}
            required
            error={errors.ticketDescription}
            onInput={(e: any) => {
              setTicketDescription(e.currentTarget.value);
              clearError("ticketDescription");
            }}
          />

          <s-button variant="primary" type="submit">Enviar</s-button>
        </form>
      </s-section>
    </s-page>
  );
}
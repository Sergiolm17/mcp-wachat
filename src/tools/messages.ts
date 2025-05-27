import { z } from "zod";
import fetch from "node-fetch"; // Necesitarás instalar node-fetch: npm install node-fetch
import type {
  ServerRequest,
  ServerNotification,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const WACHAT_API_BASE =
  process.env.WACHAT_API_BASE || "https://whatsapp.taptapp.xyz";
const WACHAT_API_TOKEN = process.env.WACHAT_API_TOKEN;
const sessionId = process.env.WACHAT_SESSION_ID;

// Esquema para MessageKey
export const MessageKeySchema = z.object({
  remoteJid: z.string().describe("El JID del chat (usuario o grupo)."),
  fromMe: z.boolean().describe("Indica si el mensaje fue enviado por el bot."),
  id: z.string().describe("El ID único del mensaje."),
  participant: z
    .string()
    .optional()
    .describe("El JID del participante que envió el mensaje (en grupos)."),
});

// Función auxiliar genérica para enviar solicitudes a la API de WaChat
async function sendApiRequest(
  payload: object,
  errorMessagePrefix: string
): Promise<CallToolResult> {
  if (!WACHAT_API_TOKEN || !sessionId) {
    const errorMessage =
      "Error de configuración del servidor: WACHAT_API_TOKEN o WACHAT_SESSION_ID no están definidos.";
    console.error(errorMessage);
    return {
      isError: true,
      content: [{ type: "text", text: errorMessage }],
      structuredContent: {
        success: false,
        error: errorMessage,
      },
    };
  }

  const endpoint = `${WACHAT_API_BASE}/messages/send/`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WACHAT_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = (await response.json()) as any;

    if (response.ok) {
      const messageData = responseData.content?.[0]?.text;
      // Asegurarse de que messageData.key exista y tenga la estructura esperada,
      // aunque MessageKeySchema lo validará en el output.
      const messageKey = messageData?.key
        ? {
            remoteJid: messageData.key.remoteJid,
            fromMe: messageData.key.fromMe,
            id: messageData.key.id,
            participant: messageData.key.participant,
          }
        : undefined;

      return {
        content: [],
        structuredContent: {
          success: messageData?.status === "PENDING",
          messageKey: messageKey, // Devolver el objeto key completo
        },
      };
    } else {
      const errorDetail =
        responseData.message ||
        `${errorMessagePrefix}: ${response.status} ${response.statusText}`;
      console.error(errorDetail);
      return {
        isError: true,
        content: [{ type: "text", text: errorDetail }],
        structuredContent: {
          success: false,
          error: errorDetail,
        },
      };
    }
  } catch (error: any) {
    const catchErrorDetail =
      error.message || "Error desconocido al contactar la API.";
    console.error("Error al conectar con la API de WaChat:", error);
    return {
      isError: true,
      content: [{ type: "text", text: catchErrorDetail }],
      structuredContent: {
        success: false,
        error: catchErrorDetail,
      },
    };
  }
}

export const sendMessageInputSchema = z.object({
  jid: z
    .string()
    .describe(
      "El ID del destinatario (número de teléfono o ID de grupo). Ejemplo: 521XXXXXXXXXX o un ID de grupo."
    ),
  messageText: z
    .string()
    .describe("El contenido del mensaje de texto a enviar."),
  isGroup: z
    .boolean()
    .describe("Indica si el JID corresponde a un grupo.")
    .default(false),
});

export const sendMessageOutputSchema = z.object({
  success: z.boolean(),
  messageKey: MessageKeySchema.optional(),
  error: z.string().optional(),
});

export async function executeSendMessage(
  input: z.infer<typeof sendMessageInputSchema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<CallToolResult> {
  const payload = {
    jid: input.jid,
    type: input.isGroup ? "group" : "number",
    message: {
      text: input.messageText,
    },
  };
  return sendApiRequest(payload, "Error al enviar mensaje");
}

export const sendLocationInputSchema = z.object({
  jid: z
    .string()
    .describe(
      "El ID del destinatario (número de teléfono o ID de grupo). Ejemplo: 521XXXXXXXXXX o un ID de grupo."
    ),
  latitude: z.number().describe("La latitud de la ubicación."),
  longitude: z.number().describe("La longitud de la ubicación."),
  isGroup: z
    .boolean()
    .describe("Indica si el JID corresponde a un grupo.")
    .default(false),
});

export const sendLocationOutputSchema = z.object({
  success: z.boolean(),
  messageKey: MessageKeySchema.optional(),
  error: z.string().optional(),
});

export async function executeSendLocation(
  input: z.infer<typeof sendLocationInputSchema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<CallToolResult> {
  const payload = {
    jid: input.jid,
    type: input.isGroup ? "group" : "number",
    message: {
      location: {
        degreesLatitude: input.latitude,
        degreesLongitude: input.longitude,
      },
    },
  };
  return sendApiRequest(payload, "Error al enviar ubicación");
}

export const sendImageInputSchema = z.object({
  jid: z
    .string()
    .describe(
      "El ID del destinatario (número de teléfono o ID de grupo). Ejemplo: 521XXXXXXXXXX o un ID de grupo."
    ),
  imageUrl: z.string().url().describe("La URL de la imagen a enviar."),
  caption: z
    .string()
    .optional()
    .describe("El texto opcional para acompañar la imagen."),
  isGroup: z
    .boolean()
    .describe("Indica si el JID corresponde a un grupo.")
    .default(false),
});

export const sendImageOutputSchema = z.object({
  success: z.boolean(),
  messageKey: MessageKeySchema.optional(),
  error: z.string().optional(),
});

export async function executeSendImage(
  input: z.infer<typeof sendImageInputSchema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<CallToolResult> {
  const payload = {
    jid: input.jid,
    type: input.isGroup ? "group" : "number",
    message: {
      image: { url: input.imageUrl },
      caption: input.caption,
    },
  };
  return sendApiRequest(payload, "Error al enviar imagen");
}

// Esquemas y función para enviar reacciones
export const sendReactionInputSchema = z.object({
  messageKey: MessageKeySchema.describe(
    "La clave del mensaje al que se va a reaccionar."
  ),
  reactionText: z
    .string()
    .emoji()
    .min(1)
    .describe("El emoji de la reacción (un solo carácter emoji)."),
  isGroup: z
    .boolean()
    .default(false)
    .describe(
      "Indica si el mensaje original está en un grupo. Esto determina el 'type' en la API."
    ),
});

export const sendReactionOutputSchema = z.object({
  success: z.boolean(),
  // La API de reacción podría no devolver un ID de mensaje para la propia reacción,
  // o podría ser diferente. Por ahora, nos centramos en el éxito.
  messageId: z
    .string()
    .optional()
    .describe("ID del mensaje de reacción, si la API lo proporciona."),
  error: z.string().optional(),
});

export async function executeSendReaction(
  input: z.infer<typeof sendReactionInputSchema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<CallToolResult> {
  const payload = {
    jid: input.messageKey.remoteJid, // El JID para enviar la reacción es el remoteJid del mensaje original
    type: input.isGroup ? "group" : "number",
    message: {
      react: {
        key: input.messageKey,
        text: input.reactionText,
      },
    },
  };
  // El prefijo del mensaje de error es genérico ya que la reacción en sí misma es el "mensaje"
  return sendApiRequest(payload, "Error al enviar reacción");
}

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

// Definición de los esquemas con Zod
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
  messageId: z.string().optional(),
  error: z.string().optional(),
});

// Lógica de ejecución de la herramienta
export async function executeSendMessage(
  input: z.infer<typeof sendMessageInputSchema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<CallToolResult> {
  const genericErrorMessage = "Error al procesar la solicitud sendMessage.";

  if (!WACHAT_API_TOKEN || !sessionId) {
    const errorMessage =
      "Error de configuración del servidor: WACHAT_API_TOKEN o WACHAT_SESSION_ID no están definidos.";
    console.error(errorMessage);
    return {
      isError: true,
      content: [{ type: "text", text: errorMessage }],
      structuredContent: {
        // Coherente con outputSchema para errores
        success: false,
        error: errorMessage,
      },
    };
  }

  const endpoint = `${WACHAT_API_BASE}/sessions/${sessionId}/messages/send`;
  const payload = {
    jid: input.jid,
    type: input.isGroup ? "group" : "number",
    message: {
      text: input.messageText,
    },
  };

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
    console.log(responseData);
    if (response.ok) {
      return {
        content: [], // Obligatorio, puede estar vacío si structuredContent está presente
        structuredContent: {
          success: true,
          messageId: responseData.id || "Unknown",
        },
      };
    } else {
      const errorDetail =
        responseData.message ||
        `Error al enviar mensaje: ${response.status} ${response.statusText}`;
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

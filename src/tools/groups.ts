import { z } from "zod";
import fetch from "node-fetch";
import type {
  ServerRequest,
  ServerNotification,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

const WACHAT_API_BASE =
  process.env.WACHAT_API_BASE || "https://whatsapp.taptapp.xyz";
const WACHAT_API_TOKEN = process.env.WACHAT_API_TOKEN;
const sessionId = process.env.WACHAT_SESSION_ID; // Usado para validación de configuración

// Esquema Zod para un participante del grupo
const GroupParticipantSchema = z.object({
  id: z.string().describe("JID del participante."),
  admin: z
    .enum(["admin", "superadmin"])
    .nullable()
    .describe("Rol del participante en el grupo."),
});

// Esquema Zod para un grupo
export const GroupSchema = z.object({
  id: z.string().describe("JID del grupo."),
  subject: z.string().describe("Nombre del grupo."),
  owner: z.string().optional().describe("JID del propietario del grupo."),
  creation: z.number().optional().describe("Timestamp de creación del grupo."),
  desc: z.string().optional().describe("Descripción del grupo."),
  participants: z
    .array(GroupParticipantSchema)
    .describe("Lista de participantes del grupo."),
});

export const searchGroupsInputSchema = z.object({
  name: z
    .string()
    .optional()
    .describe(
      "Nombre (o parte del nombre) del grupo a buscar. Si se omite, se devuelven todos los grupos."
    ),
});

export const searchGroupsOutputSchema = z.object({
  success: z.boolean(),
  groups: z
    .array(GroupSchema)
    .optional()
    .describe("Lista de grupos encontrados."),
  error: z.string().optional(),
});

/**
 * Busca grupos por nombre utilizando la API de WaChat.
 */
export async function executeSearchGroups(
  input: z.infer<typeof searchGroupsInputSchema>,
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
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

  // Asumimos que el endpoint /groups/search está disponible en WACHAT_API_BASE
  // y que la autenticación se maneja mediante el token Bearer.
  let url = `${WACHAT_API_BASE}/groups/search`;
  if (input.name && input.name.trim() !== "") {
    const queryParams = new URLSearchParams({ name: input.name.trim() });
    url = `${url}?${queryParams.toString()}`;
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WACHAT_API_TOKEN}`,
      },
    });

    // La API de Baileys podría devolver directamente un array de grupos o un objeto con una propiedad `data`.
    // Ajustar según la respuesta real de tu API específica.
    // Por ahora, asumimos que la respuesta es un objeto como { data: Group[] } o directamente Group[].
    const responseData = (await response.json()) as any;

    if (response.ok) {
      // Intenta parsear los grupos con el esquema Zod para validación.
      // Asumimos que responseData.data contiene el array de grupos, o responseData si es directamente el array.
      const groupsArray = responseData.data || responseData;
      const parsedGroups = z.array(GroupSchema).safeParse(groupsArray);

      if (parsedGroups.success) {
        return {
          content: [], // Puede estar vacío si structuredContent está presente
          structuredContent: {
            success: true,
            groups: parsedGroups.data,
          },
        };
      } else {
        const validationError =
          "Error de validación de la respuesta de la API de grupos.";
        console.error(validationError, parsedGroups.error);
        return {
          isError: true,
          content: [{ type: "text", text: validationError }],
          structuredContent: {
            success: false,
            error: validationError,
          },
        };
      }
    } else {
      const errorDetail =
        responseData.message || // Intenta obtener un mensaje de error de la respuesta
        `Error al buscar grupos: ${response.status} ${response.statusText}`;
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
      error.message ||
      "Error desconocido al contactar la API de búsqueda de grupos.";
    console.error("Error en executeSearchGroups:", error);
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

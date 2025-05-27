import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  sendMessageInputSchema,
  sendMessageOutputSchema,
  executeSendMessage,
  sendLocationInputSchema,
  sendLocationOutputSchema,
  executeSendLocation,
  sendImageInputSchema,
  sendImageOutputSchema,
  executeSendImage,
  sendReactionInputSchema,
  sendReactionOutputSchema,
  executeSendReaction,
  MessageKeySchema,
} from "./tools/messages.js";
import {
  GroupSchema,
  searchGroupsInputSchema,
  searchGroupsOutputSchema,
  executeSearchGroups,
} from "./tools/groups.js";

// Las variables de entorno se leen una vez aquí, no es necesario leerlas en messages.ts también
// a menos que messages.ts se use de forma independiente, lo cual no parece ser el caso.
// const WACHAT_API_BASE = process.env.WACHAT_API_BASE || "https://whatsapp.taptapp.xyz";
// const WACHAT_API_TOKEN = process.env.WACHAT_API_TOKEN;
// const sessionId = process.env.WACHAT_SESSION_ID;

async function main() {
  const server = new McpServer({
    name: "mcp-wachat",
    version: "1.0.0",
    // capabilities.tools se llenará dinámicamente con server.tool()
    // capabilities.resources sigue vacío si no tienes recursos definidos.
    capabilities: {
      resources: {},
      tools: {},
    },
    logging: {
      level: "info",
      data: "Server started successfully",
    },
  });

  // Definir la herramienta usando server.registerTool()
  server.registerTool(
    "sendMessage", // Nombre de la herramienta
    {
      // Objeto de configuración de la herramienta
      description:
        "Envía un mensaje de texto a un contacto o grupo de WhatsApp.",
      inputSchema: sendMessageInputSchema.shape,
      outputSchema: sendMessageOutputSchema.shape,
      // annotations: {} // Opcional, si necesitas añadir anotaciones específicas de la herramienta
    },
    executeSendMessage // La función de lógica de la herramienta
  );

  // Registrar la herramienta para enviar ubicaciones
  server.registerTool(
    "sendLocation", // Nombre de la herramienta
    {
      description:
        "Envía un mensaje de ubicación a un contacto o grupo de WhatsApp.",
      inputSchema: sendLocationInputSchema.shape,
      outputSchema: sendLocationOutputSchema.shape,
    },
    executeSendLocation // La función de lógica de la herramienta
  );

  // Registrar la herramienta para enviar imágenes
  server.registerTool(
    "sendImage",
    {
      description:
        "Envía un mensaje de imagen a un contacto o grupo de WhatsApp.",
      inputSchema: sendImageInputSchema.shape,
      outputSchema: sendImageOutputSchema.shape,
    },
    executeSendImage
  );

  // Registrar la herramienta para enviar reacciones
  server.registerTool(
    "sendReaction",
    {
      description: "Envía una reacción a un mensaje específico de WhatsApp.",
      inputSchema: sendReactionInputSchema.shape,
      outputSchema: sendReactionOutputSchema.shape,
    },
    executeSendReaction
  );

  // Registrar la herramienta para buscar grupos
  server.registerTool(
    "searchGroups",
    {
      description: "Busca grupos de WhatsApp por nombre.",
      inputSchema: searchGroupsInputSchema.shape,
      outputSchema: searchGroupsOutputSchema.shape,
    },
    executeSearchGroups
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.exit(1);
});

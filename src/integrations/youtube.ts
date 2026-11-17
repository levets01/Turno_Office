/**
 * Contrato para guardar y publicar vídeos mediante un futuro backend.
 * Estos métodos no están implementados: OAuth, tokens y subidas deberán ejecutarse en el servidor.
 * El borrador local actual se guarda en demo.ts y se descarga desde AgentPanel.tsx.
 */
export interface PublishingBackend {
  saveDraft(input: { episodeId: string; title: string; description: string }): Promise<{ draftId: string }>;
  publish(input: { draftId: string; videoUrl: string }): Promise<{ videoId: string }>;
}

// Mensaje compartido por la ficha de Publicación y el JSON descargable.
export const youtubeConnection = {
  connected: false,
  provider: 'YouTube',
  message: 'YouTube pendiente de conexión · borrador local',
} as const;

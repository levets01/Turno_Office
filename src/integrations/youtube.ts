/** YouTube OAuth, credentials and uploads must live in a backend. */
export interface PublishingBackend {
  saveDraft(input: { episodeId: string; title: string; description: string }): Promise<{ draftId: string }>;
  publish(input: { draftId: string; videoUrl: string }): Promise<{ videoId: string }>;
}

export const youtubeConnection = {
  connected: false,
  provider: 'YouTube',
  message: 'YouTube pendiente de conexión · borrador local',
} as const;

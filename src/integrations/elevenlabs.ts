/** Implement this interface in a backend. Never place ElevenLabs keys in Vite env variables. */
export interface VoiceBackend {
  synthesize(input: { episodeId: string; text: string }): Promise<{ audioUrl: string }>;
}

export const voiceConnection = {
  connected: false,
  provider: 'ElevenLabs',
  message: 'ElevenLabs pendiente de conexión',
} as const;

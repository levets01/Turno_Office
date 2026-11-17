/**
 * Contrato para una futura integración: recibe el guion y devuelve la URL del audio.
 * La interfaz solo define tipos; hoy no hay implementación ni petición a ElevenLabs.
 * La síntesis y las claves se gestionarán desde un backend, nunca con variables VITE_*.
 */
export interface VoiceBackend {
  synthesize(input: { episodeId: string; text: string }): Promise<{ audioUrl: string }>;
}

// Estado que muestra el panel de Voz mientras el servicio sigue pendiente de conexión.
export const voiceConnection = {
  connected: false,
  provider: 'ElevenLabs',
  message: 'ElevenLabs pendiente de conexión',
} as const;

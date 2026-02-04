/**
 * Voice Service - API client for voice call management
 */
import api, { get, post } from './api';

// Types
export interface VoiceCall {
  id: string;
  call_sid: string | null;
  status: VoiceCallStatus;
  direction: 'inbound' | 'outbound';
  from_phone: string;
  to_phone: string;
  incident_id: string | null;
  user_id: string | null;
  duration: number;
  recording_url: string | null;
  transcription: string | null;
  dtmf_digits: string | null;
  speech_result: string | null;
  last_action: string | null;
  ai_intent: string | null;
  ai_confidence: number | null;
  retry_count: number;
  max_retries: number;
  escalation_level: number;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceCallLog {
  id: string;
  voice_call_id: string;
  event_type: string;
  timestamp: string;
  description: string | null;
  event_data: Record<string, any>;
}

export type VoiceCallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'busy'
  | 'failed'
  | 'no-answer'
  | 'canceled';

export interface InitiateCallRequest {
  phone_number?: string;
  user_id?: string;
}

export interface InitiateCallResponse {
  success: boolean;
  voice_call_id: string;
  call_sid: string;
  message: string;
}

export interface VoiceCallStats {
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  average_duration: number;
  calls_by_status: Record<VoiceCallStatus, number>;
  calls_today: number;
  calls_this_week: number;
}

export interface VoiceChatRequest {
  text: string;
  history: Array<{ role: string; content: string }>;
}

export interface VoiceChatResponse {
  text: string;
}

// Voice Service
export const voiceService = {
  /**
   * List voice calls with optional filters
   */
  async listCalls(params?: {
    incident_id?: string;
    status?: VoiceCallStatus;
    skip?: number;
    limit?: number;
  }): Promise<VoiceCall[]> {
    const response = await get<VoiceCall[]>('/voice/calls', params);
    return response;
  },

  /**
   * Get a specific voice call by ID
   */
  async getCall(callId: string): Promise<VoiceCall> {
    const response = await get<VoiceCall>(`/voice/calls/${callId}`);
    return response;
  },

  /**
   * Get logs for a voice call
   */
  async getCallLogs(callId: string): Promise<VoiceCallLog[]> {
    const response = await get<VoiceCallLog[]>(`/voice/calls/${callId}/logs`);
    return response;
  },

  /**
   * Initiate a voice call for an incident
   */
  async initiateCall(
    incidentId: string,
    request?: InitiateCallRequest
  ): Promise<InitiateCallResponse> {
    const response = await post<InitiateCallResponse>(
      `/voice/initiate/${incidentId}`,
      request || {}
    );
    return response;
  },

  /**
   * Retry a failed call
   */
  async retryCall(callId: string): Promise<InitiateCallResponse> {
    const response = await post<InitiateCallResponse>(`/voice/calls/${callId}/retry`);
    return response;
  },

  /**
   * Escalate a call to the next on-call user
   */
  async escalateCall(callId: string): Promise<InitiateCallResponse> {
    const response = await post<InitiateCallResponse>(`/voice/calls/${callId}/escalate`);
    return response;
  },

  /**
   * Get voice calls for a specific incident
   */
  async getCallsForIncident(incidentId: string): Promise<VoiceCall[]> {
    const response = await get<VoiceCall[]>('/voice/calls', { incident_id: incidentId });
    return response;
  },

  /**
   * Send a message to the voice chat assistant
   */
  async chat(request: VoiceChatRequest): Promise<VoiceChatResponse> {
    const response = await post<VoiceChatResponse>('/voice/chat', request);
    return response;
  },

  /**
   * Get TTS audio URL
   */
  getTtsUrl(text: string, voice?: string): string {
    const params = new URLSearchParams({ text });
    if (voice) params.append('voice', voice);
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/voice/tts?${params.toString()}`;
  },

  /**
   * Calculate call statistics from a list of calls
   */
  calculateStats(calls: VoiceCall[]): VoiceCallStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const stats: VoiceCallStats = {
      total_calls: calls.length,
      completed_calls: 0,
      failed_calls: 0,
      average_duration: 0,
      calls_by_status: {} as Record<VoiceCallStatus, number>,
      calls_today: 0,
      calls_this_week: 0,
    };

    let totalDuration = 0;

    calls.forEach((call) => {
      // Count by status
      const status = call.status as VoiceCallStatus;
      stats.calls_by_status[status] = (stats.calls_by_status[status] || 0) + 1;

      // Count completed and failed
      if (call.status === 'completed') {
        stats.completed_calls++;
        totalDuration += call.duration || 0;
      } else if (['failed', 'busy', 'no-answer', 'canceled'].includes(call.status)) {
        stats.failed_calls++;
      }

      // Count by time period
      const callDate = new Date(call.created_at);
      if (callDate >= todayStart) {
        stats.calls_today++;
      }
      if (callDate >= weekStart) {
        stats.calls_this_week++;
      }
    });

    // Calculate average duration
    if (stats.completed_calls > 0) {
      stats.average_duration = Math.round(totalDuration / stats.completed_calls);
    }

    return stats;
  },

  /**
   * Format duration in seconds to human-readable string
   */
  formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },

  /**
   * Get status color for display
   */
  getStatusColor(status: VoiceCallStatus): string {
    switch (status) {
      case 'queued':
        return 'gray';
      case 'ringing':
        return 'blue';
      case 'in-progress':
        return 'green';
      case 'completed':
        return 'green';
      case 'busy':
        return 'yellow';
      case 'failed':
        return 'red';
      case 'no-answer':
        return 'orange';
      case 'canceled':
        return 'gray';
      default:
        return 'gray';
    }
  },

  /**
   * Get status display text
   */
  getStatusText(status: VoiceCallStatus): string {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'ringing':
        return 'Ringing';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'busy':
        return 'Busy';
      case 'failed':
        return 'Failed';
      case 'no-answer':
        return 'No Answer';
      case 'canceled':
        return 'Canceled';
      default:
        return status;
    }
  },

  /**
   * Get event type display text
   */
  getEventTypeText(eventType: string): string {
    const eventTypes: Record<string, string> = {
      initiated: 'Call Initiated',
      ringing: 'Phone Ringing',
      answered: 'Call Answered',
      dtmf_received: 'Keypad Input',
      speech_received: 'Voice Input',
      recording_started: 'Recording Started',
      recording_completed: 'Recording Completed',
      transcription_completed: 'Transcription Ready',
      call_completed: 'Call Ended',
      call_failed: 'Call Failed',
      escalated: 'Escalated',
      action_executed: 'Action Executed',
    };
    return eventTypes[eventType] || eventType;
  },
};

export default voiceService;

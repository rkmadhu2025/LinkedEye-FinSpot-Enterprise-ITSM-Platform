import api from './api';

export interface ChatOpsChannelData {
  id: string;
  platform: 'slack' | 'teams' | 'discord' | 'webhook';
  channel_id: string;
  channel_name: string;
  workspace_name?: string;
  webhook_url?: string;
  linked_service_ids: string[];
  linked_escalation_policy_id?: string;
  auto_create_incidents: boolean;
  auto_post_updates: boolean;
  notification_types: string[];
  is_connected: boolean;
  last_message_at?: string;
  message_count_24h: number;
  created_at: string;
}

export interface ChatOpsMessageData {
  id: string;
  channel_id: string;
  direction: 'inbound' | 'outbound';
  content?: string;
  sender_name?: string;
  incident_id?: string;
  command_name?: string;
  command_response?: string;
  processed_at?: string;
  created_at: string;
}

export interface ChatOpsCommandData {
  id: string;
  name: string;
  description?: string;
  usage_example?: string;
  platform_support: string[];
  is_enabled: boolean;
}

class ChatOpsService {
  async getChannels(skip = 0, limit = 50) {
    return api.get<ChatOpsChannelData[]>(`/chatops/channels?skip=${skip}&limit=${limit}`);
  }

  async getChannel(id: string) {
    return api.get<ChatOpsChannelData>(`/chatops/channels/${id}`);
  }

  async createChannel(data: Partial<ChatOpsChannelData>) {
    return api.post<ChatOpsChannelData>('/chatops/channels', data);
  }

  async updateChannel(id: string, data: Partial<ChatOpsChannelData>) {
    return api.put<ChatOpsChannelData>(`/chatops/channels/${id}`, data);
  }

  async deleteChannel(id: string) {
    return api.del(`/chatops/channels/${id}`);
  }

  async testChannel(id: string) {
    return api.post(`/chatops/channels/${id}/test`, {});
  }

  async sendMessage(channelId: string, content: string, incidentId?: string) {
    return api.post('/chatops/send', { channel_id: channelId, content, incident_id: incidentId });
  }

  async getMessages(skip = 0, limit = 50, filters?: { channel_id?: string; direction?: string; incident_id?: string }) {
    const params = new URLSearchParams();
    params.set('skip', String(skip));
    params.set('limit', String(limit));
    if (filters?.channel_id) params.set('channel_id', filters.channel_id);
    if (filters?.direction) params.set('direction', filters.direction);
    if (filters?.incident_id) params.set('incident_id', filters.incident_id);
    return api.get<ChatOpsMessageData[]>(`/chatops/messages?${params}`);
  }

  async getCommands() {
    return api.get<ChatOpsCommandData[]>('/chatops/commands');
  }

  async createCommand(data: Partial<ChatOpsCommandData>) {
    return api.post<ChatOpsCommandData>('/chatops/commands', data);
  }

  async getStats() {
    return api.get(`/chatops/stats/summary`);
  }
}

export const chatOpsService = new ChatOpsService();

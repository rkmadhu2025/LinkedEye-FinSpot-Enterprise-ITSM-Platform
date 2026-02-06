/**
 * SMS & Voice Service
 * Handles API calls for Twilio SMS and Voice functionality
 */

import api from './api';

const BASE_URL = '/sms';

export interface SendSMSRequest {
  to: string;
  message: string;
}

export interface SendBulkSMSRequest {
  recipients: string[];
  message: string;
}

export interface MakeCallRequest {
  to: string;
  message: string;
}

export interface IncidentAlertRequest {
  to: string;
  incident_number: string;
  incident_title: string;
  severity: string;
  hostname?: string;
}

export interface OnCallEscalationRequest {
  to: string;
  engineer_name: string;
  incident_number: string;
  incident_title: string;
  severity: string;
  call_if_critical?: boolean;
}

export interface SMSResponse {
  success: boolean;
  message_sid?: string;
  status?: string;
  error?: string;
}

export interface VoiceCallResponse {
  success: boolean;
  call_sid?: string;
  status?: string;
  error?: string;
}

export interface ConnectivityResponse {
  connected: boolean;
  account_sid?: string;
  account_name?: string;
  account_status?: string;
  from_number?: string;
  error?: string;
}

export interface BulkSMSResponse {
  total: number;
  successful: number;
  failed: number;
  results: Record<string, {
    success: boolean;
    message_sid?: string;
    error?: string;
  }>;
}

export const smsService = {
  /**
   * Send an SMS message
   */
  async sendSMS(data: SendSMSRequest): Promise<SMSResponse> {
    const response = await api.post<SMSResponse>(`${BASE_URL}/send`, data);
    return response.data;
  },

  /**
   * Send bulk SMS to multiple recipients
   */
  async sendBulkSMS(data: SendBulkSMSRequest): Promise<BulkSMSResponse> {
    const response = await api.post<BulkSMSResponse>(`${BASE_URL}/send-bulk`, data);
    return response.data;
  },

  /**
   * Make a voice call with TTS message
   */
  async makeCall(data: MakeCallRequest): Promise<VoiceCallResponse> {
    const response = await api.post<VoiceCallResponse>(`${BASE_URL}/call`, data);
    return response.data;
  },

  /**
   * Send incident alert SMS
   */
  async sendIncidentAlert(data: IncidentAlertRequest): Promise<SMSResponse> {
    const response = await api.post<SMSResponse>(`${BASE_URL}/incident-alert`, data);
    return response.data;
  },

  /**
   * Trigger on-call escalation (SMS + optional call)
   */
  async triggerOnCallEscalation(data: OnCallEscalationRequest): Promise<{
    sms_result: SMSResponse;
    call_result?: VoiceCallResponse;
  }> {
    const response = await api.post(`${BASE_URL}/on-call-escalation`, data);
    return response.data;
  },

  /**
   * Check Twilio connectivity
   */
  async checkConnectivity(): Promise<ConnectivityResponse> {
    const response = await api.get<ConnectivityResponse>(`${BASE_URL}/connectivity`);
    return response.data;
  },

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(data: { to: string; message: string; media_url?: string }): Promise<SMSResponse> {
    const response = await api.post<SMSResponse>(`${BASE_URL}/whatsapp/send`, data);
    return response.data;
  },

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkWhatsApp(data: { recipients: string[]; message: string; media_url?: string }): Promise<BulkSMSResponse> {
    const response = await api.post<BulkSMSResponse>(`${BASE_URL}/whatsapp/send-bulk`, data);
    return response.data;
  },
};

export default smsService;

import api from './api';
import {
  EscalationPolicy,
  EscalationPolicyCreate,
  EscalationPolicyUpdate,
  EscalationLevel,
  EscalationLevelCreate,
  OnCallSchedule,
  OnCallScheduleCreate,
  OnCallScheduleUpdate,
  OnCallScheduleMember,
  OnCallScheduleMemberCreate,
  OnCallShift,
  OnCallShiftCreate,
  OnCallOverride,
  OnCallOverrideCreate,
  OnCallOverrideUpdate,
  OnCallIncident,
  OnCallHandoffNote,
  OnCallHandoffNoteCreate,
  OnCallAnalytics,
  CurrentOnCallUser,
  OnCallCalendarEvent,
  ScheduleGenerationResult,
  EscalationResult,
  OnCallDashboardStats,
  OnCallScheduleFilters,
  OnCallShiftFilters,
  OnCallOverrideFilters,
  PaginatedResponse,
} from '@/types';

// =========================================================
// Simple On-Call Schedule types (matches backend DB schema)
// =========================================================

export interface OnCallScheduleEntry {
  id: string;
  organization_id?: string | null;
  group_id?: string | null;
  user_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_primary?: boolean | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnCallScheduleEntryCreate {
  user_id: string;
  group_id?: string;
  start_time: string;
  end_time: string;
  is_primary?: boolean;
  notes?: string;
}

export interface OnCallScheduleEntryUpdate {
  user_id?: string | null;
  group_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_primary?: boolean | null;
  notes?: string | null;
}

export interface CurrentOnCallEntry {
  id: string;
  schedule_id?: string | null;
  schedule_name?: string | null;
  user_id: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
  } | null;
  start_time?: string | null;
  end_time?: string | null;
}

export const onCallService = {
  // ==========================================
  // Escalation Policies
  // ==========================================

  async getEscalationPolicies(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<PaginatedResponse<EscalationPolicy>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = { skip, limit };
    if (search) params.search = search;

    const response = await api.get<EscalationPolicy[]>('/on-call/escalation-policies', { params });

    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(response.headers['x-total-pages'] || '1', 10);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total: total || response.data.length,
        totalPages: totalPages || Math.ceil((total || response.data.length) / limit),
      },
    };
  },

  async getEscalationPolicyById(id: string): Promise<EscalationPolicy> {
    const response = await api.get<EscalationPolicy>(`/on-call/escalation-policies/${id}`);
    return response.data;
  },

  async createEscalationPolicy(data: EscalationPolicyCreate): Promise<EscalationPolicy> {
    const response = await api.post<EscalationPolicy>('/on-call/escalation-policies', data);
    return response.data;
  },

  async updateEscalationPolicy(id: string, data: EscalationPolicyUpdate): Promise<EscalationPolicy> {
    const response = await api.put<EscalationPolicy>(`/on-call/escalation-policies/${id}`, data);
    return response.data;
  },

  async deleteEscalationPolicy(id: string): Promise<void> {
    await api.delete(`/on-call/escalation-policies/${id}`);
  },

  // Escalation Levels
  async addEscalationLevel(policyId: string, data: EscalationLevelCreate): Promise<EscalationLevel> {
    const response = await api.post<EscalationLevel>(
      `/on-call/escalation-policies/${policyId}/levels`,
      data
    );
    return response.data;
  },

  async updateEscalationLevel(
    policyId: string,
    levelId: string,
    data: Partial<EscalationLevelCreate>
  ): Promise<EscalationLevel> {
    const response = await api.put<EscalationLevel>(
      `/on-call/escalation-policies/${policyId}/levels/${levelId}`,
      data
    );
    return response.data;
  },

  async deleteEscalationLevel(policyId: string, levelId: string): Promise<void> {
    await api.delete(`/on-call/escalation-policies/${policyId}/levels/${levelId}`);
  },

  // ==========================================
  // On-Call Schedules
  // ==========================================

  async getSchedules(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<OnCallScheduleEntry>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number> = { skip, limit };

    const response = await api.get<OnCallScheduleEntry[]>('/on-call/schedules', { params });

    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(response.headers['x-total-pages'] || '1', 10);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total: total || response.data.length,
        totalPages: totalPages || Math.ceil((total || response.data.length) / limit),
      },
    };
  },

  async getScheduleById(id: string): Promise<OnCallScheduleEntry> {
    const response = await api.get<OnCallScheduleEntry>(`/on-call/schedules/${id}`);
    return response.data;
  },

  async createSchedule(data: OnCallScheduleEntryCreate): Promise<OnCallScheduleEntry> {
    const response = await api.post<OnCallScheduleEntry>('/on-call/schedules', data);
    return response.data;
  },

  async updateSchedule(id: string, data: OnCallScheduleEntryUpdate): Promise<OnCallScheduleEntry> {
    const response = await api.put<OnCallScheduleEntry>(`/on-call/schedules/${id}`, data);
    return response.data;
  },

  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/on-call/schedules/${id}`);
  },

  // Schedule Members
  async addScheduleMember(scheduleId: string, data: OnCallScheduleMemberCreate): Promise<OnCallScheduleMember> {
    const response = await api.post<OnCallScheduleMember>(
      `/on-call/schedules/${scheduleId}/members`,
      data
    );
    return response.data;
  },

  async updateScheduleMember(
    scheduleId: string,
    memberId: string,
    data: Partial<OnCallScheduleMemberCreate>
  ): Promise<OnCallScheduleMember> {
    const response = await api.put<OnCallScheduleMember>(
      `/on-call/schedules/${scheduleId}/members/${memberId}`,
      data
    );
    return response.data;
  },

  async removeScheduleMember(scheduleId: string, memberId: string): Promise<void> {
    await api.delete(`/on-call/schedules/${scheduleId}/members/${memberId}`);
  },

  // Shift Generation
  async generateShifts(
    scheduleId: string,
    startDate: string,
    endDate: string,
    overwrite: boolean = false
  ): Promise<ScheduleGenerationResult> {
    const response = await api.post<ScheduleGenerationResult>(
      `/on-call/schedules/${scheduleId}/generate-shifts`,
      { start_date: startDate, end_date: endDate, overwrite }
    );
    return response.data;
  },

  // Schedule Calendar
  async getScheduleCalendar(
    scheduleId: string,
    startDate: string,
    endDate: string
  ): Promise<OnCallCalendarEvent[]> {
    const response = await api.get<OnCallCalendarEvent[]>(
      `/on-call/schedules/${scheduleId}/calendar`,
      { params: { start_date: startDate, end_date: endDate } }
    );
    return response.data;
  },

  // ==========================================
  // On-Call Shifts
  // ==========================================

  async getShifts(
    page: number = 1,
    limit: number = 50,
    filters?: OnCallShiftFilters
  ): Promise<PaginatedResponse<OnCallShift>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = { skip, limit };

    if (filters) {
      if (filters.schedule_id) params.schedule_id = filters.schedule_id;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters.shift_type) params.shift_type = filters.shift_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
    }

    const response = await api.get<OnCallShift[]>('/on-call/shifts', { params });

    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(response.headers['x-total-pages'] || '1', 10);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total: total || response.data.length,
        totalPages: totalPages || Math.ceil((total || response.data.length) / limit),
      },
    };
  },

  async createShift(data: OnCallShiftCreate): Promise<OnCallShift> {
    const response = await api.post<OnCallShift>('/on-call/shifts', data);
    return response.data;
  },

  async deleteShift(id: string): Promise<void> {
    await api.delete(`/on-call/shifts/${id}`);
  },

  // ==========================================
  // Current On-Call
  // ==========================================

  async getCurrentOnCall(scheduleId?: string): Promise<CurrentOnCallEntry[]> {
    const params: Record<string, string | undefined> = {};
    if (scheduleId) params.schedule_id = scheduleId;

    const response = await api.get<CurrentOnCallEntry[]>('/on-call/current', { params });
    return response.data;
  },

  // ==========================================
  // Overrides
  // ==========================================

  async getOverrides(
    page: number = 1,
    limit: number = 20,
    filters?: OnCallOverrideFilters
  ): Promise<PaginatedResponse<OnCallOverride>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = { skip, limit };

    if (filters) {
      if (filters.schedule_id) params.schedule_id = filters.schedule_id;
      if (filters.user_id) params.user_id = filters.user_id;
      if (filters.status) {
        params.status = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
      }
      if (filters.override_type) params.override_type = filters.override_type;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
    }

    const response = await api.get<OnCallOverride[]>('/on-call/overrides', { params });

    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(response.headers['x-total-pages'] || '1', 10);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total: total || response.data.length,
        totalPages: totalPages || Math.ceil((total || response.data.length) / limit),
      },
    };
  },

  async createOverride(data: OnCallOverrideCreate): Promise<OnCallOverride> {
    const response = await api.post<OnCallOverride>('/on-call/overrides', data);
    return response.data;
  },

  async updateOverride(id: string, data: OnCallOverrideUpdate): Promise<OnCallOverride> {
    const response = await api.put<OnCallOverride>(`/on-call/overrides/${id}`, data);
    return response.data;
  },

  async approveOverride(id: string): Promise<OnCallOverride> {
    const response = await api.post<OnCallOverride>(`/on-call/overrides/${id}/approve`);
    return response.data;
  },

  async rejectOverride(id: string, reason?: string): Promise<OnCallOverride> {
    const response = await api.post<OnCallOverride>(`/on-call/overrides/${id}/reject`, { reason });
    return response.data;
  },

  async cancelOverride(id: string): Promise<void> {
    await api.delete(`/on-call/overrides/${id}`);
  },

  // ==========================================
  // Escalation & Incidents
  // ==========================================

  async escalateIncident(
    incidentId: string,
    escalationPolicyId: string,
    urgency?: string,
    reason?: string
  ): Promise<EscalationResult> {
    const response = await api.post<EscalationResult>('/on-call/escalate', {
      incident_id: incidentId,
      escalation_policy_id: escalationPolicyId,
      urgency,
      reason,
    });
    return response.data;
  },

  async acknowledgeOnCallIncident(onCallIncidentId: string): Promise<OnCallIncident> {
    const response = await api.post<OnCallIncident>('/on-call/acknowledge', {
      on_call_incident_id: onCallIncidentId,
    });
    return response.data;
  },

  async resolveOnCallIncident(onCallIncidentId: string, notes?: string): Promise<OnCallIncident> {
    const response = await api.post<OnCallIncident>('/on-call/resolve', {
      on_call_incident_id: onCallIncidentId,
      notes,
    });
    return response.data;
  },

  async getOnCallIncidents(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<PaginatedResponse<OnCallIncident>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = { skip, limit };
    if (status) params.status = status;

    const response = await api.get<OnCallIncident[]>('/on-call/incidents', { params });

    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(response.headers['x-total-pages'] || '1', 10);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total: total || response.data.length,
        totalPages: totalPages || Math.ceil((total || response.data.length) / limit),
      },
    };
  },

  // ==========================================
  // Handoff Notes
  // ==========================================

  async getHandoffNotes(
    scheduleId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<OnCallHandoffNote>> {
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = { skip, limit };
    if (scheduleId) params.schedule_id = scheduleId;

    const response = await api.get<OnCallHandoffNote[]>('/on-call/handoff-notes', { params });

    const total = parseInt(response.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(response.headers['x-total-pages'] || '1', 10);

    return {
      data: response.data,
      pagination: {
        page,
        limit,
        total: total || response.data.length,
        totalPages: totalPages || Math.ceil((total || response.data.length) / limit),
      },
    };
  },

  async createHandoffNote(data: OnCallHandoffNoteCreate): Promise<OnCallHandoffNote> {
    const response = await api.post<OnCallHandoffNote>('/on-call/handoff-notes', data);
    return response.data;
  },

  async acknowledgeHandoffNote(id: string): Promise<OnCallHandoffNote> {
    const response = await api.post<OnCallHandoffNote>(`/on-call/handoff-notes/${id}/acknowledge`);
    return response.data;
  },

  // ==========================================
  // Analytics
  // ==========================================

  async getOnCallAnalytics(
    scheduleId?: string,
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<OnCallAnalytics> {
    const params: Record<string, string | undefined> = {};
    if (scheduleId) params.schedule_id = scheduleId;
    if (userId) params.user_id = userId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get<OnCallAnalytics>('/on-call/analytics', { params });
    return response.data;
  },

  // ==========================================
  // Dashboard
  // ==========================================

  async getOnCallDashboard(): Promise<OnCallDashboardStats> {
    const response = await api.get<OnCallDashboardStats>('/on-call/dashboard');
    return response.data;
  },

  // ==========================================
  // Utility Methods
  // ==========================================

  async getMyOnCallStatus(): Promise<{
    is_on_call: boolean;
    current_shifts: OnCallShift[];
    upcoming_shifts: OnCallShift[];
    pending_overrides: OnCallOverride[];
  }> {
    const response = await api.get<{
      is_on_call: boolean;
      current_shifts: OnCallShift[];
      upcoming_shifts: OnCallShift[];
      pending_overrides: OnCallOverride[];
    }>('/on-call/my-status');
    return response.data;
  },

  async findCoverage(
    scheduleId: string,
    startTime: string,
    endTime: string
  ): Promise<{ available_users: { user_id: string; user_name: string; availability: string }[] }> {
    const response = await api.get<{
      available_users: { user_id: string; user_name: string; availability: string }[];
    }>(`/on-call/schedules/${scheduleId}/find-coverage`, {
      params: { start_time: startTime, end_time: endTime },
    });
    return response.data;
  },
};

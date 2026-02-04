/**
 * Iframe Service
 * 
 * Manages external tool integrations and their configurations.
 */

import axios from 'axios';
import { IframeTemplate } from '../pages/iframe/types';

const API_URL = '/api/v1/iframes';

export const iframeService = {
  /**
   * Fetches the list of all available iframe templates.
   */
  list: async (): Promise<IframeTemplate[]> => {
    try {
      // In a real scenario, this would call the backend.
      // For now, we'll return the hardcoded list or call the API if it exists.
      const response = await axios.get(`${API_URL}/templates`);
      return response.data;
    } catch (error) {
      console.error('Failed to list iframe templates:', error);
      // Fallback to empty list
      return [];
    }
  },

  /**
   * Gets a specific iframe template by ID.
   */
  getById: async (id: string): Promise<IframeTemplate | null> => {
    try {
      const response = await axios.get(`${API_URL}/templates/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch iframe template ${id}:`, error);
      return null;
    }
  }
};

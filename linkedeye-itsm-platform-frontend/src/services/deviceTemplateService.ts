
import axios from 'axios';

const API_URL = '/api/v1/device-templates';

export interface TemplateItem {
  model: string;
  filename: string;
  series: string;
  ports: number;
}

export interface DeviceTemplateCatalog {
  f_swi: Record<string, TemplateItem[]>;
  r_swi: Record<string, TemplateItem[]>;
  e_swi: Record<string, TemplateItem[]>;
  s_hw: Record<string, TemplateItem[]>;
  [key: string]: Record<string, TemplateItem[]>;
}

export const deviceTemplateService = {
  /**
   * Fetches the list of all available device templates.
   */
  list: async (): Promise<DeviceTemplateCatalog> => {
    try {
      const response = await axios.get(`${API_URL}/list`);
      return response.data;
    } catch (error) {
      console.error('Failed to list device templates:', error);
      // Return empty catalog on error to prevent page crash
      return { f_swi: {}, r_swi: {}, e_swi: {}, s_hw: {} }; 
    }
  },

  /**
   * Gets the URL to render a specific template.
   */
  getRenderUrl: (filename: string): string => {
    return `${API_URL}/render/${filename}`;
  },

  /**
   * Gets the URL to fetch the SVG content (for direct embedding if needed).
   */
  getSvgUrl: (filename: string): string => {
    return `${API_URL}/svg/${filename}`;
  }
};

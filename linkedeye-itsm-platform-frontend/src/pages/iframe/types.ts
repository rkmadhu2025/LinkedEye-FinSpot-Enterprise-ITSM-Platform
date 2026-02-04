/**
 * Iframe Module Types
 */

import React from 'react';

export type IframeLayerType = 'monitoring' | 'automation' | 'cloud' | 'internal';

export interface IframeLayer {
  id: IframeLayerType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export interface IframeTemplate {
  id: string;
  name: string;
  provider: string;
  description?: string;
  url: string;
  category?: IframeLayerType;
}

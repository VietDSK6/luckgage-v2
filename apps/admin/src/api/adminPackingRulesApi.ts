import { adminConfig } from '@/app/config';

import { ApiClient } from './ApiClient';
import type { PackingPreview, PackingRule, PackingRuleInput, PackingRuleSample } from './types';

const client = new ApiClient(adminConfig.apiBaseUrl);

export const adminPackingRulesApi = {
  list(signal?: AbortSignal): Promise<{ items: PackingRule[] }> {
    return client.request<{ items: PackingRule[] }>(
      '/admin/packing-rules',
      signal ? { signal } : {},
    );
  },

  get(ruleId: string, signal?: AbortSignal): Promise<PackingRule> {
    return client.request<PackingRule>(
      `/admin/packing-rules/${encodeURIComponent(ruleId)}`,
      signal ? { signal } : {},
    );
  },

  create(input: PackingRuleInput, csrfToken: string): Promise<PackingRule> {
    return client.request<PackingRule>('/admin/packing-rules', {
      body: input,
      csrfToken,
      method: 'POST',
    });
  },

  update(ruleId: string, input: Omit<PackingRuleInput, 'key'>, csrfToken: string): Promise<PackingRule> {
    return client.request<PackingRule>(`/admin/packing-rules/${encodeURIComponent(ruleId)}`, {
      body: input,
      csrfToken,
      method: 'PATCH',
    });
  },

  preview(
    ruleId: string,
    sample: PackingRuleSample,
    csrfToken: string,
  ): Promise<PackingPreview> {
    return client.request<PackingPreview>(
      `/admin/packing-rules/${encodeURIComponent(ruleId)}/preview`,
      { body: sample, csrfToken, method: 'POST' },
    );
  },

  publish(ruleId: string, csrfToken: string): Promise<PackingRule> {
    return client.request<PackingRule>(
      `/admin/packing-rules/${encodeURIComponent(ruleId)}/publish`,
      { csrfToken, method: 'POST' },
    );
  },

  archive(ruleId: string, csrfToken: string): Promise<PackingRule> {
    return client.request<PackingRule>(
      `/admin/packing-rules/${encodeURIComponent(ruleId)}/archive`,
      { csrfToken, method: 'POST' },
    );
  },
};

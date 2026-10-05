// Subsets of the Upsun API schemas (https://meta.upsun.com/openapi-spec),
// limited to the fields the dashboard uses.

export type User = {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
};

export type Organization = {
  id: string;
  name: string;
  label: string;
  status: "active" | "restricted" | "suspended" | "deleted";
};

export type OrganizationProject = {
  id: string;
  organization_id: string;
  title: string;
  region: string;
  plan: string;
  type: "grid" | "dedicated";
  status: "requested" | "active" | "failed" | "suspended" | "deleted";
  default_branch: string;
  project_ui: string;
  subscription_id: string;
  created_at: string;
  updated_at: string;
};

export type Environment = {
  id: string;
  name: string;
  title: string;
  type: "development" | "production" | "staging";
  status: "active" | "deleting" | "dirty" | "inactive" | "paused";
  is_main: boolean;
  is_dirty: boolean;
  default_domain: string | null;
  head_commit: string | null;
  parent: string | null;
  is_pr: boolean;
  created_at: string;
  last_active_at: string | null;
  last_backup_at: string | null;
  deployment_state: {
    last_deployment_successful: boolean;
    last_deployment_at: string | null;
    last_deployment_failure_reason: "error" | "shell" | null;
  } | null;
};

export type Activity = {
  id: string;
  type: string;
  state: "cancelled" | "complete" | "in_progress" | "pending" | "scheduled" | "staged";
  result: "failure" | "success" | null;
  environments: string[];
  text: string;
  created_at: string;
  completed_at: string | null;
  completion_percent: number;
};

export type Route = {
  id: string;
  primary: boolean;
  type: string;
};

export type Integration = {
  id: string;
  type: string;
  created_at: string;
  updated_at: string;
  // Remaining fields vary by type; read them defensively.
  [field: string]: unknown;
};

export type ResourceAgg = { avg?: number | null; max?: number | null };

export type InstanceResources = {
  cpu_used?: ResourceAgg;
  cpu_limit?: { max?: number | null };
  memory_used?: ResourceAgg;
  memory_limit?: { max?: number | null };
};

export type ResourcesSummary = {
  _from: number;
  _to: number;
  data: { services: Record<string, Record<string, InstanceResources>> };
};

export type UsageGroup = {
  title: string;
  current_usage_formatted?: string;
  daily_average_formatted?: string;
  free_quantity_formatted?: string;
  not_charged?: boolean;
};

export type OrganizationEstimate = {
  total: string;
  sub_total: string;
  vouchers?: string;
  support_level?: string;
  user_management?: string;
  user_licenses?: { base?: { count?: number; total?: string } };
  subscriptions?: {
    total: string;
    list: {
      license_id: string;
      project_title: string;
      total: string;
      usage?: { cpu?: number; memory?: number; storage?: number; environments?: number };
    }[];
  };
};

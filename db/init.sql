CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  stack TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO projects (title, slug, description, status, stack) VALUES
('Kubernetes Operations Platform', 'kubernetes-ops', 'Container orchestration, service exposure and workload operations.', 'active', ARRAY['Kubernetes','Docker','Ingress']),
('Backup & Recovery', 'backup-recovery', 'Enterprise backup architecture with recovery and protection workflows.', 'active', ARRAY['Veeam','Veritas','DataDomain']),
('Virtualization Infrastructure', 'virtualization', 'VMware based compute, VDI and infrastructure operations.', 'active', ARRAY['VMware','HPE','SAN'])
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE brand_design_system_members (
  brand_id text NOT NULL REFERENCES brand_design_systems(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'viewer' CHECK (access_level IN ('owner', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, user_id)
);

CREATE INDEX brand_design_system_members_user_idx
  ON brand_design_system_members (user_id, brand_id);

INSERT INTO brand_design_system_members (brand_id, user_id, access_level)
SELECT id, owner_id, 'owner' FROM brand_design_systems
ON CONFLICT (brand_id, user_id) DO NOTHING;

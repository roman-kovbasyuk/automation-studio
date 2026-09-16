-- Set the default for future clients, then randomize existing projects once.
-- Complete DDL before UPDATE because campaign integrity triggers are deferred.
ALTER TABLE campaigns ADD COLUMN project_type TEXT NOT NULL DEFAULT 'banners';
ALTER TABLE campaigns ADD CONSTRAINT campaigns_project_type_check CHECK (project_type IN (
  'banners', 'reels', 'landing-page', 'website-page', 'presentations', 'business-cards', 'email-signature'
));
UPDATE campaigns SET project_type = (ARRAY[
  'banners', 'reels', 'landing-page', 'website-page',
  'presentations', 'business-cards', 'email-signature'
])[1 + floor(random() * 7)::int];

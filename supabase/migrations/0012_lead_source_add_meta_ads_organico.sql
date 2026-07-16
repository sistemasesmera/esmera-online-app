-- Add legacy lead_source values used by the app before the enum was extended.
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'meta_ads';
ALTER TYPE lead_source ADD VALUE IF NOT EXISTS 'organico';

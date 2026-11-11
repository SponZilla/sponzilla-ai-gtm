-- These tables contain operator and prospect information and are only used
-- through the server-side Prisma connection. Keep them unavailable through
-- Supabase's public Data API unless an explicit policy is later required.
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketIntelligenceOpportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;

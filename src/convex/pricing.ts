import { query } from "./_generated/server";

/** Public pricing — display MUST read from subscriptionPlans, never hardcode. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db.query("subscriptionPlans").collect();
    return plans
      .filter((p) => p.isActive)
      .sort((a, b) => a.priceMonthly - b.priceMonthly)
      .map((p) => ({
        _id: p._id,
        tier: p.tier,
        name: p.name,
        description: p.description,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        maxStaff: p.maxStaff,
        maxCandidates: p.maxCandidates,
        maxClients: p.maxClients,
        features: p.features,
      }));
  },
});

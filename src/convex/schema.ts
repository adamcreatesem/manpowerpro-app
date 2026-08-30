import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

/* -------------------------------------------------------------------------- */
/* Roles                                                                      */
/* -------------------------------------------------------------------------- */

export const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("agency_owner"),
  v.literal("agency_manager"),
  v.literal("agency_staff"),
  v.literal("client"),
);
export type Role = Infer<typeof roleValidator>;

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  agency_owner: "Agency owner",
  agency_manager: "Agency manager",
  agency_staff: "Agency staff",
  client: "Client",
};

/* -------------------------------------------------------------------------- */
/* Candidate pipeline — the real 13-value derived status + raw sheet fields   */
/* -------------------------------------------------------------------------- */

export const CANDIDATE_STATUS = [
  "new",
  "screening",
  "documentation",
  "visa_processing",
  "medical_check",
  "contracting",
  "training",
  "ready_for_departure",
  "deployed",
  "on_site",
  "completed",
  "rejected",
  "on_hold",
] as const;
export const candidateStatusValidator = v.union(
  ...CANDIDATE_STATUS.map((s) => v.literal(s)),
);
export type CandidateStatus = Infer<typeof candidateStatusValidator>;

/* Raw sheet columns (the agency's Master_Pipeline values — copied verbatim) */
export const documentsCustodyValidator = v.union(
  v.literal("AVAILABLE"),
  v.literal("WITHDRAWN"),
  v.literal("TAKEN FOR MEDICAL"),
);
export const musStatValidator = v.union(
  v.literal("AVAILABLE"),
  v.literal("EMPLOYEE"),
  v.literal("PROCESSING"),
  v.literal("HELD"),
  v.literal("NEW"),
  v.literal("DELETED"),
  v.literal("CONTRACT CANCELED"),
  v.literal("REQUEST CANCELATION"),
);
export const lmisStatValidator = v.union(
  v.literal("IMPORTED"),
  v.literal("ISSUED"),
  v.literal("OFFLINE"),
  v.literal("PMNT PAID"),
  v.literal("HELD"),
  v.literal("DELETED"),
);
export const medicalStatusValidator = v.union(
  v.literal("FIT"),
  v.literal("UNFIT"),
  v.literal("EXPIRED"),
  v.literal("IN-PROGRESS"),
  v.literal("SLIP ISSUED"),
  v.literal("TAKEN SLIP"),
);
export const wakalahStatusValidator = v.union(
  v.literal("PAID"),
  v.literal("REQUESTED"),
);
export const visaStatusValidator = v.union(
  v.literal("VISA ISSUED"),
  v.literal("EXPIRED"),
  v.literal("TASHEER"),
  v.literal("EMBASSY"),
  v.literal("RETURNED FROM EMBASSY"),
  v.literal("PROCESSING"),
  v.literal("REJECTED"),
  v.literal("REQUEST CANCELATION"),
  v.literal("VISA CANCELED"),
);
export const trainingStatusValidator = v.union(
  v.literal("ATTENDED"),
  v.literal("PASS"),
  v.literal("FAIL"),
  v.literal("RETEST"),
);
export const flightStatValidator = v.union(
  v.literal("DEPARTED"),
  v.literal("BOOKED"),
  v.literal("PENDING"),
  v.literal("CANCELED"),
  v.literal("DELAYED"),
  v.literal("ARRIVED"),
);
export const biometricStatusValidator = v.union(
  v.literal("pending"),
  v.literal("submitted"),
  v.literal("completed"),
);

export const CV_EXPERIENCE = v.array(
  v.object({
    title: v.string(),
    company: v.string(),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    description: v.optional(v.string()),
  }),
);
export const CV_EDUCATION = v.array(
  v.object({
    degree: v.string(),
    institution: v.string(),
    year: v.optional(v.string()),
  }),
);
export const CV_LANGUAGE = v.array(
  v.object({
    language: v.string(),
    proficiency: v.optional(v.string()),
  }),
);

/* -------------------------------------------------------------------------- */
/* Shared enums                                                               */
/* -------------------------------------------------------------------------- */

export const currencyValidator = v.union(
  v.literal("ETB"),
  v.literal("SAR"),
  v.literal("USD"),
);

export const planTierValidator = v.union(
  v.literal("free"),
  v.literal("starter"),
  v.literal("growth"),
  v.literal("enterprise"),
);
export type PlanTier = Infer<typeof planTierValidator>;

export const subscriptionStatusValidator = v.union(
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("trial"),
  v.literal("expired"),
);

export const paymentMethodValidator = v.union(
  v.literal("telebirr"),
  v.literal("cbe_birr"),
  v.literal("bank_transfer"),
  v.literal("chapa"),
);

export const receiptStatusValidator = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("rejected"),
);

export const feeStatusValidator = v.union(
  v.literal("arranged"),
  v.literal("paid"),
);

export const clientLeadStatusValidator = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("negotiation"),
  v.literal("won"),
  v.literal("lost"),
);

export const nitaqatColorValidator = v.union(
  v.literal("platinum"),
  v.literal("high_green"),
  v.literal("green"),
  v.literal("yellow"),
  v.literal("red"),
);

export const jobOrderStatusValidator = v.union(
  v.literal("requested"),
  v.literal("open"),
  v.literal("in_progress"),
  v.literal("filled"),
  v.literal("cancelled"),
  v.literal("on_hold"),
);

export const genderRequirementValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("any"),
);

export const interviewResultValidator = v.union(
  v.literal("pending"),
  v.literal("passed"),
  v.literal("failed"),
  v.literal("scheduled"),
);

export const procedureCategoryValidator = v.union(
  v.literal("documentation"),
  v.literal("visa"),
  v.literal("medical"),
  v.literal("contract"),
  v.literal("training"),
  v.literal("travel"),
  v.literal("onboarding"),
  v.literal("general"),
);

export const procedureStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
);

export const documentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("uploaded"),
  v.literal("verified"),
  v.literal("rejected"),
);

export const visaAppStatusValidator = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("processing"),
  v.literal("approved"),
  v.literal("issued"),
  v.literal("rejected"),
);

export const departureStatusValidator = v.union(
  v.literal("scheduled"),
  v.literal("confirmed"),
  v.literal("departed"),
  v.literal("cancelled"),
);

export const syncProviderValidator = v.union(
  v.literal("musaned"),
  v.literal("enjazit"),
  v.literal("wafid"),
  v.literal("elmis"),
  v.literal("tasheer"),
);

export const syncStatusValidator = v.union(
  v.literal("idle"),
  v.literal("syncing"),
  v.literal("success"),
  v.literal("error"),
);

export const announcementTypeValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("emergency"),
  v.literal("maintenance"),
);

export const departmentValidator = v.union(
  v.literal("reception"),
  v.literal("info_desk"),
  v.literal("data_entry"),
  v.literal("document_control"),
);

export const staffTaskStatusValidator = v.union(
  v.literal("pending"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const taskPriorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

export const overallResultValidator = v.union(
  v.literal("fit"),
  v.literal("unfit"),
  v.literal("pending"),
);

export const trainingTypeValidator = v.union(
  v.literal("predeparture"),
  v.literal("skill_based"),
  v.literal("language"),
  v.literal("safety"),
  v.literal("orientation"),
);

export const trainingCertStatusValidator = v.union(
  v.literal("attended"),
  v.literal("passed"),
  v.literal("failed"),
  v.literal("retest"),
);

export const returnStatusValidator = v.union(
  v.literal("on_site"),
  v.literal("completed"),
  v.literal("early_return"),
  v.literal("absconded"),
);

export const expenseTypeValidator = v.union(
  v.literal("medical"),
  v.literal("visa"),
  v.literal("training"),
  v.literal("travel"),
  v.literal("documentation"),
  v.literal("insurance"),
  v.literal("accommodation"),
  v.literal("other"),
);

export const paidByValidator = v.union(
  v.literal("candidate"),
  v.literal("employer"),
  v.literal("agency"),
);

export const channelValidator = v.union(
  v.literal("email"),
  v.literal("sms"),
  v.literal("telegram"),
  v.literal("in_app"),
);

export const commTypeValidator = v.union(
  v.literal("status_update"),
  v.literal("reminder"),
  v.literal("announcement"),
  v.literal("custom"),
);

export const recipientTypeValidator = v.union(
  v.literal("candidate"),
  v.literal("client"),
  v.literal("staff"),
  v.literal("all_candidates"),
  v.literal("custom"),
);

export const commLogStatusValidator = v.union(
  v.literal("sent"),
  v.literal("failed"),
  v.literal("partial"),
);

export const maritalStatusValidator = v.union(
  v.literal("single"),
  v.literal("married"),
  v.literal("divorced"),
  v.literal("widowed"),
);

const schema = defineSchema(
  {
    // auth tables from convex auth — do not remove or modify
    ...authTables,

    /* -------------------------------------------------------------------- */
    /* 3.1 users                                                            */
    /* -------------------------------------------------------------------- */
    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
      agencyId: v.optional(v.id("agencies")),
      partnerAgencyId: v.optional(v.id("partnerAgencies")),
      clientId: v.optional(v.id("clients")),
      staffRole: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    })
      .index("email", ["email"])
      .index("agency", ["agencyId"])
      .index("partner", ["partnerAgencyId"])
      .index("client", ["clientId"]),

    /* -------------------------------------------------------------------- */
    /* 3.2 subscriptionPlans — single source of truth for pricing           */
    /* -------------------------------------------------------------------- */
    subscriptionPlans: defineTable({
      tier: planTierValidator,
      name: v.string(),
      description: v.string(),
      priceMonthly: v.number(),
      priceYearly: v.number(),
      maxStaff: v.number(),
      maxCandidates: v.number(),
      maxClients: v.number(),
      features: v.array(v.string()),
      isActive: v.boolean(),
    }).index("tier", ["tier"]),

    /* -------------------------------------------------------------------- */
    /* 3.3 subscriptions                                                    */
    /* -------------------------------------------------------------------- */
    subscriptions: defineTable({
      agencyId: v.id("agencies"),
      planId: v.id("subscriptionPlans"),
      status: subscriptionStatusValidator,
      currentPeriodStart: v.optional(v.number()),
      currentPeriodEnd: v.optional(v.number()),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      trialEndsAt: v.optional(v.number()),
      cancelAtPeriodEnd: v.optional(v.boolean()),
      seatCount: v.optional(v.number()),
      paymentVerified: v.optional(v.boolean()),
      paymentVerifiedAt: v.optional(v.number()),
      verifiedBy: v.optional(v.id("users")),
    })
      .index("by_agency", ["agencyId"])
      .index("by_plan", ["planId"])
      .index("by_status", ["status"]),

    /* -------------------------------------------------------------------- */
    /* 3.4 agencies                                                         */
    /* -------------------------------------------------------------------- */
    agencies: defineTable({
      name: v.string(),
      code: v.string(),
      address: v.optional(v.string()),
      phone: v.optional(v.string()),
      isActive: v.boolean(),
      country: v.optional(v.string()),
      isBanned: v.optional(v.boolean()),
      banReason: v.optional(v.string()),
      bannedBy: v.optional(v.id("users")),
      bannedAt: v.optional(v.number()),
      licenseNumber: v.optional(v.string()),
      licenseExpiry: v.optional(v.string()),
      bankGuarantee: v.optional(v.string()),
      molsRegistrationDate: v.optional(v.string()),
      molsRegistrationNumber: v.optional(v.string()),
      website: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
    }).index("code", ["code"]),

    /* -------------------------------------------------------------------- */
    /* 3.5 paymentReceipts                                                  */
    /* -------------------------------------------------------------------- */
    paymentReceipts: defineTable({
      agencyId: v.id("agencies"),
      subscriptionId: v.id("subscriptions"),
      amount: v.number(),
      receiptUrl: v.optional(v.string()),
      paymentMethod: paymentMethodValidator,
      transactionRef: v.optional(v.string()),
      senderName: v.optional(v.string()),
      senderPhone: v.optional(v.string()),
      notes: v.optional(v.string()),
      status: receiptStatusValidator,
      adminNotes: v.optional(v.string()),
      verifiedBy: v.optional(v.id("users")),
      verifiedAt: v.optional(v.number()),
      uploadedAt: v.number(),
      uploadedBy: v.id("users"),
    })
      .index("by_agency", ["agencyId"])
      .index("by_subscription", ["subscriptionId"])
      .index("by_status", ["status"])
      .index("by_date", ["uploadedAt"]),

    /* -------------------------------------------------------------------- */
    /* 3.6 partnerAgencies (Saudi side)                                     */
    /* -------------------------------------------------------------------- */
    partnerAgencies: defineTable({
      name: v.string(),
      code: v.string(),
      country: v.string(),
      contactPerson: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      isActive: v.boolean(),
      saudiLicenseNumber: v.optional(v.string()),
    }).index("code", ["code"]),

    /* -------------------------------------------------------------------- */
    /* 3.7 clients (Saudi employers)                                        */
    /* -------------------------------------------------------------------- */
    clients: defineTable({
      agencyId: v.id("agencies"),
      name: v.string(),
      contactPerson: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      industry: v.optional(v.string()),
      address: v.optional(v.string()),
      isActive: v.boolean(),
      leadSource: v.optional(v.string()),
      leadStatus: v.optional(clientLeadStatusValidator),
      expectedMargin: v.optional(v.number()),
      contractStartDate: v.optional(v.string()),
      contractEndDate: v.optional(v.string()),
      slaTimelineDays: v.optional(v.number()),
      paymentTerms: v.optional(v.string()),
      nitaqatColor: v.optional(nitaqatColorValidator),
      qiwaId: v.optional(v.string()),
      musanedEmployerId: v.optional(v.string()),
    }).index("by_agency", ["agencyId"]),

    /* -------------------------------------------------------------------- */
    /* 3.8 jobOrders                                                        */
    /* -------------------------------------------------------------------- */
    jobOrders: defineTable({
      agencyId: v.id("agencies"),
      clientId: v.id("clients"),
      partnerAgencyId: v.optional(v.id("partnerAgencies")),
      title: v.string(),
      position: v.string(),
      quantity: v.number(),
      filled: v.number(),
      location: v.optional(v.string()),
      salary: v.optional(v.string()),
      status: jobOrderStatusValidator,
      musanedReference: v.optional(v.string()),
      minAge: v.optional(v.number()),
      maxAge: v.optional(v.number()),
      genderRequirement: v.optional(genderRequirementValidator),
      educationLevel: v.optional(v.string()),
      experienceYears: v.optional(v.number()),
      languageRequirements: v.optional(CV_LANGUAGE),
      certificationsNeeded: v.optional(v.array(v.string())),
      workingHours: v.optional(v.string()),
      overtimePolicy: v.optional(v.string()),
      accommodationProvided: v.optional(v.boolean()),
      medicalInsurance: v.optional(v.boolean()),
      contractDuration: v.optional(v.string()),
      interviewRequired: v.optional(v.boolean()),
      interviewDate: v.optional(v.string()),
      interviewResult: v.optional(interviewResultValidator),
    })
      .index("by_agency", ["agencyId"])
      .index("by_client", ["clientId"])
      .index("by_status", ["status"])
      .index("by_partner", ["partnerAgencyId"]),

    /* -------------------------------------------------------------------- */
    /* 3.9 candidates — the heart of the system                             */
    /* -------------------------------------------------------------------- */
    candidates: defineTable({
      /* NOTE: agencyId/firstName/lastName/currentStatus are declared optional
         so legacy rows predating this schema do not block deploys. Every row
         written by the app and seed sets them. */
      agencyId: v.optional(v.id("agencies")),
      jobOrderId: v.optional(v.id("jobOrders")),
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      nationality: v.optional(v.string()),
      passportNumber: v.optional(v.string()),
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      notes: v.optional(v.string()),
      gender: v.optional(v.string()),
      occupation: v.optional(v.string()),
      region: v.optional(v.string()),
      assignedStaffId: v.optional(v.id("users")),
      /* derived 13-value status — kept in sync by mutations */
      currentStatus: v.optional(candidateStatusValidator),
      /* raw pipeline sheet columns */
      documents: v.optional(documentsCustodyValidator),
      musStat: v.optional(musStatValidator),
      lmisStat: v.optional(lmisStatValidator),
      medical: v.optional(medicalStatusValidator),
      wakalah: v.optional(wakalahStatusValidator),
      visaStatus: v.optional(visaStatusValidator),
      training: v.optional(trainingStatusValidator),
      bookedFor: v.optional(v.string()),
      flightStat: v.optional(flightStatValidator),
      pro: v.optional(v.string()),
      laborId: v.optional(v.string()),
      elmisProfileId: v.optional(v.string()),
      musanedId: v.optional(v.string()),
      musanedContractRef: v.optional(v.string()),
      wafidRefNumber: v.optional(v.string()),
      wafidStatus: v.optional(v.string()),
      medicalExpiryDate: v.optional(v.string()),
      contractCreatedAt: v.optional(v.number()),
      deployedAt: v.optional(v.number()),
      biometricStatus: v.optional(biometricStatusValidator),
      tasheerAppointmentDate: v.optional(v.string()),
      insuranceProvider: v.optional(v.string()),
      insurancePolicyNumber: v.optional(v.string()),
      insuranceExpiryDate: v.optional(v.string()),
      lastUpdatedBy: v.optional(v.id("users")),
      lastStatusChangeAt: v.optional(v.number()),
      /* candidate portal PIN (passport + PIN login, no user row) */
      portalPin: v.optional(v.string()),
      /* CV fields */
      skills: v.optional(v.array(v.string())),
      experience: v.optional(CV_EXPERIENCE),
      education: v.optional(CV_EDUCATION),
      languages: v.optional(CV_LANGUAGE),
      professionalSummary: v.optional(v.string()),
    })
      .index("by_agency", ["agencyId"])
      .index("by_status", ["currentStatus"])
      .index("by_job_order", ["jobOrderId"])
      .index("by_passport", ["passportNumber"])
      .index("by_labor_id", ["laborId"])
      .index("by_musaned", ["musanedId"])
      .index("by_assigned_staff", ["assignedStaffId"]),

    /* -------------------------------------------------------------------- */
    /* 3.10 procedureTemplates + candidateProcedures                        */
    /* -------------------------------------------------------------------- */
    procedureTemplates: defineTable({
      agencyId: v.id("agencies"),
      name: v.string(),
      category: procedureCategoryValidator,
      order: v.number(),
      isRequired: v.boolean(),
      estimatedDays: v.optional(v.number()),
    }),

    candidateProcedures: defineTable({
      candidateId: v.id("candidates"),
      procedureTemplateId: v.id("procedureTemplates"),
      status: procedureStatusValidator,
      assignedTo: v.optional(v.id("users")),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.11 documents                                                       */
    /* -------------------------------------------------------------------- */
    documents: defineTable({
      agencyId: v.id("agencies"),
      candidateId: v.optional(v.id("candidates")),
      clientId: v.optional(v.id("clients")),
      name: v.string(),
      type: v.string(),
      fileUrl: v.optional(v.string()),
      status: documentStatusValidator,
      uploadedBy: v.optional(v.id("users")),
      uploadedByCandidate: v.optional(v.id("candidates")),
      externalRef: v.optional(v.string()),
    })
      .index("by_agency", ["agencyId"])
      .index("by_candidate", ["candidateId"])
      .index("by_client", ["clientId"]),

    /* -------------------------------------------------------------------- */
    /* 3.12 visaApplications                                                */
    /* -------------------------------------------------------------------- */
    visaApplications: defineTable({
      candidateId: v.id("candidates"),
      country: v.string(),
      visaType: v.string(),
      status: visaAppStatusValidator,
      submittedDate: v.optional(v.number()),
      expiryDate: v.optional(v.string()),
      notes: v.optional(v.string()),
      mofaRefNumber: v.optional(v.string()),
      tasheerAppointmentId: v.optional(v.string()),
      biometricStatus: v.optional(biometricStatusValidator),
      visaNumber: v.optional(v.string()),
      visaIssueDate: v.optional(v.string()),
      visaCategory: v.optional(v.string()),
      visaDuration: v.optional(v.string()),
      embassyName: v.optional(v.string()),
      embassyReference: v.optional(v.string()),
      applicationDate: v.optional(v.number()),
      approvalDate: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      professionOnVisa: v.optional(v.string()),
      sponsoringCompany: v.optional(v.string()),
      sponsorshipIqama: v.optional(v.string()),
    })
      .index("by_candidate", ["candidateId"])
      .index("by_status", ["status"]),

    /* -------------------------------------------------------------------- */
    /* 3.13 departures                                                      */
    /* -------------------------------------------------------------------- */
    departures: defineTable({
      agencyId: v.id("agencies"),
      candidateId: v.id("candidates"),
      flightNumber: v.optional(v.string()),
      departureDate: v.optional(v.number()),
      destination: v.optional(v.string()),
      status: departureStatusValidator,
    })
      .index("by_agency", ["agencyId"])
      .index("by_candidate", ["candidateId"])
      .index("by_status", ["status"]),

    /* -------------------------------------------------------------------- */
    /* 3.14 activities                                                      */
    /* -------------------------------------------------------------------- */
    activities: defineTable({
      agencyId: v.optional(v.id("agencies")),
      candidateId: v.optional(v.id("candidates")),
      userId: v.optional(v.id("users")),
      action: v.string(),
      description: v.string(),
      createdAt: v.number(),
    })
      .index("by_agency", ["agencyId"])
      .index("by_candidate", ["candidateId"])
      .index("by_user", ["userId"]),

    /* -------------------------------------------------------------------- */
    /* 3.15 auditLogs                                                       */
    /* -------------------------------------------------------------------- */
    auditLogs: defineTable({
      agencyId: v.id("agencies"),
      userId: v.optional(v.id("users")),
      action: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      description: v.string(),
      previousValue: v.optional(v.string()),
      newValue: v.optional(v.string()),
      createdAt: v.number(),
      metadata: v.optional(v.string()),
    })
      .index("by_agency", ["agencyId"])
      .index("by_entity", ["entityType", "entityId"])
      .index("by_user", ["userId"])
      .index("by_action", ["action"])
      .index("by_date", ["createdAt"]),

    /* -------------------------------------------------------------------- */
    /* 3.16 clientMessages / candidateMessages                              */
    /* -------------------------------------------------------------------- */
    clientMessages: defineTable({
      agencyId: v.id("agencies"),
      clientId: v.id("clients"),
      senderRole: v.union(v.literal("client"), v.literal("agency")),
      senderId: v.id("users"),
      body: v.string(),
      readByClient: v.boolean(),
      readByAgency: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_agency", ["agencyId"])
      .index("by_client", ["clientId"])
      .index("by_client_date", ["clientId", "createdAt"]),

    candidateMessages: defineTable({
      agencyId: v.id("agencies"),
      candidateId: v.id("candidates"),
      senderRole: v.union(v.literal("candidate"), v.literal("agency")),
      senderId: v.string(),
      body: v.string(),
      readByCandidate: v.boolean(),
      readByAgency: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_agency", ["agencyId"])
      .index("by_candidate", ["candidateId"])
      .index("by_candidate_date", ["candidateId", "createdAt"]),

    /* -------------------------------------------------------------------- */
    /* 3.17 staffMetrics                                                    */
    /* -------------------------------------------------------------------- */
    staffMetrics: defineTable({
      agencyId: v.id("agencies"),
      userId: v.id("users"),
      periodStart: v.number(),
      periodEnd: v.number(),
      totalActions: v.number(),
      candidatesCreated: v.number(),
      statusChanges: v.number(),
      proceduresCompleted: v.number(),
      documentsProcessed: v.number(),
      candidatesAssigned: v.number(),
      candidatesDeployed: v.number(),
      conversionRate: v.optional(v.number()),
      avgStatusChangeTime: v.optional(v.number()),
      rejectionRate: v.optional(v.number()),
    })
      .index("by_agency_period", ["agencyId", "periodEnd"])
      .index("by_user", ["userId"]),

    /* -------------------------------------------------------------------- */
    /* 3.18 integrationSyncs + integrationCredentials                       */
    /* -------------------------------------------------------------------- */
    integrationSyncs: defineTable({
      agencyId: v.id("agencies"),
      provider: syncProviderValidator,
      status: syncStatusValidator,
      startedAt: v.number(),
      completedAt: v.optional(v.number()),
      recordsProcessed: v.optional(v.number()),
      recordsFailed: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
    }),

    integrationCredentials: defineTable({
      agencyId: v.id("agencies"),
      provider: syncProviderValidator,
      username: v.string(),
      credentials: v.string(),
      isActive: v.boolean(),
      lastVerifiedAt: v.optional(v.number()),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.19 announcements + agencyNotes                                     */
    /* -------------------------------------------------------------------- */
    announcements: defineTable({
      title: v.string(),
      message: v.string(),
      type: announcementTypeValidator,
      targetAgencyIds: v.optional(v.array(v.id("agencies"))),
      startsAt: v.number(),
      expiresAt: v.optional(v.number()),
      isActive: v.boolean(),
      createdBy: v.id("users"),
      createdAt: v.number(),
    }),

    agencyNotes: defineTable({
      agencyId: v.id("agencies"),
      note: v.string(),
      createdBy: v.id("users"),
      createdAt: v.number(),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.20 staffTasks                                                      */
    /* -------------------------------------------------------------------- */
    staffTasks: defineTable({
      agencyId: v.id("agencies"),
      userId: v.id("users"),
      department: departmentValidator,
      title: v.string(),
      description: v.optional(v.string()),
      status: staffTaskStatusValidator,
      priority: v.optional(taskPriorityValidator),
      relatedCandidateId: v.optional(v.id("candidates")),
      dueDate: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.21 medicalExams                                                    */
    /* -------------------------------------------------------------------- */
    medicalExams: defineTable({
      candidateId: v.id("candidates"),
      centerName: v.optional(v.string()),
      centerAddress: v.optional(v.string()),
      examinationDate: v.optional(v.string()),
      doctorName: v.optional(v.string()),
      panelType: v.optional(v.string()),
      hivResult: v.optional(v.boolean()),
      hbsagResult: v.optional(v.boolean()),
      hcvResult: v.optional(v.boolean()),
      tbResult: v.optional(v.boolean()),
      syphilisResult: v.optional(v.boolean()),
      otherResults: v.optional(v.string()),
      overallResult: v.optional(overallResultValidator),
      unfitReason: v.optional(v.string()),
      retestPossible: v.optional(v.boolean()),
      retestDate: v.optional(v.string()),
      nextDueDate: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.22 trainingCertifications                                          */
    /* -------------------------------------------------------------------- */
    trainingCertifications: defineTable({
      candidateId: v.id("candidates"),
      centerName: v.optional(v.string()),
      courseName: v.optional(v.string()),
      trainerName: v.optional(v.string()),
      startDate: v.optional(v.string()),
      endDate: v.optional(v.string()),
      totalHours: v.optional(v.number()),
      trainingType: v.optional(trainingTypeValidator),
      certificateNumber: v.optional(v.string()),
      certificateIssueDate: v.optional(v.string()),
      certificateExpiry: v.optional(v.string()),
      status: v.optional(trainingCertStatusValidator),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.23 postDeployment                                                  */
    /* -------------------------------------------------------------------- */
    postDeployment: defineTable({
      candidateId: v.id("candidates"),
      arrivalConfirmationDate: v.optional(v.string()),
      employerName: v.optional(v.string()),
      employerFeedback: v.optional(v.string()),
      firstMonthCheckDate: v.optional(v.string()),
      salaryStartDate: v.optional(v.string()),
      firstSalaryReceived: v.optional(v.boolean()),
      firstSalaryDate: v.optional(v.string()),
      grievanceReported: v.optional(v.boolean()),
      grievanceDescription: v.optional(v.string()),
      grievanceResolved: v.optional(v.boolean()),
      grievanceResolvedDate: v.optional(v.string()),
      contractCompletionDate: v.optional(v.string()),
      contractRenewed: v.optional(v.boolean()),
      repatriationDate: v.optional(v.string()),
      repatriationReason: v.optional(v.string()),
      returnStatus: v.optional(returnStatusValidator),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.24 candidateExpenses                                               */
    /* -------------------------------------------------------------------- */
    candidateExpenses: defineTable({
      agencyId: v.id("agencies"),
      candidateId: v.id("candidates"),
      jobOrderId: v.optional(v.id("jobOrders")),
      expenseType: expenseTypeValidator,
      description: v.string(),
      amount: v.number(),
      currency: currencyValidator,
      paidBy: paidByValidator,
      receiptUrl: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
      createdBy: v.id("users"),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.24b fees — placement fees earned from Saudi employers              */
    /* -------------------------------------------------------------------- */
    fees: defineTable({
      agencyId: v.id("agencies"),
      candidateId: v.id("candidates"),
      clientId: v.optional(v.id("clients")),
      amount: v.number(),
      currency: currencyValidator,
      status: feeStatusValidator,
      arrangedAt: v.number(),
      dueAt: v.optional(v.number()),
      paidAt: v.optional(v.number()),
      notes: v.optional(v.string()),
    })
      .index("by_agency", ["agencyId"])
      .index("by_candidate", ["candidateId"])
      .index("by_status", ["status"]),

    /* -------------------------------------------------------------------- */
    /* 3.25 communicationTemplates + communicationLogs                      */
    /* -------------------------------------------------------------------- */
    communicationTemplates: defineTable({
      agencyId: v.id("agencies"),
      name: v.string(),
      subject: v.optional(v.string()),
      body: v.string(),
      channel: channelValidator,
      type: commTypeValidator,
      variables: v.optional(v.array(v.string())),
      createdAt: v.number(),
      createdBy: v.id("users"),
      isActive: v.boolean(),
    }),

    communicationLogs: defineTable({
      agencyId: v.id("agencies"),
      templateId: v.optional(v.id("communicationTemplates")),
      channel: channelValidator,
      recipientType: recipientTypeValidator,
      recipientCount: v.number(),
      subject: v.optional(v.string()),
      body: v.string(),
      status: commLogStatusValidator,
      failureCount: v.optional(v.number()),
      sentAt: v.number(),
      sentBy: v.id("users"),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.26 softDeletes                                                     */
    /* -------------------------------------------------------------------- */
    softDeletes: defineTable({
      agencyId: v.optional(v.id("agencies")),
      tableName: v.string(),
      recordId: v.string(),
      recordData: v.string(),
      deletedBy: v.id("users"),
      deletedAt: v.number(),
      expiresAt: v.number(),
      restoredAt: v.optional(v.number()),
      restoredBy: v.optional(v.id("users")),
    }),

    /* -------------------------------------------------------------------- */
    /* 3.27 candidateExtra — admission form data                            */
    /* -------------------------------------------------------------------- */
    candidateExtra: defineTable({
      candidateId: v.id("candidates"),
      placeOfBirth: v.optional(v.string()),
      religion: v.optional(v.string()),
      phone2: v.optional(v.string()),
      subcity: v.optional(v.string()),
      kebele: v.optional(v.string()),
      woreda: v.optional(v.string()),
      experienceAbroad: v.optional(v.string()),
      hasContactInDestination: v.optional(v.boolean()),
      maritalStatus: v.optional(maritalStatusValidator),
      childrenCount: v.optional(v.number()),
      childrenNames: v.optional(v.array(v.string())),
      emergencyName: v.optional(v.string()),
      emergencyPhone: v.optional(v.string()),
      emergencyRelation: v.optional(v.string()),
      motherName: v.optional(v.string()),
      declarationSigned: v.optional(v.boolean()),
      declarationDate: v.optional(v.string()),
      cancellationDate: v.optional(v.string()),
      documentsReturned: v.optional(v.boolean()),
    }),
  },
  {
    /* Per project README: keep schemaValidation false — validators are
       enforced through typing and mutation args; legacy rows predating the
       new 27-table schema must not block deploys. */
    schemaValidation: false,
  },
);

export default schema;

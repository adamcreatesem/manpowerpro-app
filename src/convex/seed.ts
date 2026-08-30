import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { roleValidator } from "./schema";
import { requireUser } from "./helpers";
import { statusFromPipeline } from "./pipeline";
import type { Doc, Id } from "./_generated/dataModel";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
/** ISO date N days from NOW — used for expiries that demo the deadlines board. */
const iso = (offsetDays: number) =>
  new Date(NOW + offsetDays * DAY).toISOString().slice(0, 10);

/* -------------------------------------------------------------------------- */
/* Plans — single source of truth for pricing                                 */
/* -------------------------------------------------------------------------- */

const PLANS = [
  {
    tier: "free" as const,
    name: "Free",
    description: "For new agencies getting started on the pipeline.",
    priceMonthly: 0,
    priceYearly: 0,
    maxStaff: 1,
    maxCandidates: 50,
    maxClients: 5,
    features: [
      "1 staff member",
      "Up to 50 candidates",
      "Up to 5 clients",
      "Core 13-stage pipeline",
      "Candidate portal",
    ],
  },
  {
    tier: "starter" as const,
    name: "Starter",
    description: "For growing offices with a small team.",
    priceMonthly: 2999,
    priceYearly: 29990,
    maxStaff: 10,
    maxCandidates: 500,
    maxClients: 50,
    features: [
      "Up to 10 staff members",
      "Up to 500 candidates",
      "Up to 50 clients",
      "Procedures & checklists",
      "Documents & audit trail",
    ],
  },
  {
    tier: "growth" as const,
    name: "Growth",
    description: "For active agencies moving hundreds of workers a year.",
    priceMonthly: 7999,
    priceYearly: 79990,
    maxStaff: 50,
    maxCandidates: 2500,
    maxClients: 200,
    features: [
      "Up to 50 staff members",
      "Up to 2,500 candidates",
      "Up to 200 clients",
      "Integrations (Musaned, Wafid, E-LMIS)",
      "Performance analytics",
      "Priority support",
    ],
  },
  {
    tier: "enterprise" as const,
    name: "Enterprise",
    description: "For large agencies and multi-office operations.",
    priceMonthly: 19999,
    priceYearly: 199990,
    maxStaff: 500,
    maxCandidates: 100000,
    maxClients: 1000,
    features: [
      "Unlimited staff & candidates",
      "Up to 1,000 clients",
      "All integrations & API",
      "Dedicated account manager",
      "Custom onboarding",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Partners (Saudi side)                                                      */
/* -------------------------------------------------------------------------- */

const PARTNERS = [
  {
    name: "AL-MA CO.",
    code: "ALMA",
    country: "Saudi Arabia",
    contactPerson: "Fahad Al-Mawarid",
    phone: "+966 55 402 7711",
    email: "ops@almawarid.sa",
    saudiLicenseNumber: "HR-2019-88412",
  },
  {
    name: "AL-MA WASATAH",
    code: "ALMAW",
    country: "Saudi Arabia",
    contactPerson: "Khalid Al-Shehri",
    phone: "+966 54 118 2290",
    email: "wasatah@almawarid.sa",
    saudiLicenseNumber: "HR-2021-33041",
  },
  {
    name: "JU CO.",
    code: "JUCO",
    country: "Saudi Arabia",
    contactPerson: "Jussur Emdad",
    phone: "+966 53 774 0091",
    email: "hr@jussuremdad.sa",
    saudiLicenseNumber: "HR-2020-55903",
  },
];

/* -------------------------------------------------------------------------- */
/* Job orders (Saudi employers)                                               */
/* -------------------------------------------------------------------------- */

const JOB_ORDERS = [
  {
    title: "Household domestic workers — Riyadh",
    position: "Domestic worker",
    quantity: 12,
    filled: 4,
    status: "in_progress" as const,
    location: "Riyadh",
    salary: "SAR 1,400–1,700 / mo",
    genderRequirement: "female" as const,
    contractDuration: "2 years",
  },
  {
    title: "Drivers — Riyadh fleet",
    position: "Driver",
    quantity: 6,
    filled: 3,
    status: "open" as const,
    location: "Riyadh",
    salary: "SAR 1,800 / mo",
    genderRequirement: "male" as const,
    contractDuration: "2 years",
  },
  {
    title: "Nannies — Jeddah households",
    position: "Nanny",
    quantity: 8,
    filled: 2,
    status: "in_progress" as const,
    location: "Jeddah",
    salary: "SAR 1,500 / mo",
    genderRequirement: "female" as const,
    contractDuration: "2 years",
  },
];

/* -------------------------------------------------------------------------- */
/* Candidates — real pipeline sheet values                                    */
/* -------------------------------------------------------------------------- */

type CandidateSeed = {
  firstName: string;
  lastName: string;
  gender: "female" | "male";
  dateOfBirth: string;
  phone: string;
  region: string;
  occupation: string;
  passportNumber: string;
  portalPin?: string;
  documents?: "AVAILABLE" | "WITHDRAWN" | "TAKEN FOR MEDICAL";
  musStat?:
    | "AVAILABLE"
    | "EMPLOYEE"
    | "PROCESSING"
    | "HELD"
    | "NEW"
    | "DELETED"
    | "CONTRACT CANCELED"
    | "REQUEST CANCELATION";
  lmisStat?: "IMPORTED" | "ISSUED" | "OFFLINE" | "PMNT PAID" | "HELD" | "DELETED";
  medical?:
    | "FIT"
    | "UNFIT"
    | "EXPIRED"
    | "IN-PROGRESS"
    | "SLIP ISSUED"
    | "TAKEN SLIP";
  wakalah?: "PAID" | "REQUESTED";
  visaStatus?:
    | "VISA ISSUED"
    | "EXPIRED"
    | "TASHEER"
    | "EMBASSY"
    | "RETURNED FROM EMBASSY"
    | "PROCESSING"
    | "REJECTED"
    | "REQUEST CANCELATION"
    | "VISA CANCELED";
  training?: "ATTENDED" | "PASS" | "FAIL" | "RETEST";
  bookedFor?: string;
  flightStat?: "DEPARTED" | "BOOKED" | "PENDING" | "CANCELED" | "DELAYED" | "ARRIVED";
  pro?: string;
  laborId?: string;
  musanedId?: string;
  medicalExpiryDate?: string;
  insuranceExpiryDate?: string;
  tasheerAppointmentDate?: string;
  contractAgeDays?: number;
  stageAgeDays?: number;
  deployedAt?: number;
  notes?: string;
};

const CANDIDATES: CandidateSeed[] = [
  { firstName: "Selam", lastName: "Tadesse", gender: "female", dateOfBirth: "1998-04-12", phone: "+251 91 204 5561", region: "Addis Ababa", occupation: "Domestic worker", passportNumber: "EP1000001", documents: "AVAILABLE", musStat: "NEW", notes: "Documents at Reception, awaiting SN." },
  { firstName: "Hiwot", lastName: "Alemu", gender: "female", dateOfBirth: "1999-11-02", phone: "+251 92 334 4556", region: "Oromia · Adama", occupation: "Maid", passportNumber: "EP1000002", documents: "AVAILABLE", musStat: "AVAILABLE", musanedId: "MUS-2026-1102-441", notes: "Uploaded to Musaned, open for recruitment." },
  { firstName: "Bethlehem", lastName: "Girma", gender: "female", dateOfBirth: "1997-06-23", phone: "+251 93 445 5667", region: "Amhara · Bahir Dar", occupation: "Nanny", passportNumber: "EP1000003", documents: "AVAILABLE", musStat: "AVAILABLE", musanedId: "MUS-2026-1144-552" },
  { firstName: "Mahlet", lastName: "Tesfaye", gender: "female", dateOfBirth: "2000-01-30", phone: "+251 94 556 6778", region: "SNNPR · Hawassa", occupation: "Housekeeper", passportNumber: "EP1000004", documents: "AVAILABLE", musStat: "PROCESSING", musanedId: "MUS-2026-1190-663" },
  { firstName: "Tigist", lastName: "Bekele", gender: "female", dateOfBirth: "1996-09-14", phone: "+251 95 667 7889", region: "Sidama · Hawassa", occupation: "Cook", passportNumber: "EP1000005", documents: "AVAILABLE", musStat: "HELD", notes: "Held by another office — cannot upload yet." },
  { firstName: "Meron", lastName: "Abebe", gender: "female", dateOfBirth: "1998-03-08", phone: "+251 96 778 8990", region: "Addis Ababa", occupation: "Domestic worker", passportNumber: "EP1000006", documents: "AVAILABLE", notes: "Identity filled, passport in file." },
  { firstName: "Genet", lastName: "Haile", gender: "female", dateOfBirth: "1997-12-05", phone: "+251 97 889 9001", region: "Amhara · Debre Markos", occupation: "Nanny", passportNumber: "EP1000007", documents: "AVAILABLE" },
  { firstName: "Sara", lastName: "Kebede", gender: "female", dateOfBirth: "1995-05-27", phone: "+251 99 101 1223", region: "Tigray · Mekelle", occupation: "Housekeeper", passportNumber: "EP1000008" },
  { firstName: "Rahel", lastName: "Mamo", gender: "female", dateOfBirth: "2000-08-11", phone: "+251 90 212 2334", region: "Addis Ababa", occupation: "Domestic worker", passportNumber: "EP1000009" },
  { firstName: "Dawit", lastName: "Mekonnen", gender: "male", dateOfBirth: "1994-02-02", phone: "+251 91 323 3445", region: "Addis Ababa", occupation: "Driver", passportNumber: "EP1000010", musStat: "EMPLOYEE", pro: "AL-MA CO.", musanedId: "MUS-2026-1203-771", contractAgeDays: 6, notes: "Fresh EMPLOYEE — E-PRO paperwork started." },
  { firstName: "Yonas", lastName: "Hailemariam", gender: "male", dateOfBirth: "1993-10-17", phone: "+251 92 434 4556", region: "Oromia · Adama", occupation: "Gardener", passportNumber: "EP1000011", musStat: "EMPLOYEE", lmisStat: "IMPORTED", laborId: "LMIS-ET-22014", pro: "AL-MA CO.", musanedId: "MUS-2026-1208-782", contractAgeDays: 22 },
  { firstName: "Lidya", lastName: "Asrat", gender: "female", dateOfBirth: "1999-03-19", phone: "+251 93 545 6567", region: "Amhara · Gondar", occupation: "Maid", passportNumber: "EP1000012", musStat: "EMPLOYEE", lmisStat: "PMNT PAID", laborId: "LMIS-ET-22107", pro: "AL-MA WASATAH", musanedId: "MUS-2026-1211-793", contractAgeDays: 18 },
  { firstName: "Samuel", lastName: "Desta", gender: "male", dateOfBirth: "1992-07-04", phone: "+251 94 656 7678", region: "Oromia · Jimma", occupation: "Driver", passportNumber: "EP1000013", musStat: "EMPLOYEE", medical: "IN-PROGRESS", pro: "JU CO.", musanedId: "MUS-2026-1216-804", contractAgeDays: 12, stageAgeDays: 4 },
  { firstName: "Hanna", lastName: "Bekele", gender: "female", dateOfBirth: "1998-09-30", phone: "+251 95 767 8789", region: "Addis Ababa", occupation: "Nanny", passportNumber: "EP1000014", musStat: "EMPLOYEE", medical: "SLIP ISSUED", pro: "AL-MA CO.", musanedId: "MUS-2026-1220-815", contractAgeDays: 14, stageAgeDays: 6 },
  { firstName: "Kalkidan", lastName: "Yohannes", gender: "female", dateOfBirth: "1997-01-11", phone: "+251 96 878 9890", region: "SNNPR · Arba Minch", occupation: "Housekeeper", passportNumber: "EP1000015", musStat: "EMPLOYEE", medical: "TAKEN SLIP", pro: "AL-MA CO.", musanedId: "MUS-2026-1225-826", contractAgeDays: 16, stageAgeDays: 7 },
  { firstName: "Abebe", lastName: "Worku", gender: "male", dateOfBirth: "1991-11-23", phone: "+251 97 989 0901", region: "Amhara · Dessie", occupation: "Driver", passportNumber: "EP1000016", musStat: "EMPLOYEE", medical: "FIT", medicalExpiryDate: "2027-02-14", pro: "AL-MA CO.", musanedId: "MUS-2026-1231-837", contractAgeDays: 19, stageAgeDays: 3, notes: "Medical FIT — waiting for PRO to arrange wakalah." },
  { firstName: "Mulu", lastName: "Ayele", gender: "female", dateOfBirth: "1996-05-15", phone: "+251 98 090 1012", region: "Oromia · Bishoftu", occupation: "Maid", passportNumber: "EP1000017", musStat: "EMPLOYEE", medical: "FIT", medicalExpiryDate: "2027-02-20", pro: "AL-MA WASATAH", musanedId: "MUS-2026-1236-848", contractAgeDays: 17, stageAgeDays: 5 },
  { firstName: "Aster", lastName: "Negash", gender: "female", dateOfBirth: "1999-08-02", phone: "+251 99 101 1123", region: "Tigray · Adigrat", occupation: "Domestic worker", passportNumber: "EP1000018", musStat: "EMPLOYEE", medical: "FIT", pro: "JU CO.", musanedId: "MUS-2026-1240-859", contractAgeDays: 15, stageAgeDays: 2 },
  { firstName: "Tamirat", lastName: "Fikre", gender: "male", dateOfBirth: "1990-12-08", phone: "+251 90 212 2234", region: "Addis Ababa", occupation: "Driver", passportNumber: "EP1000019", portalPin: "123456", musStat: "EMPLOYEE", medical: "FIT", wakalah: "REQUESTED", pro: "AL-MA CO.", musanedId: "MUS-2026-1244-860", contractAgeDays: 21, stageAgeDays: 4, notes: "Wakalah requested — chasing the PRO." },
  { firstName: "Meseret", lastName: "Lemma", gender: "female", dateOfBirth: "1997-04-26", phone: "+251 91 323 3345", region: "Amhara · Woldia", occupation: "Nanny", passportNumber: "EP1000020", musStat: "EMPLOYEE", medical: "FIT", wakalah: "REQUESTED", pro: "AL-MA CO.", musanedId: "MUS-2026-1251-871", contractAgeDays: 20, stageAgeDays: 3 },
  { firstName: "Wubshet", lastName: "Taye", gender: "male", dateOfBirth: "1993-06-17", phone: "+251 92 434 4456", region: "Oromia · Nekemte", occupation: "Gardener", passportNumber: "EP1000021", musStat: "EMPLOYEE", medical: "FIT", wakalah: "REQUESTED", pro: "AL-MA WASATAH", musanedId: "MUS-2026-1255-882", contractAgeDays: 19, stageAgeDays: 2 },
  { firstName: "Kidist", lastName: "Mengistu", gender: "female", dateOfBirth: "1998-10-09", phone: "+251 93 545 5567", region: "Addis Ababa", occupation: "Housekeeper", passportNumber: "EP1000022", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", pro: "AL-MA CO.", musanedId: "MUS-2026-1260-893", contractAgeDays: 24, stageAgeDays: 5 },
  { firstName: "Fikru", lastName: "Assefa", gender: "male", dateOfBirth: "1992-02-28", phone: "+251 94 656 6678", region: "SNNPR · Sodo", occupation: "Driver", passportNumber: "EP1000023", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", pro: "AL-MA CO.", musanedId: "MUS-2026-1266-904", contractAgeDays: 23, stageAgeDays: 4 },
  { firstName: "Tirunesh", lastName: "Alemu", gender: "female", dateOfBirth: "1996-07-21", phone: "+251 95 767 7789", region: "Amhara · Bahir Dar", occupation: "Maid", passportNumber: "EP1000024", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", pro: "JU CO.", musanedId: "MUS-2026-1270-915", contractAgeDays: 22, stageAgeDays: 3 },
  { firstName: "Daniel", lastName: "Kassa", gender: "male", dateOfBirth: "1991-03-05", phone: "+251 96 878 8890", region: "Addis Ababa", occupation: "Driver", passportNumber: "EP1000025", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "TASHEER", tasheerAppointmentDate: "2026-08-12", pro: "AL-MA CO.", musanedId: "MUS-2026-1275-926", contractAgeDays: 26, stageAgeDays: 6 },
  { firstName: "Ruth", lastName: "Girma", gender: "female", dateOfBirth: "1999-12-13", phone: "+251 97 989 9901", region: "Oromia · Adama", occupation: "Nanny", passportNumber: "EP1000026", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "EMBASSY", pro: "AL-MA CO.", musanedId: "MUS-2026-1280-937", contractAgeDays: 28, stageAgeDays: 9 },
  { firstName: "Bekele", lastName: "Tadesse", gender: "male", dateOfBirth: "1990-09-09", phone: "+251 98 090 1012", region: "Amhara · Gondar", occupation: "Gardener", passportNumber: "EP1000027", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "EMBASSY", pro: "AL-MA WASATAH", musanedId: "MUS-2026-1284-948", contractAgeDays: 27, stageAgeDays: 11 },
  { firstName: "Selamawit", lastName: "Haile", gender: "female", dateOfBirth: "1997-02-27", phone: "+251 99 101 1123", region: "Addis Ababa", occupation: "Housekeeper", passportNumber: "EP1000028", musStat: "EMPLOYEE", medical: "FIT", medicalExpiryDate: iso(18), wakalah: "PAID", visaStatus: "PROCESSING", pro: "JU CO.", musanedId: "MUS-2026-1289-959", contractAgeDays: 25, stageAgeDays: 8 },
  { firstName: "Natnael", lastName: "Belay", gender: "male", dateOfBirth: "1994-08-14", phone: "+251 90 212 2234", region: "Tigray · Mekelle", occupation: "Driver", passportNumber: "EP1000029", portalPin: "123456", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "VISA ISSUED", pro: "AL-MA CO.", musanedId: "MUS-2026-1294-960", contractAgeDays: 30, stageAgeDays: 7 },
  { firstName: "Zewditu", lastName: "Hailu", gender: "female", dateOfBirth: "1998-01-25", phone: "+251 91 323 3345", region: "Oromia · Jimma", occupation: "Maid", passportNumber: "EP1000030", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "VISA ISSUED", pro: "AL-MA CO.", musanedId: "MUS-2026-1299-971", contractAgeDays: 31, stageAgeDays: 5 },
  { firstName: "Eyob", lastName: "Tesfaye", gender: "male", dateOfBirth: "1992-05-30", phone: "+251 92 434 4456", region: "Addis Ababa", occupation: "Gardener", passportNumber: "EP1000031", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "VISA ISSUED", training: "ATTENDED", pro: "AL-MA CO.", musanedId: "MUS-2026-1304-982", contractAgeDays: 32, stageAgeDays: 6 },
  { firstName: "Tsion", lastName: "Abebe", gender: "female", dateOfBirth: "1996-11-07", phone: "+251 93 545 5567", region: "Amhara · Debre Birhan", occupation: "Nanny", passportNumber: "EP1000032", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "VISA ISSUED", training: "PASS", bookedFor: "2026-08-19", pro: "AL-MA CO.", musanedId: "MUS-2026-1309-993", contractAgeDays: 33, stageAgeDays: 4 },
  { firstName: "Muluken", lastName: "Getahun", gender: "male", dateOfBirth: "1991-10-19", phone: "+251 94 656 6678", region: "SNNPR · Hawassa", occupation: "Driver", passportNumber: "EP1000033", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "VISA ISSUED", training: "PASS", bookedFor: "2026-08-21", pro: "AL-MA CO.", musanedId: "MUS-2026-1314-004", contractAgeDays: 34, stageAgeDays: 3 },
  { firstName: "Rediet", lastName: "Wolde", gender: "female", dateOfBirth: "1999-06-01", phone: "+251 95 767 7789", region: "Addis Ababa", occupation: "Housekeeper", passportNumber: "EP1000034", musStat: "EMPLOYEE", medical: "FIT", wakalah: "PAID", visaStatus: "VISA ISSUED", training: "PASS", bookedFor: "2026-08-18", flightStat: "BOOKED", pro: "AL-MA WASATAH", musanedId: "MUS-2026-1319-015", contractAgeDays: 35, stageAgeDays: 2 },
  { firstName: "Getachew", lastName: "Mamo", gender: "male", dateOfBirth: "1993-03-22", phone: "+251 96 878 8890", region: "Oromia · Adama", occupation: "Gardener", passportNumber: "EP1000035", musStat: "EMPLOYEE", medical: "FIT", insuranceExpiryDate: iso(12), visaStatus: "VISA ISSUED", training: "PASS", bookedFor: "2026-07-28", flightStat: "DEPARTED", pro: "AL-MA CO.", musanedId: "MUS-2026-1324-026", contractAgeDays: 40, stageAgeDays: 8, deployedAt: NOW - 8 * DAY, notes: "Departed with wakalah still empty — anomaly." },
  { firstName: "Eyerusalem", lastName: "Desta", gender: "female", dateOfBirth: "1997-09-03", phone: "+251 97 989 9901", region: "Addis Ababa", occupation: "Domestic worker", passportNumber: "EP1000036", musStat: "EMPLOYEE", medical: "FIT", insuranceExpiryDate: iso(3), wakalah: "PAID", visaStatus: "VISA ISSUED", training: "PASS", bookedFor: "2026-07-25", flightStat: "DEPARTED", pro: "AL-MA CO.", musanedId: "MUS-2026-1329-037", contractAgeDays: 41, stageAgeDays: 11, deployedAt: NOW - 11 * DAY },
  { firstName: "Abel", lastName: "Teshome", gender: "male", dateOfBirth: "1992-12-11", phone: "+251 98 090 1012", region: "Amhara · Bahir Dar", occupation: "Driver", passportNumber: "EP1000037", musStat: "EMPLOYEE", medical: "FIT", insuranceExpiryDate: iso(-2), wakalah: "PAID", visaStatus: "VISA ISSUED", training: "PASS", bookedFor: "2026-07-22", flightStat: "DEPARTED", pro: "JU CO.", musanedId: "MUS-2026-1334-048", contractAgeDays: 43, stageAgeDays: 14, deployedAt: NOW - 14 * DAY },
  { firstName: "Birtukan", lastName: "Fikadu", gender: "female", dateOfBirth: "1998-04-08", phone: "+251 99 101 1123", region: "Oromia · Bishoftu", occupation: "Maid", passportNumber: "EP1000038", musStat: "REQUEST CANCELATION", medical: "FIT", pro: "AL-MA CO.", musanedId: "MUS-2026-1339-059", contractAgeDays: 24, stageAgeDays: 6, notes: "Cancellation requested but not confirmed — still tracked." },
  { firstName: "Solomon", lastName: "Mengistu", gender: "male", dateOfBirth: "1990-07-16", phone: "+251 90 212 2234", region: "Addis Ababa", occupation: "Driver", passportNumber: "EP1000039", musStat: "DELETED", wakalah: "PAID", pro: "AL-MA CO.", musanedId: "MUS-2026-1344-060", contractAgeDays: 52, stageAgeDays: 10, notes: "Deleted from Musaned but wakalah already paid — lost money anomaly." },
  { firstName: "Hana", lastName: "Gebre", gender: "female", dateOfBirth: "1996-02-19", phone: "+251 91 323 3345", region: "Tigray · Adigrat", occupation: "Domestic worker", passportNumber: "EP1000040", documents: "WITHDRAWN", musStat: "EMPLOYEE", medical: "FIT", medicalExpiryDate: iso(-5), pro: "AL-MA WASATAH", musanedId: "MUS-2026-1349-071", contractAgeDays: 30, stageAgeDays: 9, notes: "Documents withdrawn but medical FIT — anomaly." },
];

/* -------------------------------------------------------------------------- */
/* Procedure templates — mirror the real flow                                  */
/* -------------------------------------------------------------------------- */

const TEMPLATES = [
  { name: "SN & Registration", category: "documentation" as const, order: 1, isRequired: true, estimatedDays: 2 },
  { name: "Musaned Upload", category: "documentation" as const, order: 2, isRequired: true, estimatedDays: 3 },
  { name: "Contract Signing (E-PRO)", category: "contract" as const, order: 3, isRequired: true, estimatedDays: 5 },
  { name: "Medical Slip Issue", category: "medical" as const, order: 4, isRequired: true, estimatedDays: 2 },
  { name: "Wakalah Request", category: "contract" as const, order: 5, isRequired: true, estimatedDays: 3 },
  { name: "LMIS Import", category: "documentation" as const, order: 6, isRequired: true, estimatedDays: 3 },
  { name: "E-PRO Approval", category: "contract" as const, order: 7, isRequired: true, estimatedDays: 4 },
  { name: "Tasheer Biometrics", category: "visa" as const, order: 8, isRequired: true, estimatedDays: 5 },
  { name: "Embassy Submission", category: "visa" as const, order: 9, isRequired: true, estimatedDays: 7 },
  { name: "Pre-Departure Training", category: "training" as const, order: 10, isRequired: true, estimatedDays: 2 },
  { name: "Flight Booking", category: "travel" as const, order: 11, isRequired: true, estimatedDays: 3 },
];

/* -------------------------------------------------------------------------- */
/* All tables, for the reset wipe                                              */
/* -------------------------------------------------------------------------- */

const ALL_TABLES = [
  "candidates",
  "departures",
  "activities",
  "auditLogs",
  "clientMessages",
  "candidateMessages",
  "documents",
  "visaApplications",
  "candidateProcedures",
  "procedureTemplates",
  "staffTasks",
  "staffMetrics",
  "medicalExams",
  "trainingCertifications",
  "postDeployment",
  "candidateExpenses",
  "fees",
  "communicationLogs",
  "communicationTemplates",
  "agencyNotes",
  "candidateExtra",
  "paymentReceipts",
  "subscriptions",
  "clients",
  "jobOrders",
  "partnerAgencies",
  "integrationSyncs",
  "integrationCredentials",
  "softDeletes",
  "agencies",
  "subscriptionPlans",
  "announcements",
  "users",
  "authAccounts",
  "authSessions",
  "authVerificationCodes",
] as const;

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

/** Wipes every table. Dev-only — guarded by DISABLE_DEV_BYPASS in prod. */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.DISABLE_DEV_BYPASS === "true") {
      throw new Error("Resetting is disabled in this deployment");
    }
    let wiped = 0;
    for (const table of ALL_TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) {
        await ctx.db.delete(r._id);
        wiped += 1;
      }
    }
    return { wiped };
  },
});

/** Loads the full demo dataset. Run once from the CLI: npx convex run seed:run */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.DISABLE_DEV_BYPASS === "true") {
      throw new Error("Seeding is disabled in this deployment");
    }

    for (const table of ALL_TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }

    /* plans */
    const planIds: Id<"subscriptionPlans">[] = [];
    for (const p of PLANS) {
      planIds.push(await ctx.db.insert("subscriptionPlans", { ...p, isActive: true }));
    }

    /* agency */
    const agencyId = await ctx.db.insert("agencies", {
      name: "Tahlia Foreign Employment Agency",
      code: "TAHLIA01",
      address: "Bole Road, Addis Ababa, Ethiopia",
      phone: "+251 11 662 3087",
      isActive: true,
      country: "Ethiopia",
      licenseNumber: "FEA-LIC-2019-00417",
      licenseExpiry: "2027-11-30",
      bankGuarantee: "CBE BG-8831-22",
      molsRegistrationDate: "2019-06-14",
      molsRegistrationNumber: "MOLS-ET-0117",
      website: "https://tahliafea.com",
      contactEmail: "adamdiditfirst@gmail.com",
    });

    /* partners */
    const partnerIds: Id<"partnerAgencies">[] = [];
    for (const p of PARTNERS) {
      partnerIds.push(
        await ctx.db.insert("partnerAgencies", {
          name: p.name,
          code: p.code,
          country: p.country,
          contactPerson: p.contactPerson,
          email: p.email,
          phone: p.phone,
          isActive: true,
          saudiLicenseNumber: p.saudiLicenseNumber,
        }),
      );
    }

    /* client (Saudi employer) */
    const clientId = await ctx.db.insert("clients", {
      agencyId,
      name: "Al Rajhi Family Services",
      contactPerson: "Fahad Al-Rajhi",
      email: "fahad@alrajhi.sa",
      phone: "+966 55 402 7711",
      industry: "Domestic services",
      address: "Riyadh, Saudi Arabia",
      isActive: true,
      leadSource: "Referral",
      leadStatus: "won",
      nitaqatColor: "green",
      slaTimelineDays: 45,
      paymentTerms: "Net 30 after arrival",
    });

    /* users — super admin, staff, and the client contact */
    const userSeeds: {
      name: string;
      email: string;
      role: "super_admin" | "agency_owner" | "agency_manager" | "agency_staff" | "client";
      agencyId?: Id<"agencies">;
      clientId?: Id<"clients">;
    }[] = [
      { name: "Platform Admin", email: "super@manpowerpro.com", role: "super_admin" },
      { name: "Meron Tesfaye", email: "owner@manpowerpro.com", role: "agency_owner", agencyId },
      { name: "Biruk Lemma", email: "manager@manpowerpro.com", role: "agency_manager", agencyId },
      { name: "Hanna Wondimu", email: "staff@manpowerpro.com", role: "agency_staff", agencyId },
      { name: "Fahad Al-Rajhi", email: "fahad@alrajhi.sa", role: "client", agencyId, clientId },
    ];
    const userIds: Id<"users">[] = [];
    for (const u of userSeeds) {
      const id = await ctx.db.insert("users", {
        name: u.name,
        email: u.email,
        role: u.role,
        agencyId: u.agencyId,
        clientId: u.clientId,
        isActive: true,
      });
      userIds.push(id);
    }
    const ownerUserId = userIds[1];

    /* subscription on the growth plan */
    await ctx.db.insert("subscriptions", {
      agencyId,
      planId: planIds[2],
      status: "active",
      currentPeriodStart: NOW - 12 * DAY,
      currentPeriodEnd: NOW + 18 * DAY,
      cancelAtPeriodEnd: false,
      seatCount: 4,
      paymentVerified: true,
      paymentVerifiedAt: NOW - 12 * DAY,
    });

    /* job orders — spread across the Saudi intermediaries */
    const jobOrderIds: Id<"jobOrders">[] = [];
    for (const o of JOB_ORDERS) {
      jobOrderIds.push(
        await ctx.db.insert("jobOrders", {
          agencyId,
          clientId,
          partnerAgencyId:
            partnerIds[JOB_ORDERS.indexOf(o) % partnerIds.length],
          title: o.title,
          position: o.position,
          quantity: o.quantity,
          filled: o.filled,
          location: o.location,
          salary: o.salary,
          status: o.status,
          genderRequirement: o.genderRequirement,
          contractDuration: o.contractDuration,
          interviewRequired: true,
        }),
      );
    }

    /* candidates */
    const candidateIds: Id<"candidates">[] = [];
    const departuresToCreate: {
      candidateIndex: number;
      flightNumber: string;
      departureDate: number;
      destination: string;
      status: "scheduled" | "confirmed" | "departed";
    }[] = [];

    const jobOrderFor = (c: CandidateSeed): Id<"jobOrders"> | undefined => {
      const occ = c.occupation.toLowerCase();
      if (occ.includes("driver") || occ.includes("gardener")) return jobOrderIds[1];
      if (occ.includes("nanny")) return jobOrderIds[2];
      return jobOrderIds[0];
    };

    for (const c of CANDIDATES) {
      const contractCreatedAt = c.contractAgeDays ? NOW - c.contractAgeDays * DAY : undefined;
      const lastStatusChangeAt = c.stageAgeDays
        ? NOW - c.stageAgeDays * DAY
        : contractCreatedAt ?? NOW;
      const id = await ctx.db.insert("candidates", {
        agencyId,
        jobOrderId: jobOrderFor(c),
        firstName: c.firstName,
        lastName: c.lastName,
        dateOfBirth: c.dateOfBirth,
        nationality: "Ethiopian",
        passportNumber: c.passportNumber,
        phone: c.phone,
        notes: c.notes,
        gender: c.gender,
        occupation: c.occupation,
        region: c.region,
        assignedStaffId: userIds[1 + ((c.contractAgeDays ?? 4) % 3)],
        currentStatus: statusFromPipeline(c),
        documents: c.documents,
        musStat: c.musStat,
        lmisStat: c.lmisStat,
        medical: c.medical,
        wakalah: c.wakalah,
        visaStatus: c.visaStatus,
        training: c.training,
        bookedFor: c.bookedFor,
        flightStat: c.flightStat,
        pro: c.pro,
        laborId: c.laborId,
        musanedId: c.musanedId,
        medicalExpiryDate: c.medicalExpiryDate,
        insuranceExpiryDate: c.insuranceExpiryDate,
        tasheerAppointmentDate: c.tasheerAppointmentDate,
        contractCreatedAt,
        deployedAt: c.deployedAt,
        lastStatusChangeAt,
        lastUpdatedBy: ownerUserId,
        portalPin: c.portalPin,
        skills: ["Housekeeping", "Childcare"].slice(0, c.contractAgeDays ? 2 : 1),
        professionalSummary: `${c.occupation} seeking placement in Saudi Arabia.`,
      });
      candidateIds.push(id);

      await ctx.db.insert("activities", {
        agencyId,
        candidateId: id,
        userId: ownerUserId,
        action: "file_opened",
        description: `File opened for ${c.firstName} ${c.lastName}`,
        createdAt: NOW - (c.contractAgeDays ?? 4) * DAY,
      });

      if (c.flightStat === "DEPARTED" || c.bookedFor) {
        departuresToCreate.push({
          candidateIndex: candidateIds.length - 1,
          flightNumber: c.flightStat === "DEPARTED" ? "ET 480" : "ET 452",
          departureDate: c.deployedAt ?? new Date(`${c.bookedFor}T00:00:00`).getTime(),
          destination: "Riyadh",
          status: c.flightStat === "DEPARTED" ? "departed" : "confirmed",
        });
      }
    }

    for (const d of departuresToCreate) {
      await ctx.db.insert("departures", {
        agencyId,
        candidateId: candidateIds[d.candidateIndex],
        flightNumber: d.flightNumber,
        departureDate: d.departureDate,
        destination: d.destination,
        status: d.status,
      });
    }

    /* staff activity trail — updates logged by the manager & staff desks on
       their own files, so the performance report shows real per-person work */
    for (let i = 0; i < CANDIDATES.length; i++) {
      const c = CANDIDATES[i];
      const staffIdx = 1 + ((c.contractAgeDays ?? 4) % 3);
      if (staffIdx === 1) continue; // owner already logs file_opened per file
      const assignedUserId = userIds[staffIdx];
      const when = c.stageAgeDays
        ? NOW - Math.max(2, c.stageAgeDays - 1) * DAY
        : NOW - 3 * DAY;
      await ctx.db.insert("activities", {
        agencyId,
        candidateId: candidateIds[i],
        userId: assignedUserId,
        action: "candidate_updated",
        description: `Updated sheet values for ${c.firstName} ${c.lastName}`,
        createdAt: when,
      });
      if (i % 3 === 0) {
        await ctx.db.insert("activities", {
          agencyId,
          candidateId: candidateIds[i],
          userId: assignedUserId,
          action: "stage_advanced",
          description: `Moved ${c.firstName} ${c.lastName} to the next desk`,
          createdAt: Math.max(when - DAY, NOW - 60 * DAY),
        });
      }
    }

    /* documents — the file checklist each candidate carries */
    let docCount = 0;
    const addDocument = async (
      idx: number,
      type: string,
      name: string,
      status: "pending" | "uploaded" | "verified",
    ) => {
      await ctx.db.insert("documents", {
        agencyId,
        candidateId: candidateIds[idx],
        name,
        type,
        status,
        uploadedBy: ownerUserId,
      });
      docCount += 1;
    };
    for (let i = 0; i < CANDIDATES.length; i++) {
      const c = CANDIDATES[i];
      if (c.documents === "WITHDRAWN") continue;
      const contracted = c.musStat === "EMPLOYEE";
      if (c.passportNumber) {
        await addDocument(
          i,
          "passport",
          `Passport ${c.passportNumber}`,
          contracted ? "verified" : "uploaded",
        );
      }
      if (c.documents === "AVAILABLE") {
        await addDocument(i, "photos", "Passport photos", "uploaded");
        await addDocument(
          i,
          "certificates",
          "Education & work certificates",
          contracted ? "verified" : "uploaded",
        );
        await addDocument(i, "admission", "Admission form & declaration", "verified");
      }
      if (c.medical) {
        await addDocument(
          i,
          "medical",
          `Medical exam — ${c.medical}`,
          c.medical === "FIT" ? "verified" : "uploaded",
        );
      }
      if (contracted && c.pro) {
        await addDocument(i, "contract", `Contract via ${c.pro}`, "verified");
      }
      if (c.wakalah === "PAID") {
        await addDocument(i, "wakalah", "Wakalah payment receipt", "verified");
      }
      if (c.visaStatus) {
        await addDocument(
          i,
          "visa",
          `Visa documents — ${c.visaStatus}`,
          c.visaStatus === "VISA ISSUED" ? "verified" : "uploaded",
        );
      }
      if (c.training) {
        await addDocument(
          i,
          "training",
          "Pre-departure training certificate",
          c.training === "PASS" ? "verified" : "uploaded",
        );
      }
      if (c.flightStat === "BOOKED" || c.flightStat === "DEPARTED") {
        await addDocument(i, "ticket", "Flight ticket — Addis Ababa to Riyadh", "verified");
      }
    }

    /* visa applications — issued visas with validity windows + in-flight
       records (MOFA refs, biometrics, embassy references) for the visa desk */
    let visaAppCount = 0;
    const VISA_APPS = [
      { idx: 28, visaNumber: "KSA-2026-88412", expiry: iso(10) },
      { idx: 29, visaNumber: "KSA-2026-88905", expiry: iso(25) },
      { idx: 31, visaNumber: "KSA-2026-89118", expiry: iso(-1) },
    ];
    for (const va of VISA_APPS) {
      const c = CANDIDATES[va.idx];
      await ctx.db.insert("visaApplications", {
        candidateId: candidateIds[va.idx],
        country: "Saudi Arabia",
        visaType: "Employment — domestic worker",
        status: "issued",
        visaNumber: va.visaNumber,
        visaIssueDate: iso(-30),
        expiryDate: va.expiry,
        embassyName: "Saudi Embassy Addis Ababa",
        professionOnVisa: c.occupation,
        sponsoringCompany: "Al Rajhi Family Services",
        applicationDate: NOW - 45 * DAY,
        approvalDate: NOW - 32 * DAY,
      });
      visaAppCount += 1;
    }

    /* In-flight applications — files sitting in the visa stages. Each carries
       the references the desk tracks day to day. */
    const VISA_IN_FLIGHT = [
      {
        idx: 24,
        status: "submitted" as const,
        mofaRefNumber: "MOFA-2026-44711",
        tasheerAppointmentId: "TAS-88214",
        biometricStatus: "pending" as const,
        submittedDate: NOW - 6 * DAY,
        applicationDate: NOW - 6 * DAY,
      },
      {
        idx: 25,
        status: "processing" as const,
        mofaRefNumber: "MOFA-2026-45107",
        tasheerAppointmentId: "TAS-88341",
        biometricStatus: "completed" as const,
        embassyReference: "EMB-ADD-2026-118",
        submittedDate: NOW - 9 * DAY,
        applicationDate: NOW - 9 * DAY,
      },
      {
        idx: 26,
        status: "processing" as const,
        mofaRefNumber: "MOFA-2026-45208",
        tasheerAppointmentId: "TAS-88402",
        biometricStatus: "completed" as const,
        embassyReference: "EMB-ADD-2026-121",
        submittedDate: NOW - 11 * DAY,
        applicationDate: NOW - 11 * DAY,
      },
      {
        idx: 27,
        status: "processing" as const,
        mofaRefNumber: "MOFA-2026-45530",
        submittedDate: NOW - 8 * DAY,
        applicationDate: NOW - 8 * DAY,
      },
    ];
    for (const va of VISA_IN_FLIGHT) {
      const c = CANDIDATES[va.idx];
      await ctx.db.insert("visaApplications", {
        candidateId: candidateIds[va.idx],
        country: "Saudi Arabia",
        visaType: "Employment — domestic worker",
        status: va.status,
        mofaRefNumber: va.mofaRefNumber,
        tasheerAppointmentId: va.tasheerAppointmentId,
        biometricStatus: va.biometricStatus,
        embassyReference: va.embassyReference,
        submittedDate: va.submittedDate,
        applicationDate: va.applicationDate,
        professionOnVisa: c.occupation,
        sponsoringCompany: "Al Rajhi Family Services",
      });
      visaAppCount += 1;
    }

    /* pre-departure training certifications — one per trained candidate */
    let trainingCount = 0;
    const TRAINING_CERTS = [
      { idx: 30, status: "attended" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 12, daysAgo: 6 },
      { idx: 31, status: "passed" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 16, daysAgo: 7 },
      { idx: 32, status: "passed" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 16, daysAgo: 8 },
      { idx: 33, status: "passed" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 16, daysAgo: 5 },
      { idx: 34, status: "passed" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 16, daysAgo: 12 },
      { idx: 35, status: "passed" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 16, daysAgo: 13 },
      { idx: 36, status: "passed" as const, courseName: "Pre-departure orientation", centerName: "Addis Ababa Training Centre", trainerName: "Dr. Sara Lemma", totalHours: 16, daysAgo: 16 },
    ];
    for (const t of TRAINING_CERTS) {
      const end = NOW - t.daysAgo * DAY;
      const start = end - 2 * DAY;
      await ctx.db.insert("trainingCertifications", {
        candidateId: candidateIds[t.idx],
        courseName: t.courseName,
        centerName: t.centerName,
        trainerName: t.trainerName,
        startDate: new Date(start).toISOString().slice(0, 10),
        endDate: new Date(end).toISOString().slice(0, 10),
        totalHours: t.totalHours,
        trainingType: "predeparture",
        certificateNumber: `PDT-2026-${String(300 + t.idx)}`,
        certificateIssueDate: new Date(end).toISOString().slice(0, 10),
        status: t.status,
        createdAt: end,
      });
      trainingCount += 1;
    }

    /* post-deployment — after-arrival tracking for departed candidates */
    let aftercareCount = 0;
    const AFTERCARE = [
      {
        idx: 34,
        arrivalConfirmationDate: iso(-7),
        employerName: "Al Rajhi Family Services",
        employerFeedback: "Satisfied with the worker so far.",
        firstMonthCheckDate: iso(23),
        salaryStartDate: iso(-6),
        firstSalaryReceived: true,
        firstSalaryDate: iso(20),
        grievanceReported: false,
        returnStatus: "on_site" as const,
      },
      {
        idx: 35,
        arrivalConfirmationDate: iso(-10),
        employerName: "Al Rajhi Family Services",
        employerFeedback: "Worker arrived, waiting on first-month feedback.",
        firstMonthCheckDate: iso(20),
        salaryStartDate: iso(-9),
        firstSalaryReceived: false,
        grievanceReported: true,
        grievanceDescription: "First salary not yet transferred — follow up with the sponsor.",
        grievanceResolved: false,
        returnStatus: "on_site" as const,
        notes: "Monthly salary SAR 1,500 due on the 25th.",
      },
      {
        idx: 36,
        arrivalConfirmationDate: iso(-13),
        employerName: "Al Rajhi Family Services",
        employerFeedback: "Contract ended early at the employer's request.",
        firstSalaryReceived: true,
        firstSalaryDate: iso(-2),
        grievanceReported: false,
        contractCompletionDate: iso(-1),
        contractRenewed: false,
        repatriationDate: iso(2),
        repatriationReason: "Employer ended contract early — repatriation arranged.",
        returnStatus: "early_return" as const,
        notes: "Returning via Riyadh — ticket ET 481.",
      },
    ];
    for (const pd of AFTERCARE) {
      await ctx.db.insert("postDeployment", {
        candidateId: candidateIds[pd.idx],
        arrivalConfirmationDate: pd.arrivalConfirmationDate,
        employerName: pd.employerName,
        employerFeedback: pd.employerFeedback,
        firstMonthCheckDate: pd.firstMonthCheckDate,
        salaryStartDate: pd.salaryStartDate,
        firstSalaryReceived: pd.firstSalaryReceived,
        firstSalaryDate: pd.firstSalaryDate,
        grievanceReported: pd.grievanceReported,
        grievanceDescription: pd.grievanceDescription,
        grievanceResolved: pd.grievanceResolved,
        contractCompletionDate: pd.contractCompletionDate,
        contractRenewed: pd.contractRenewed,
        repatriationDate: pd.repatriationDate,
        repatriationReason: pd.repatriationReason,
        returnStatus: pd.returnStatus,
        notes: pd.notes,
        createdAt: NOW - 10 * DAY,
        updatedAt: NOW - 5 * DAY,
      });
      aftercareCount += 1;
    }

    /* placement fees — one per contracted candidate, SAR, paid after arrival */
    const FEE_AMOUNT_SAR = 6500;
    let feeCount = 0;
    for (let i = 0; i < CANDIDATES.length; i++) {
      const c = CANDIDATES[i];
      if (c.musStat !== "EMPLOYEE") continue;
      const departed = c.flightStat === "DEPARTED";
      const arrangedAt =
        c.contractAgeDays && c.contractAgeDays > 0
          ? NOW - c.contractAgeDays * DAY
          : NOW - 4 * DAY;
      await ctx.db.insert("fees", {
        agencyId,
        candidateId: candidateIds[i],
        clientId,
        amount: FEE_AMOUNT_SAR,
        currency: "SAR",
        status: departed ? "paid" : "arranged",
        arrangedAt,
        dueAt: departed ? undefined : arrangedAt + 21 * DAY,
        paidAt: departed && c.deployedAt ? c.deployedAt + 3 * DAY : undefined,
        notes: departed ? "Fee received after arrival" : undefined,
      });
      feeCount += 1;
    }

    /* candidate expenses — costs per placement */
    let expenseCount = 0;
    const addExpense = async (
      idx: number,
      expenseType: "medical" | "visa" | "training" | "travel" | "documentation" | "insurance" | "accommodation" | "other",
      description: string,
      amount: number,
      currency: "ETB" | "SAR" | "USD",
      paidBy: "candidate" | "employer" | "agency",
      daysAgo: number,
    ) => {
      await ctx.db.insert("candidateExpenses", {
        agencyId,
        candidateId: candidateIds[idx],
        expenseType,
        description,
        amount,
        currency,
        paidBy,
        createdAt: NOW - daysAgo * DAY,
        createdBy: ownerUserId,
      });
      expenseCount += 1;
    };

    for (let i = 0; i < CANDIDATES.length; i++) {
      const c = CANDIDATES[i];
      const days = c.stageAgeDays ?? (c.contractAgeDays ?? 3);
      const when = Math.max(1, days || 3);

      if (c.documents === "AVAILABLE") {
        await addExpense(i, "documentation", "Passport copies & document processing", 850, "ETB", "candidate", when + 2);
      }
      if (c.medical) {
        await addExpense(i, "medical", "Medical examination — approved clinic", 5400, "ETB", "agency", when);
      }
      if (c.wakalah === "PAID") {
        await addExpense(i, "visa", "Wakalah (sponsorship transfer) fee", 1200, "SAR", "employer", when - 1);
      }
      if (c.visaStatus) {
        await addExpense(i, "visa", "Tasheer biometrics & visa filing", 650, "SAR", "agency", when - 2);
      }
      if (c.training) {
        await addExpense(i, "training", "Pre-departure training session", 1800, "ETB", "agency", when - 1);
      }
      if (c.flightStat === "BOOKED" || c.flightStat === "DEPARTED") {
        await addExpense(i, "travel", "Flight ticket — Addis Ababa to Riyadh", 42000, "ETB", "agency", when - 1);
      }
      if (c.flightStat === "DEPARTED") {
        await addExpense(i, "insurance", "Work placement insurance (1 yr)", 320, "SAR", "employer", when - 1);
      }
    }

    /* staff tasks — the daily records the desks keep, assigned across the team */
    const TASK_SEEDS = [
      { title: "Issue medical certificate to PRO", department: "info_desk" as const, priority: "high" as const, candidateIndex: 15, dueInDays: 0, userIndex: 3 },
      { title: "Confirm wakalah payment from AL-MA CO.", department: "data_entry" as const, priority: "high" as const, candidateIndex: 18, dueInDays: 0, userIndex: 2 },
      { title: "Send wakalah invoice to employer", department: "info_desk" as const, priority: "medium" as const, candidateIndex: 19, dueInDays: 1, userIndex: 3 },
      { title: "Verify LMIS payment reflects in E-LMIS", department: "data_entry" as const, priority: "medium" as const, candidateIndex: 11, dueInDays: 2, userIndex: 2, completed: true },
      { title: "Book Tasheer biometrics appointment", department: "document_control" as const, priority: "high" as const, candidateIndex: 24, dueInDays: 0, userIndex: 3 },
      { title: "Book flight for visa-issued candidate", department: "document_control" as const, priority: "medium" as const, candidateIndex: 28, dueInDays: 3, userIndex: 2 },
      { title: "Confirm pre-departure training attendance", department: "data_entry" as const, priority: "low" as const, candidateIndex: 31, dueInDays: 4, userIndex: 3, completed: true },
      { title: "Reconcile weekly fee log", department: "data_entry" as const, priority: "medium" as const, candidateIndex: undefined, dueInDays: -1, userIndex: 2 },
    ];
    let taskCount = 0;
    for (const t of TASK_SEEDS) {
      const completed = t.completed === true;
      await ctx.db.insert("staffTasks", {
        agencyId,
        userId: userIds[t.userIndex],
        department: t.department,
        title: t.title,
        priority: t.priority,
        status: completed ? "completed" : t.dueInDays < 0 ? "in_progress" : "pending",
        relatedCandidateId:
          t.candidateIndex === undefined ? undefined : candidateIds[t.candidateIndex],
        dueDate: NOW + t.dueInDays * DAY,
        completedAt: completed ? NOW - DAY : undefined,
        createdAt: NOW - 2 * DAY,
      });
      taskCount += 1;
    }

    /* staffMetrics — weekly performance rows per office user */
    let metricCount = 0;
    const METRIC_SEEDS = [
      { userIndex: 1, totalActions: 96, candidatesCreated: 12, statusChanges: 40, proceduresCompleted: 18, documentsProcessed: 30, candidatesAssigned: 13, candidatesDeployed: 3, conversionRate: 0.23, avgStatusChangeTime: 4.2, rejectionRate: 0.05 },
      { userIndex: 2, totalActions: 142, candidatesCreated: 16, statusChanges: 61, proceduresCompleted: 25, documentsProcessed: 44, candidatesAssigned: 14, candidatesDeployed: 4, conversionRate: 0.29, avgStatusChangeTime: 3.1, rejectionRate: 0.04 },
      { userIndex: 3, totalActions: 118, candidatesCreated: 12, statusChanges: 48, proceduresCompleted: 31, documentsProcessed: 52, candidatesAssigned: 13, candidatesDeployed: 3, conversionRate: 0.23, avgStatusChangeTime: 2.8, rejectionRate: 0.03 },
    ];
    for (const m of METRIC_SEEDS) {
      await ctx.db.insert("staffMetrics", {
        agencyId,
        userId: userIds[m.userIndex],
        periodStart: NOW - 7 * DAY,
        periodEnd: NOW,
        totalActions: m.totalActions,
        candidatesCreated: m.candidatesCreated,
        statusChanges: m.statusChanges,
        proceduresCompleted: m.proceduresCompleted,
        documentsProcessed: m.documentsProcessed,
        candidatesAssigned: m.candidatesAssigned,
        candidatesDeployed: m.candidatesDeployed,
        conversionRate: m.conversionRate,
        avgStatusChangeTime: m.avgStatusChangeTime,
        rejectionRate: m.rejectionRate,
      });
      metricCount += 1;
    }

    /* procedure templates */
    for (const t of TEMPLATES) {
      await ctx.db.insert("procedureTemplates", { ...t, agencyId });
    }

    /* announcements */
    await ctx.db.insert("announcements", {
      title: "Musaned maintenance window",
      message:
        "The Musaned portal will be offline Saturday 02:00–05:00 KSA. Uploads scheduled in that window will queue automatically.",
      type: "maintenance",
      startsAt: NOW,
      expiresAt: NOW + 10 * DAY,
      isActive: true,
      createdBy: ownerUserId,
      createdAt: NOW - DAY,
    });
    await ctx.db.insert("announcements", {
      title: "Wakalah backlog — chase PROs",
      message:
        "Info Desk: four files are ready for wakalah with the employer unpaid. Chase before Friday.",
      type: "warning",
      startsAt: NOW,
      expiresAt: NOW + 7 * DAY,
      isActive: true,
      createdBy: ownerUserId,
      createdAt: NOW - 2 * DAY,
    });

    return {
      seeded: true,
      agencies: 1,
      clients: 1,
      jobOrders: jobOrderIds.length,
      candidates: candidateIds.length,
      fees: feeCount,
      expenses: expenseCount,
      documents: docCount,
      visaApplications: visaAppCount,
      trainingCertifications: trainingCount,
      aftercare: aftercareCount,
      tasks: taskCount,
      staffMetrics: metricCount,
      plans: planIds.length,
      partners: partnerIds.length,
      message:
        "Quick logins: owner@manpowerpro.com, manager@manpowerpro.com, staff@manpowerpro.com, super@manpowerpro.com, fahad@alrajhi.sa. Candidate portal: passport EP1000029 · PIN 123456.",
    };
  },
});

/** Quick login (dev bypass): one-click role switch for testing. Disabled by
 *  setting DISABLE_DEV_BYPASS=true on the deployment. */
export const devBypass = mutation({
  args: {
    role: v.optional(roleValidator),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    agencyId: v.optional(v.id("agencies")),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    if (process.env.DISABLE_DEV_BYPASS === "true") {
      throw new Error("Dev bypass is disabled in this deployment");
    }
    const userId = await requireUser(ctx);

    /* client quick login: auto-attach the seeded client record by email */
    let clientId = args.clientId;
    let agencyId = args.agencyId;
    if (args.role === "client" && args.email && clientId === undefined) {
      const clients = await ctx.db.query("clients").collect();
      const match = clients.find((cl) => cl.email === args.email);
      if (match) {
        clientId = match._id;
        agencyId = match.agencyId;
      }
    }

    /* office roles: attach the seeded demo agency so the app opens */
    const isOfficeRole =
      args.role === "agency_owner" ||
      args.role === "agency_manager" ||
      args.role === "agency_staff";
    if (isOfficeRole && agencyId === undefined) {
      const agencies = await ctx.db.query("agencies").collect();
      const demo = agencies.find((a) => a.code === "TAHLIA01") ?? agencies[0];
      if (demo) agencyId = demo._id;
    }

    const patch: Record<string, unknown> = {};
    if (args.role !== undefined) patch.role = args.role;
    if (args.name !== undefined) patch.name = args.name;
    if (args.email !== undefined) patch.email = args.email;
    if (agencyId !== undefined) patch.agencyId = agencyId;
    if (clientId !== undefined) patch.clientId = clientId;

    const existing = await ctx.db.get(userId);
    if (existing) {
      await ctx.db.patch(userId, patch);
    } else {
      await ctx.db.insert("users", {
        isActive: true,
        ...(args.role !== undefined ? { role: args.role } : {}),
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.email !== undefined ? { email: args.email } : {}),
        ...(agencyId !== undefined ? { agencyId } : {}),
        ...(clientId !== undefined ? { clientId } : {}),
      });
    }
    return ctx.db.get(userId);
  },
});

export type { Doc };

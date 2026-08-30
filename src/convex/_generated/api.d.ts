/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as admin from "../admin.js";
import type * as aftercare from "../aftercare.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as browse from "../browse.js";
import type * as candidatePortal from "../candidatePortal.js";
import type * as candidates from "../candidates.js";
import type * as clients from "../clients.js";
import type * as communications from "../communications.js";
import type * as dashboard from "../dashboard.js";
import type * as deadlines from "../deadlines.js";
import type * as documents from "../documents.js";
import type * as expenses from "../expenses.js";
import type * as fees from "../fees.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as partners from "../partners.js";
import type * as pipeline from "../pipeline.js";
import type * as pricing from "../pricing.js";
import type * as seed from "../seed.js";
import type * as staff from "../staff.js";
import type * as tasks from "../tasks.js";
import type * as travel from "../travel.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  admin: typeof admin;
  aftercare: typeof aftercare;
  alerts: typeof alerts;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  browse: typeof browse;
  candidatePortal: typeof candidatePortal;
  candidates: typeof candidates;
  clients: typeof clients;
  communications: typeof communications;
  dashboard: typeof dashboard;
  deadlines: typeof deadlines;
  documents: typeof documents;
  expenses: typeof expenses;
  fees: typeof fees;
  helpers: typeof helpers;
  http: typeof http;
  partners: typeof partners;
  pipeline: typeof pipeline;
  pricing: typeof pricing;
  seed: typeof seed;
  staff: typeof staff;
  tasks: typeof tasks;
  travel: typeof travel;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

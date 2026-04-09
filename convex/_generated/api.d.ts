/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLogs from "../activityLogs.js";
import type * as auth from "../auth.js";
import type * as boardInvites from "../boardInvites.js";
import type * as boardMembers from "../boardMembers.js";
import type * as boards from "../boards.js";
import type * as cardAttachments from "../cardAttachments.js";
import type * as cards from "../cards.js";
import type * as columns from "../columns.js";
import type * as helpers_boardAccess from "../helpers/boardAccess.js";
import type * as helpers_ordering from "../helpers/ordering.js";
import type * as helpers_validators from "../helpers/validators.js";
import type * as http from "../http.js";
import type * as labels from "../labels.js";
import type * as notifications from "../notifications.js";
import type * as r2 from "../r2.js";
import type * as smtp from "../smtp.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  auth: typeof auth;
  boardInvites: typeof boardInvites;
  boardMembers: typeof boardMembers;
  boards: typeof boards;
  cardAttachments: typeof cardAttachments;
  cards: typeof cards;
  columns: typeof columns;
  "helpers/boardAccess": typeof helpers_boardAccess;
  "helpers/ordering": typeof helpers_ordering;
  "helpers/validators": typeof helpers_validators;
  http: typeof http;
  labels: typeof labels;
  notifications: typeof notifications;
  r2: typeof r2;
  smtp: typeof smtp;
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

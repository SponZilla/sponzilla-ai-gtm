
import {
  z,
} from "zod";

/**
 * Supported administrative actions.
 *
 * Add new actions here only when
 * the corresponding operation exists.
 */
export const adminAuditActionSchema =
  z.enum([
    "DECISION_APPROVED",
    "DECISION_REJECTED",
    "DECISION_EXECUTION_REQUESTED",
    "DECISION_EXECUTED",
    "DECISION_EXECUTION_FAILED",
    "RECOVERY_REPORT_ACCESSED",
  ]);

/**
 * Explicit outcome values.
 */
export const adminAuditOutcomeSchema =
  z.enum([
    "SUCCESS",
    "FAILURE",
    "DENIED",
  ]);

/**
 * Allow only explicitly approved metadata.
 *
 * Arbitrary request bodies, credentials,
 * and authorization headers must never
 * be written into audit records.
 */
export const adminAuditMetadataSchema =
  z.object({
    reasonCode: z.string().max(100).optional(),

    executionStatus: z
      .enum([
        "PENDING",
        "SUCCEEDED",
        "FAILED",
      ])
      .optional(),
  }).strict();

/**
 * Internal audit event contract.
 */
export const createAdminAuditSchema =
  z.object({
    action: adminAuditActionSchema,

    resourceType: z.enum([
      "GTM_DECISION",
      "EXECUTION",
      "RECOVERY_MONITORING",
    ]),

    resourceId: z.uuid().optional(),

    actorType: z.enum([
      "INTERNAL_SERVICE",
      "USER",
    ]).default("INTERNAL_SERVICE"),

    actorId: z.string()
      .min(1)
      .max(128)
      .optional(),

    outcome: adminAuditOutcomeSchema,

    requestId: z.string()
      .min(1)
      .max(128)
      .optional(),

    metadata:
      adminAuditMetadataSchema.optional(),
  }).strict();

export type CreateAdminAuditInput =
  z.input<typeof createAdminAuditSchema>;

export type ValidatedAdminAuditInput =
  z.output<typeof createAdminAuditSchema>;

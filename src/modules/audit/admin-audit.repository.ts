
import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  prisma,
} from "../../lib/prisma.js";

import {
  createAdminAuditSchema,
  type CreateAdminAuditInput,
} from "./admin-audit.schema.js";

/**
 * Supports the application's Prisma client
 * or an existing Prisma transaction.
 *
 * Transaction clients omit certain
 * top-level Prisma methods.
 */
type AuditDatabaseClient =
  Pick<
    Prisma.TransactionClient,
    "adminAuditLog"
  >;

/**
 * Repository responsible only for
 * persisting validated audit events.
 */
export const adminAuditRepository = {
  async create(
    input: CreateAdminAuditInput,
    db: AuditDatabaseClient = prisma,
  ) {
    /*
     * Validate before touching the database.
     */
    const validated =
      createAdminAuditSchema.parse(input);

    /*
     * Construct an explicit data object.
     *
     * Do not spread arbitrary input directly
     * into Prisma's create operation.
     */
    const data: Prisma.AdminAuditLogCreateInput = {
      action: validated.action,

      resourceType: validated.resourceType,

      resourceId: validated.resourceId ?? null,

      actorType: validated.actorType,

      actorId: validated.actorId ?? null,

      outcome: validated.outcome,

      requestId: validated.requestId ?? null,

      metadata: validated.metadata
        ? validated.metadata
        : Prisma.JsonNull,
    };

    return db.adminAuditLog.create({
      data,

      /*
       * Return only fields needed for
       * confirming persistence.
       */
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        actorType: true,
        actorId: true,
        outcome: true,
        requestId: true,
        createdAt: true,
      },
    });
  },
};

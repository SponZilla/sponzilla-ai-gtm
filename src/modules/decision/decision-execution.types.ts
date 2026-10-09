import type {
  GTMActionType,
} from "../../generated/prisma/client.js";

export interface GTMActionExecutionInput {
  decisionId: string;
  approvalId: string;
  action: GTMActionType;
  actionSnapshot: unknown;
}

export interface GTMActionExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  errorMessage?: string;
}
import { z } from "zod";
import { logger } from "./logger";
import type { User } from "@shared/schema";

// Type for user data with optional reliability fields (allows null from database)
export interface UserWithReliability extends Partial<User> {
  reliabilityScore?: number | null;
  substitutionRequestCount?: number | null;
  substitutionFulfilledCount?: number | null;
  manualRemovalCount?: number | null;
  noShowCount?: number | null;
  lastReliabilityUpdate?: Date | null;
  reliabilityNotes?: string | null;
}

// Type for API error response
export interface ApiErrorResponse {
  status: number;
  message: string;
  errors?: unknown[];
}

// Type for database errors
export interface DatabaseError extends Error {
  code?: string;
}

// Strip heavy/sensitive fields from user objects for list endpoints
// imageData can be hundreds of KB per user in base64, causing massive responses
export function stripHeavyFields(user: any): any {
  const { imageData, imageContentType, passwordHash, ...rest } = user;
  return rest;
}

// 🤖 ADAPTIVE LEARNING: Sanitize user data to hide reliability metrics from ministers
// Reliability scores should ONLY be visible to coordinators/managers to avoid:
// - Competition between ministers
// - Deviation from spiritual purpose (serving God, not chasing points)
export function sanitizeUserData(user: UserWithReliability, requestingUserRole?: string): Partial<User> {
  // Always strip heavy/sensitive fields first
  const cleanUser = stripHeavyFields(user);

  // Coordinators and managers can see all data (minus heavy fields)
  if (requestingUserRole === 'coordenador' || requestingUserRole === 'gestor') {
    return cleanUser;
  }

  // Ministers should NOT see reliability metrics - remove sensitive fields
  const {
    reliabilityScore,
    substitutionRequestCount,
    substitutionFulfilledCount,
    manualRemovalCount,
    noShowCount,
    lastReliabilityUpdate,
    reliabilityNotes,
    ...sanitizedUser
  } = cleanUser;

  return sanitizedUser;
}

// Função utilitária para tratamento de erro centralizado
export function handleApiError(error: unknown, operation: string): ApiErrorResponse {
  if (error instanceof z.ZodError) {
    return {
      status: 400,
      message: `Dados inválidos para ${operation}`,
      errors: error.errors
    };
  }

  const dbError = error as DatabaseError;
  if (dbError.code === '23505') { // PostgreSQL unique violation
    return {
      status: 409,
      message: `Já existe um registro com estes dados para ${operation}`
    };
  }

  if (dbError.code === '23503') { // PostgreSQL foreign key violation
    return {
      status: 400,
      message: `Referência inválida encontrada para ${operation}`
    };
  }

  if (dbError.message && dbError.message.includes('não encontrado')) {
    return {
      status: 404,
      message: dbError.message
    };
  }

  if (dbError.message && dbError.message.includes('não autorizado')) {
    return {
      status: 403,
      message: dbError.message
    };
  }

  // Erro genérico
  logger.error(`Error in ${operation}:`, error);
  return {
    status: 500,
    message: `Erro interno do servidor durante ${operation}`
  };
}

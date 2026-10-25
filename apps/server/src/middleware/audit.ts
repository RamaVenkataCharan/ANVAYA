import { prisma, isDbConnected } from '../config/prisma';
import { inMemoryDb } from '../db/inMemoryDb';
import crypto from 'crypto';

export interface CreateAuditLogParams {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export async function recordAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    if (isDbConnected()) {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata || {},
        },
      });
    } else {
      inMemoryDb.auditLogs.unshift({
        id: crypto.randomUUID(),
        userId: params.userId || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        metadata: params.metadata || null,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    // Non-blocking error logging for audit logs to maintain service availability
    console.error('Failed to persist audit log entry:', error);
  }
}

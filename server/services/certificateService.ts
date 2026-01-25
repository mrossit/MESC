/**
 * Certificate Service for MESC Formation System
 *
 * Handles certificate issuance, validation, and retrieval.
 */

import { db } from '../db';
import {
  formationCertificates,
  formationTracks,
  formationLessons,
  formationLessonProgress,
  users,
  type FormationCertificate
} from '@shared/schema';
import { eq, and, count, sum, sql } from 'drizzle-orm';
import {
  generateCertificatePDF,
  generateCertificateNumber,
  generateVerificationCode,
  type CertificateData
} from '../utils/certificateGenerator';

export interface TrackCompletionStatus {
  trackId: string;
  trackTitle: string;
  trackCategory: 'liturgia' | 'espiritualidade' | 'pratica';
  totalLessons: number;
  completedLessons: number;
  totalDurationMinutes: number;
  isCompleted: boolean;
  completionDate?: Date;
  hasCertificate: boolean;
  certificateId?: string;
}

export interface IssueCertificateResult {
  success: boolean;
  certificate?: FormationCertificate;
  error?: string;
}

/**
 * Get track completion status for a user
 */
export async function getTrackCompletionStatus(
  userId: string,
  trackId?: string
): Promise<TrackCompletionStatus[]> {
  // Get all tracks (or specific track)
  const tracksQuery = trackId
    ? db.select().from(formationTracks).where(eq(formationTracks.id, trackId))
    : db.select().from(formationTracks).where(eq(formationTracks.isActive, true));

  const tracks = await tracksQuery;

  const results: TrackCompletionStatus[] = [];

  for (const track of tracks) {
    // Get all lessons for this track
    const lessons = await db
      .select({
        id: formationLessons.id,
        durationMinutes: formationLessons.durationMinutes
      })
      .from(formationLessons)
      .where(
        and(
          eq(formationLessons.trackId, track.id),
          eq(formationLessons.isActive, true)
        )
      );

    const lessonIds = lessons.map((l: { id: string; durationMinutes: number | null }) => l.id);
    const totalDuration = lessons.reduce((sum: number, l: { id: string; durationMinutes: number | null }) => sum + (l.durationMinutes || 0), 0);

    // Get user's completed lessons for this track
    let completedLessons = 0;
    let latestCompletionDate: Date | undefined;

    if (lessonIds.length > 0) {
      const progress = await db
        .select({
          lessonId: formationLessonProgress.lessonId,
          status: formationLessonProgress.status,
          completedAt: formationLessonProgress.completedAt
        })
        .from(formationLessonProgress)
        .where(
          and(
            eq(formationLessonProgress.userId, userId),
            sql`${formationLessonProgress.lessonId} IN (${sql.join(lessonIds.map((id: string) => sql`${id}`), sql`, `)})`
          )
        );

      for (const p of progress) {
        if (p.status === 'completed') {
          completedLessons++;
          if (p.completedAt && (!latestCompletionDate || p.completedAt > latestCompletionDate)) {
            latestCompletionDate = p.completedAt;
          }
        }
      }
    }

    const isCompleted = lessonIds.length > 0 && completedLessons === lessonIds.length;

    // Check if user already has a certificate for this track
    const existingCert = await db
      .select({ id: formationCertificates.id })
      .from(formationCertificates)
      .where(
        and(
          eq(formationCertificates.userId, userId),
          eq(formationCertificates.trackId, track.id)
        )
      )
      .limit(1);

    results.push({
      trackId: track.id,
      trackTitle: track.title,
      trackCategory: track.category as 'liturgia' | 'espiritualidade' | 'pratica',
      totalLessons: lessonIds.length,
      completedLessons,
      totalDurationMinutes: totalDuration,
      isCompleted,
      completionDate: latestCompletionDate,
      hasCertificate: existingCert.length > 0,
      certificateId: existingCert[0]?.id
    });
  }

  return results;
}

/**
 * Issue a certificate for completing a formation track
 */
export async function issueCertificate(
  userId: string,
  trackId: string,
  issuedById?: string
): Promise<IssueCertificateResult> {
  // Check completion status
  const [status] = await getTrackCompletionStatus(userId, trackId);

  if (!status) {
    return { success: false, error: 'Trilha de formacao nao encontrada' };
  }

  if (!status.isCompleted) {
    return {
      success: false,
      error: `Trilha nao concluida. Completou ${status.completedLessons} de ${status.totalLessons} licoes.`
    };
  }

  if (status.hasCertificate) {
    // Return existing certificate
    const existing = await db
      .select()
      .from(formationCertificates)
      .where(
        and(
          eq(formationCertificates.userId, userId),
          eq(formationCertificates.trackId, trackId)
        )
      )
      .limit(1);

    return { success: true, certificate: existing[0] };
  }

  // Get user details
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { success: false, error: 'Usuario nao encontrado' };
  }

  // Generate certificate number (count existing + 1)
  const [certCount] = await db
    .select({ count: count() })
    .from(formationCertificates);

  const certificateNumber = generateCertificateNumber((certCount?.count || 0) + 1);
  const verificationCode = generateVerificationCode();

  // Get completed lesson IDs for metadata
  const lessons = await db
    .select({ id: formationLessons.id })
    .from(formationLessons)
    .where(eq(formationLessons.trackId, trackId));

  const lessonIds = lessons.map((l: { id: string }) => l.id);

  const completedProgress = await db
    .select({ lessonId: formationLessonProgress.lessonId })
    .from(formationLessonProgress)
    .where(
      and(
        eq(formationLessonProgress.userId, userId),
        eq(formationLessonProgress.status, 'completed'),
        sql`${formationLessonProgress.lessonId} IN (${sql.join(lessonIds.map((id: string) => sql`${id}`), sql`, `)})`
      )
    );

  // Create certificate record
  const [certificate] = await db
    .insert(formationCertificates)
    .values({
      userId,
      trackId,
      certificateNumber,
      userName: user.name,
      trackTitle: status.trackTitle,
      trackCategory: status.trackCategory,
      totalLessons: status.totalLessons,
      totalHours: Math.ceil(status.totalDurationMinutes / 60),
      issuedBy: issuedById,
      verificationCode,
      metadata: {
        lessonsCompleted: completedProgress.map((p: { lessonId: string }) => p.lessonId),
        completionDate: status.completionDate?.toISOString() || new Date().toISOString()
      }
    })
    .returning();

  return { success: true, certificate };
}

/**
 * Generate PDF for a certificate
 */
export async function generateCertificatePDFById(certificateId: string): Promise<Buffer | null> {
  const [cert] = await db
    .select()
    .from(formationCertificates)
    .where(eq(formationCertificates.id, certificateId));

  if (!cert) {
    return null;
  }

  // Get issuer name if available
  let issuerName: string | undefined;
  if (cert.issuedBy) {
    const [issuer] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, cert.issuedBy));
    issuerName = issuer?.name;
  }

  const data: CertificateData = {
    certificateNumber: cert.certificateNumber,
    verificationCode: cert.verificationCode,
    recipientName: cert.userName,
    trackTitle: cert.trackTitle,
    trackCategory: cert.trackCategory as 'liturgia' | 'espiritualidade' | 'pratica',
    totalLessons: cert.totalLessons,
    totalHours: cert.totalHours,
    issuedAt: cert.issuedAt,
    issuedBy: issuerName,
    validUntil: cert.validUntil || undefined
  };

  return generateCertificatePDF(data);
}

/**
 * Verify a certificate by verification code
 */
export async function verifyCertificate(verificationCode: string): Promise<FormationCertificate | null> {
  const [cert] = await db
    .select()
    .from(formationCertificates)
    .where(eq(formationCertificates.verificationCode, verificationCode.toUpperCase()));

  return cert || null;
}

/**
 * Get all certificates for a user
 */
export async function getUserCertificates(userId: string): Promise<FormationCertificate[]> {
  return db
    .select()
    .from(formationCertificates)
    .where(eq(formationCertificates.userId, userId))
    .orderBy(formationCertificates.issuedAt);
}

/**
 * Get certificate by ID
 */
export async function getCertificateById(certificateId: string): Promise<FormationCertificate | null> {
  const [cert] = await db
    .select()
    .from(formationCertificates)
    .where(eq(formationCertificates.id, certificateId));

  return cert || null;
}

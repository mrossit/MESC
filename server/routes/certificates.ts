/**
 * Certificate Routes for MESC Formation System
 *
 * API endpoints for certificate management.
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../auth';
import {
  getTrackCompletionStatus,
  issueCertificate,
  generateCertificatePDFById,
  verifyCertificate,
  getUserCertificates,
  getCertificateById
} from '../services/certificateService';

const router = Router();

/**
 * GET /api/certificates/status
 * Get track completion status for current user
 */
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const trackId = req.query.trackId as string | undefined;
    const status = await getTrackCompletionStatus(userId, trackId);

    res.json(status);
  } catch (error) {
    console.error('Error getting track status:', error);
    res.status(500).json({ error: 'Erro ao obter status das trilhas' });
  }
});

/**
 * GET /api/certificates
 * Get all certificates for current user
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const certificates = await getUserCertificates(userId);
    res.json(certificates);
  } catch (error) {
    console.error('Error getting certificates:', error);
    res.status(500).json({ error: 'Erro ao obter certificados' });
  }
});

/**
 * POST /api/certificates/issue
 * Issue a certificate for a completed track
 */
router.post('/issue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario nao autenticado' });
    }

    const { trackId } = req.body;
    if (!trackId) {
      return res.status(400).json({ error: 'trackId e obrigatorio' });
    }

    const result = await issueCertificate(userId, trackId, userId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.certificate);
  } catch (error) {
    console.error('Error issuing certificate:', error);
    res.status(500).json({ error: 'Erro ao emitir certificado' });
  }
});

/**
 * GET /api/certificates/:id
 * Get certificate details by ID
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const certificate = await getCertificateById(id);

    if (!certificate) {
      return res.status(404).json({ error: 'Certificado nao encontrado' });
    }

    // Only allow user to view their own certificates (unless coordinator)
    const userRole = req.user?.role;
    if (certificate.userId !== userId && userRole !== 'coordenador' && userRole !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json(certificate);
  } catch (error) {
    console.error('Error getting certificate:', error);
    res.status(500).json({ error: 'Erro ao obter certificado' });
  }
});

/**
 * GET /api/certificates/:id/pdf
 * Download certificate as PDF
 */
router.get('/:id/pdf', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Get certificate to verify ownership
    const certificate = await getCertificateById(id);

    if (!certificate) {
      return res.status(404).json({ error: 'Certificado nao encontrado' });
    }

    // Only allow user to download their own certificates (unless coordinator)
    const userRole = req.user?.role;
    if (certificate.userId !== userId && userRole !== 'coordenador' && userRole !== 'gestor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const pdfBuffer = await generateCertificatePDFById(id);

    if (!pdfBuffer) {
      return res.status(500).json({ error: 'Erro ao gerar PDF' });
    }

    // Set response headers for PDF download
    const filename = `certificado-${certificate.certificateNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF do certificado' });
  }
});

/**
 * GET /api/certificates/verify/:code
 * Verify a certificate by verification code (public endpoint)
 */
router.get('/verify/:code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Codigo de verificacao invalido' });
    }

    const certificate = await verifyCertificate(code);

    if (!certificate) {
      return res.status(404).json({
        valid: false,
        error: 'Certificado nao encontrado'
      });
    }

    // Return limited public info for verification
    res.json({
      valid: true,
      certificate: {
        certificateNumber: certificate.certificateNumber,
        recipientName: certificate.userName,
        trackTitle: certificate.trackTitle,
        trackCategory: certificate.trackCategory,
        totalLessons: certificate.totalLessons,
        totalHours: certificate.totalHours,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: 'Erro ao verificar certificado' });
  }
});

/**
 * POST /api/certificates/issue-for-user
 * Issue certificate for another user (coordinator only)
 */
router.post('/issue-for-user', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const issuerId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== 'coordenador' && userRole !== 'gestor') {
      return res.status(403).json({ error: 'Apenas coordenadores podem emitir certificados para outros usuarios' });
    }

    const { userId, trackId } = req.body;

    if (!userId || !trackId) {
      return res.status(400).json({ error: 'userId e trackId sao obrigatorios' });
    }

    const result = await issueCertificate(userId, trackId, issuerId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result.certificate);
  } catch (error) {
    console.error('Error issuing certificate for user:', error);
    res.status(500).json({ error: 'Erro ao emitir certificado' });
  }
});

export default router;

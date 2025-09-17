import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';

const router = Router();

// Criar diretório de uploads se não existir
const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configurar multer para upload temporário
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Rota para upload de foto de perfil
router.post('/profile-photo', authenticateToken, upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;

    // Processar imagem (redimensionar e otimizar)
    const processedImageBuffer = await sharp(req.file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Converter para base64 para armazenar no banco
    const imageData = processedImageBuffer.toString('base64');
    const contentType = 'image/jpeg';
    
    // Atualizar dados da imagem no banco de dados
    const photoUrl = `/api/users/${userId}/photo`;
    
    if (db) {
      await db.update(users)
        .set({ 
          photoUrl: photoUrl,
          imageData: imageData,
          imageContentType: contentType
        })
        .where(eq(users.id, userId));
    }

    res.json({ 
      success: true, 
      photoUrl,
      message: 'Profile photo uploaded successfully' 
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Rota para remover foto de perfil
router.delete('/profile-photo', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Limpar campos de imagem no banco de dados
    await db.update(users)
      .set({ 
        photoUrl: null,
        imageData: null,
        imageContentType: null
      })
      .where(eq(users.id, userId));

    res.json({ 
      success: true, 
      message: 'Profile photo removed successfully' 
    });
  } catch (error) {
    console.error('Error removing profile photo:', error);
    res.status(500).json({ error: 'Failed to remove profile photo' });
  }
});

export default router;
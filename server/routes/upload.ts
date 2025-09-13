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
    const fileExtension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const fileName = `${userId}_${Date.now()}${fileExtension}`;
    const filePath = path.join(uploadsDir, fileName);

    // Processar imagem (redimensionar e otimizar)
    await sharp(req.file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toFile(filePath);

    // Atualizar URL da foto no banco de dados
    const photoUrl = `/uploads/profiles/${fileName}`;
    
    if (db) {
      await db.update(users)
        .set({ 
          photoUrl: photoUrl
        })
        .where(eq(users.id, userId));
    }

    // Remover foto antiga se existir
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.photoUrl && user.photoUrl !== photoUrl) {
      const oldPath = path.join(process.cwd(), user.photoUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
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

    // Obter usuário atual
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (user?.photoUrl) {
      // Remover arquivo físico
      const photoPath = path.join(process.cwd(), user.photoUrl);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }

      // Limpar campo no banco de dados
      await db.update(users)
        .set({ 
          photoUrl: null
        })
        .where(eq(users.id, userId));
    }

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
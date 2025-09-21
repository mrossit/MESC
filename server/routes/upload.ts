import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken, AuthRequest } from '../auth';

const router = Router();

// Note: Fotos são armazenadas no banco de dados como base64, não em arquivos

// Configurar multer para upload temporário
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Aceitar apenas imagens específicas
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos (JPEG, PNG, WebP, HEIC)'));
    }
  },
});

// Middleware para tratar erros do Multer
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    console.error('Multer error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'A imagem deve ter no máximo 5MB' });
    }
    
    if (err.message && err.message.includes('Apenas arquivos de imagem são permitidos')) {
      return res.status(400).json({ error: 'Apenas arquivos de imagem são permitidos (JPEG, PNG, WebP, HEIC)' });
    }
    
    if (err.message && err.message.includes('Only image files are allowed')) {
      return res.status(400).json({ error: 'Apenas arquivos de imagem são permitidos (JPEG, PNG, WebP, HEIC)' });
    }
    
    // Erro genérico do multer
    return res.status(400).json({ error: 'Erro no upload do arquivo. Verifique o formato e tamanho da imagem.' });
  }
  
  next();
};

// Rota para upload de foto de perfil
router.post('/profile-photo', authenticateToken, upload.single('photo'), handleMulterError, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo foi enviado' });
    }

    const userId = req.user!.id;

    // Verificar se o arquivo é uma imagem válida
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Arquivo corrompido ou vazio' });
    }

    // Processar imagem (redimensionar e otimizar)
    // rotate() sem parâmetros aplica automaticamente a rotação baseada nos dados EXIF
    const processedImageBuffer = await sharp(req.file.buffer)
      .rotate() // Correção automática da orientação baseada no EXIF
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Verificar se o processamento foi bem-sucedido
    if (!processedImageBuffer || processedImageBuffer.length === 0) {
      return res.status(400).json({ error: 'Erro ao processar imagem. Tente uma imagem diferente.' });
    }

    // Converter para base64 para armazenar no banco
    const imageData = processedImageBuffer.toString('base64');
    const contentType = 'image/jpeg';
    
    // Atualizar dados da imagem no banco de dados
    const photoUrl = `/api/users/${userId}/photo`;
    
    if (!db) {
      return res.status(500).json({ error: 'Erro interno: banco de dados não disponível' });
    }

    await db.update(users)
      .set({ 
        photoUrl: photoUrl,
        imageData: imageData,
        imageContentType: contentType
      })
      .where(eq(users.id, userId));

    res.json({ 
      success: true, 
      photoUrl,
      message: 'Foto de perfil atualizada com sucesso!' 
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    
    // Dar feedback mais específico baseado no tipo de erro
    if (error instanceof Error) {
      if (error.message.includes('Input file is missing')) {
        return res.status(400).json({ error: 'Arquivo de imagem inválido ou corrompido' });
      }
      if (error.message.includes('Input file contains unsupported image format')) {
        return res.status(400).json({ error: 'Formato de imagem não suportado. Use JPEG, PNG, WebP ou HEIC.' });
      }
      if (error.message.includes('Apenas arquivos de imagem são permitidos')) {
        return res.status(400).json({ error: 'Apenas arquivos de imagem são permitidos (JPEG, PNG, WebP, HEIC)' });
      }
    }
    
    res.status(500).json({ error: 'Erro interno ao processar a foto. Tente novamente.' });
  }
});

// Rota para remover foto de perfil
router.delete('/profile-photo', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    if (!db) {
      return res.status(500).json({ error: 'Erro interno: banco de dados não disponível' });
    }

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
      message: 'Foto de perfil removida com sucesso!' 
    });
  } catch (error) {
    console.error('Error removing profile photo:', error);
    res.status(500).json({ error: 'Erro interno ao remover a foto. Tente novamente.' });
  }
});

export default router;
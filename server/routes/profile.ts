import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authenticateToken } from '../auth';
import { storage } from '../storage';

const router = Router();

// Middleware para autenticação
router.use(authenticateToken);

// Obter perfil do usuário atual
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    // Usar storage em memória
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Atualizar perfil do usuário
router.put('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    
    const schema = z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      ministryStartDate: z.string().optional(),
      baptismDate: z.string().nullable().optional(),
      confirmationDate: z.string().nullable().optional(),
      marriageDate: z.string().nullable().optional(),
      maritalStatus: z.string().optional()
    });
    
    const data = schema.parse(req.body);
    
    // Atualizar no banco de dados
    const updatedUser = await storage.updateUser(userId, data);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload de foto de perfil (rota movida para /api/upload/profile-photo)
// Esta rota permanece aqui apenas para compatibilidade
router.post('/photo', async (req, res) => {
  return res.status(301).json({ 
    error: 'This endpoint has been moved to /api/upload/profile-photo',
    newEndpoint: '/api/upload/profile-photo'
  });
});

// Obter familiares do usuário
// TODO: Implementar funcionalidade de familiares no storage
router.get('/family', async (req: AuthRequest, res) => {
  try {
    // const userId = req.user!.id;
    // const familyMembers = await storage.getFamilyMembers(userId);
    return res.json([]);
  } catch (error) {
    console.error('Error fetching family:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Adicionar familiar
// TODO: Implementar funcionalidade de familiares no storage
router.post('/family', async (req: AuthRequest, res) => {
  try {
    // const userId = req.user!.id;
    
    const schema = z.object({
      relatedUserId: z.string(),
      relationshipType: z.string()
    });
    
    const { relatedUserId, relationshipType } = schema.parse(req.body);
    
    // Validar que não está adicionando a si mesmo
    // if (relatedUserId === userId) {
    //   return res.status(400).json({ error: 'Cannot add yourself as a family member' });
    // }
    
    // Adicionar no banco de dados
    // const relationship = await storage.addFamilyMember(userId, relatedUserId, relationshipType);
    
    // Buscar informações do usuário relacionado
    // const relatedUser = await storage.getUser(relatedUserId);
    
    return res.status(501).json({ 
      error: 'Family functionality not implemented yet'
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).json({ error: 'Failed to add family member' });
  }
});

// Remover familiar
// TODO: Implementar funcionalidade de familiares no storage
router.delete('/family/:id', async (req: AuthRequest, res) => {
  try {
    // const { id } = req.params;
    // const success = await storage.removeFamilyMember(id);
    
    return res.status(501).json({ error: 'Family functionality not implemented yet' });
  } catch (error) {
    console.error('Error removing family member:', error);
    res.status(500).json({ error: 'Failed to remove family member' });
  }
});

// Esta rota foi movida para routes.ts principal
// router.get('/users/active', ...)

export default router;
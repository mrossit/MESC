import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware';
import { storage } from '../db-config';

const router = Router();

// Middleware para autenticação
router.use(requireAuth);

// Obter perfil do usuário atual
router.get('/', async (req, res) => {
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
router.put('/', async (req, res) => {
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
router.get('/family', async (req, res) => {
  try {
    const userId = req.user!.id;
    const familyMembers = await storage.getFamilyMembers(userId);
    return res.json(familyMembers);
  } catch (error) {
    console.error('Error fetching family:', error);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// Adicionar familiar
router.post('/family', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const schema = z.object({
      relatedUserId: z.string(),
      relationshipType: z.string()
    });
    
    const { relatedUserId, relationshipType } = schema.parse(req.body);
    
    // Validar que não está adicionando a si mesmo
    if (relatedUserId === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a family member' });
    }
    
    // Adicionar no banco de dados
    const relationship = await storage.addFamilyMember(userId, relatedUserId, relationshipType);
    
    // Buscar informações do usuário relacionado
    const relatedUser = await storage.getUser(relatedUserId);
    
    return res.json({ 
      message: 'Family member added successfully',
      id: relationship.id,
      relatedUserId: relationship.relatedUserId,
      relationshipType: relationship.relationshipType,
      relatedUser: relatedUser ? {
        id: relatedUser.id,
        name: relatedUser.name,
        email: relatedUser.email,
        profilePhoto: relatedUser.profilePhoto
      } : null
    });
  } catch (error) {
    console.error('Error adding family member:', error);
    if (error instanceof Error && error.message === 'Relationship already exists') {
      return res.status(400).json({ error: 'This family relationship already exists' });
    }
    res.status(500).json({ error: 'Failed to add family member' });
  }
});

// Remover familiar
router.delete('/family/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await storage.removeFamilyMember(id);
    
    if (success) {
      return res.json({ message: 'Family member removed successfully' });
    } else {
      return res.status(404).json({ error: 'Family relationship not found' });
    }
  } catch (error) {
    console.error('Error removing family member:', error);
    res.status(500).json({ error: 'Failed to remove family member' });
  }
});

// Esta rota foi movida para routes.ts principal
// router.get('/users/active', ...)

export default router;
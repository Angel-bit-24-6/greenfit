import { Router } from 'express';
// import { ChatController } from '../controllers/chatController';

const router = Router();

// TODO: Implementar chat en Phase 6
// POST /api/chat - Process chat message
// GET /api/chat/:userId/history - Get chat history

// Placeholder para Phase 1
router.get('/health', (req, res) => {
  res.json({ message: 'Chat routes ready for implementation' });
});

export default router;
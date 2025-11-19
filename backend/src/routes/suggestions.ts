import { Router } from 'express';
// import { SuggestionController } from '../controllers/suggestionController';

const router = Router();

// TODO: Implementar sugerencias en Phase 6
// POST /api/suggestions - Create suggestion
// GET /api/suggestions/pending - Get pending suggestions (admin)
// POST /api/admin/suggestions/:id/approve - Approve suggestion
// POST /api/admin/suggestions/:id/reject - Reject suggestion

// Placeholder para Phase 1
router.get('/health', (req, res) => {
  res.json({ message: 'Suggestions routes ready for implementation' });
});

export default router;
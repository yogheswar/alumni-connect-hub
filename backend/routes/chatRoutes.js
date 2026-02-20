import express from 'express';
import { protect } from '../middleware/auth.js';
import {
    sendMessage,
    generateRoadmap,
    getChatHistory,
    clearChatHistory
} from '../controllers/chatController.js';

const router = express.Router();

// All routes are protected (user must be logged in)
router.use(protect);

// ── Chat endpoints ─────────────────────────────────────────────────────────────
router.post('/message', sendMessage);      // Send a chat message → AI response
router.post('/roadmap', generateRoadmap);  // Generate AI career roadmap
router.get('/history', getChatHistory);   // Fetch chat history
router.delete('/history', clearChatHistory); // Clear chat history

export default router;

import express from 'express';
import {
    getStudentsForMentorship,
    getMyMentorshipRequests,
    getIncomingMentorshipRequests,
    createMentorshipRequest,
    updateMentorshipRequest,
    getStudentById
} from '../controllers/mentorshipController.js';
import {
    getChatMessages,
    sendChatMessage,
    getUnreadCount,
    getUserChats,
    generateDomainRoadmap
} from '../controllers/mentorshipChatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all verified students with GitHub profiles
router.get('/students', getStudentsForMentorship);

// Get student by ID
router.get('/students/:id', getStudentById);

// Get incoming mentorship requests (student-initiated)
router.get('/requests/incoming', getIncomingMentorshipRequests);

// Get my mentorship requests (as alumni or student)
router.get('/requests', getMyMentorshipRequests);

// Create mentorship request
router.post('/request', createMentorshipRequest);

// Update mentorship request status
router.patch('/requests/:id', updateMentorshipRequest);

// Chat endpoints
router.get('/chats', getUserChats);
router.get('/chat/unread/count', getUnreadCount);
router.get('/chat/:mentorshipId', getChatMessages);
router.post('/chat/:mentorshipId', sendChatMessage);

// AI Domain Roadmap + Quiz  →  POST /api/mentorship/chat/:mentorshipId/domain-roadmap
router.post('/chat/:mentorshipId/domain-roadmap', generateDomainRoadmap);

export default router;


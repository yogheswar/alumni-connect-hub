import MentorshipChat from '../models/MentorshipChat.js';
import MentorshipRequest from '../models/MentorshipRequest.js';
import Connection from '../models/Connection.js';

const AI_API_BASE = 'http://localhost:8000';

// =============================================================================
//  AI DOMAIN ROADMAP + QUIZ
// =============================================================================

/**
 * POST /api/mentorship/chat/:mentorshipId/domain-roadmap
 * Generates a domain-specific roadmap + quiz via Python AI.
 * Called when student accepts the mentorship connection.
 */
export const generateDomainRoadmap = async (req, res) => {
    try {
        const { mentorshipId } = req.params;
        const userId = req.user._id;

        // ── 1. Try MentorshipRequest first ───────────────────────────────────
        let mentorship = await MentorshipRequest.findById(mentorshipId)
            .populate('student', 'name interests skills')
            .populate('alumni', 'name expertise currentPosition')
            .lean();

        let domain = 'Software Engineering';
        let studentName = 'Student';
        let mentorName = 'Mentor';
        let isAuthorized = false;

        if (mentorship) {
            // Authorisation check — must be the student or alumni in this request
            const isStudent = mentorship.student?._id?.toString() === userId.toString();
            const isAlumni = mentorship.alumni?._id?.toString() === userId.toString();
            if (!isStudent && !isAlumni) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }

            domain = mentorship.domain || 'Software Engineering';
            studentName = mentorship.student?.name || 'Student';
            mentorName = mentorship.alumni?.name || 'Mentor';
            isAuthorized = true;
        } else {
            // ── 2. Fall back to Connection model ─────────────────────────────
            const connection = await Connection.findById(mentorshipId)
                .populate('student', 'name interests skills projectDomains')
                .populate('alumni', 'name expertise currentPosition skills')
                .lean();

            if (!connection) {
                return res.status(404).json({
                    success: false,
                    message: 'Mentorship or connection not found'
                });
            }

            // Authorisation check
            const isStudent = connection.student?._id?.toString() === userId.toString();
            const isAlumni = connection.alumni?._id?.toString() === userId.toString();
            if (!isStudent && !isAlumni) {
                return res.status(403).json({ success: false, message: 'Not authorized' });
            }

            // Derive domain from connection data
            domain = req.body?.domain ||
                connection.studentInterests?.[0] ||
                connection.student?.interests?.[0] ||
                connection.student?.projectDomains?.[0] ||
                connection.alumni?.expertise?.[0] ||
                connection.alumni?.currentPosition ||
                'Software Engineering';

            studentName = connection.student?.name || 'Student';
            mentorName = connection.alumni?.name || 'Mentor';
            isAuthorized = true;
        }

        console.log(`[generateDomainRoadmap] mentorshipId=${mentorshipId} domain="${domain}" student="${studentName}" mentor="${mentorName}"`);

        // ── 3. Call Python AI ─────────────────────────────────────────────────
        const aiRes = await fetch(`${AI_API_BASE}/generate-domain-roadmap/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain,
                student_name: studentName,
                mentor_name: mentorName,
                session_id: mentorshipId,
            }),
            signal: AbortSignal.timeout(120000),
        });

        if (!aiRes.ok) {
            const err = await aiRes.text();
            console.error('[generateDomainRoadmap] AI error:', err);
            return res.status(500).json({ success: false, message: 'AI service error', detail: err });
        }

        const data = await aiRes.json();

        return res.json({
            success: true,
            domain,
            roadmap: data.roadmap,
            quiz_questions: data.quiz_questions,
            message: data.message,
        });

    } catch (error) {
        console.error('[generateDomainRoadmap] error:', error);
        res.status(500).json({ success: false, message: 'Server error generating roadmap' });
    }
};



// @desc    Get chat messages for a mentorship or connection
// @route   GET /api/mentorship/chat/:mentorshipId
// @access  Private
export const getChatMessages = async (req, res) => {
    try {
        const { mentorshipId } = req.params;

        // Try to find as MentorshipRequest first
        let mentorship = await MentorshipRequest.findById(mentorshipId);
        let isConnection = false;

        // If not found, try Connection model
        if (!mentorship) {
            mentorship = await Connection.findById(mentorshipId);
            isConnection = true;
        }

        if (!mentorship) {
            return res.status(404).json({
                success: false,
                message: 'Mentorship or connection not found'
            });
        }

        // Check if user is part of this mentorship/connection
        const isStudent = mentorship.student.toString() === req.user._id.toString();
        const isAlumni = mentorship.alumni && mentorship.alumni.toString() === req.user._id.toString();

        if (!isStudent && !isAlumni) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this chat'
            });
        }

        // Get all messages for this mentorship
        const messages = await MentorshipChat.find({
            mentorshipRequest: mentorshipId
        })
            .populate('sender', 'name username role')
            .populate('receiver', 'name username role')
            .sort({ createdAt: 1 })
            .lean();

        console.log(`[CHAT] Fetching messages for ${mentorshipId}`);
        console.log(`[CHAT] User ${req.user.username} (${req.user.role}) - Found ${messages.length} messages`);

        // Mark messages as read if user is the receiver
        await MentorshipChat.updateMany(
            {
                mentorshipRequest: mentorshipId,
                receiver: req.user._id,
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );

        res.status(200).json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
};

// @desc    Send a chat message
// @route   POST /api/mentorship/chat/:mentorshipId
// @access  Private
export const sendChatMessage = async (req, res) => {
    try {
        const { mentorshipId } = req.params;
        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty'
            });
        }

        // Try to find as MentorshipRequest first
        let mentorship = await MentorshipRequest.findById(mentorshipId);

        // If not found, try Connection model
        if (!mentorship) {
            mentorship = await Connection.findById(mentorshipId);
        }

        if (!mentorship) {
            return res.status(404).json({
                success: false,
                message: 'Mentorship or connection not found'
            });
        }

        if (mentorship.status !== 'accepted') {
            return res.status(400).json({
                success: false,
                message: 'Can only message in accepted relationships'
            });
        }

        // Determine sender and receiver
        const isStudent = mentorship.student.toString() === req.user._id.toString();
        const isAlumni = mentorship.alumni && mentorship.alumni.toString() === req.user._id.toString();

        if (!isStudent && !isAlumni) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to send messages in this relationship'
            });
        }

        const sender = req.user._id;
        const receiver = isStudent ? mentorship.alumni : mentorship.student;

        console.log(`[CHAT] Sending message in ${mentorshipId}`);
        console.log(`[CHAT] Sender: ${req.user.username} (${req.user._id})`);
        console.log(`[CHAT] Receiver: ${receiver}`);

        // Create message
        const chatMessage = await MentorshipChat.create({
            mentorshipRequest: mentorshipId,
            sender,
            receiver,
            message: message.trim()
        });

        await chatMessage.populate('sender', 'name username role');
        await chatMessage.populate('receiver', 'name username role');

        console.log(`[CHAT] Message saved successfully: ${chatMessage._id}`);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            chatMessage
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
};

// @desc    Get unread message count
// @route   GET /api/mentorship/chat/unread/count
// @access  Private
export const getUnreadCount = async (req, res) => {
    try {
        const count = await MentorshipChat.countDocuments({
            receiver: req.user._id,
            read: false
        });

        res.status(200).json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count'
        });
    }
};

// @desc    Get all active chats for user
// @route   GET /api/mentorship/chats
// @access  Private
export const getUserChats = async (req, res) => {
    try {
        // Find all accepted mentorships where user is involved
        const mentorships = await MentorshipRequest.find({
            $or: [
                { student: req.user._id },
                { alumni: req.user._id }
            ],
            status: 'accepted'
        })
            .populate('student', 'name username githubRepo department')
            .populate('alumni', 'name username currentCompany')
            .lean();

        // Get last message for each mentorship
        const chatsWithMessages = await Promise.all(
            mentorships.map(async (mentorship) => {
                const lastMessage = await MentorshipChat.findOne({
                    mentorshipRequest: mentorship._id
                })
                    .sort({ createdAt: -1 })
                    .lean();

                const unreadCount = await MentorshipChat.countDocuments({
                    mentorshipRequest: mentorship._id,
                    receiver: req.user._id,
                    read: false
                });

                return {
                    mentorship,
                    lastMessage,
                    unreadCount
                };
            })
        );

        // Sort by last message time
        chatsWithMessages.sort((a, b) => {
            const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        res.status(200).json({
            success: true,
            count: chatsWithMessages.length,
            chats: chatsWithMessages
        });
    } catch (error) {
        console.error('Error fetching user chats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chats'
        });
    }
};

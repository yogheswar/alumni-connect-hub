// =============================================================================
//  chatController.js — AI-Powered Chat Controller
//  Connects the Alumni Hub chatbot to the Python AI agent (port 8000)
//  running llama3.2:1b via Ollama for intelligent, context-aware responses.
// =============================================================================

import ChatMessage from '../models/ChatMessage.js';

// ── Python AI Agent URL ────────────────────────────────────────────────────────
const AI_API_BASE = 'http://localhost:8000';

// =============================================================================
//  SECTION 1 — AI CHAT ENDPOINT
//  Sends user message to Python AI and returns the smart response.
// =============================================================================

/**
 * Calls the Python /ai-chat/ endpoint with the user's message.
 * Falls back to keyword-based replies if AI is unavailable.
 */
const getAIResponse = async (message, userContext = {}) => {
    try {
        const res = await fetch(`${AI_API_BASE}/ai-chat/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                role: userContext.role || 'student',
                name: userContext.name || 'User'
            }),
            signal: AbortSignal.timeout(30000)   // 30-second timeout
        });

        if (!res.ok) throw new Error(`AI API returned ${res.status}`);

        const data = await res.json();
        return { response: data.response, category: data.category || 'general', source: 'ai' };

    } catch (err) {
        console.warn('[ChatController] AI unavailable, using fallback:', err.message);
        return getFallbackResponse(message);
    }
};

// =============================================================================
//  SECTION 2 — FALLBACK KEYWORD RESPONSES
//  Used when the Python AI service is not reachable.
// =============================================================================

const fallbackResponses = {
    greetings: ["Hello! I'm your Alumni Hub AI assistant. How can I help you today?"],
    events: ["You can find upcoming alumni events on the Events page. Check it out for workshops, reunions, and more!"],
    jobs: ["Looking for opportunities? Our Jobs page has openings posted by alumni. Head there to explore!"],
    connections: ["Connect with alumni mentors on the Find Mentors page. Our matching system links you to the right people!"],
    roadmap: ["To generate your AI career roadmap, please type: 'generate roadmap' and I'll guide you through it!"],
    donations: ["Support student causes via our Donations page. Every contribution makes a difference!"],
    help: ["I can help with: Events, Jobs, Mentors, Career Roadmaps, and Donations. What would you like to know?"],
    default: ["I'm here to help! Ask me about events, jobs, alumni connections, career roadmaps, or donations."]
};

const getFallbackResponse = (message) => {
    const msg = message.toLowerCase();
    let category = 'general';
    let response;

    if (msg.match(/\b(hi|hello|hey|greetings)\b/)) { category = 'general'; response = fallbackResponses.greetings[0]; }
    else if (msg.match(/\b(event|workshop|reunion|seminar|conference)\b/)) { category = 'events'; response = fallbackResponses.events[0]; }
    else if (msg.match(/\b(job|career|opportunity|hiring|position|work)\b/)) { category = 'jobs'; response = fallbackResponses.jobs[0]; }
    else if (msg.match(/\b(roadmap|plan|path|weeks|week)\b/)) { category = 'general'; response = fallbackResponses.roadmap[0]; }
    else if (msg.match(/\b(connect|mentor|alumni|network|match|guidance)\b/)) { category = 'connections'; response = fallbackResponses.connections[0]; }
    else if (msg.match(/\b(donate|donation|contribute|fund|scholarship)\b/)) { category = 'general'; response = fallbackResponses.donations[0]; }
    else if (msg.match(/\b(help|assist|guide|how|what|support)\b/)) { category = 'help'; response = fallbackResponses.help[0]; }
    else { response = fallbackResponses.default[0]; }

    return { response, category, source: 'fallback' };
};

// =============================================================================
//  SECTION 3 — ROUTE HANDLERS
// =============================================================================

/**
 * POST /api/chat/message
 * Send a message and receive an AI-powered response.
 */
export const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user._id;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Build user context for personalised AI replies
        const userContext = {
            role: req.user.role || 'student',
            name: req.user.name || 'User'
        };

        // Call the Python AI agent
        const { response, category, source } = await getAIResponse(message.trim(), userContext);

        // Persist to MongoDB
        const chatMessage = await ChatMessage.create({
            userId,
            message: message.trim(),
            response,
            category
        });

        return res.json({
            success: true,
            message: chatMessage.message,
            response: chatMessage.response,
            category: chatMessage.category,
            source,                              // 'ai' or 'fallback'
            timestamp: chatMessage.createdAt
        });

    } catch (error) {
        console.error('[ChatController] sendMessage error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * POST /api/chat/roadmap
 * Generate a personalised AI career roadmap and save it.
 */
export const generateRoadmap = async (req, res) => {
    try {
        const { session_id, github_summary, linkedin_skills, career_goal } = req.body;

        if (!github_summary || !linkedin_skills || !career_goal) {
            return res.status(400).json({
                error: 'github_summary, linkedin_skills, and career_goal are all required.'
            });
        }

        const sid = session_id || req.user._id.toString();

        const params = new URLSearchParams({
            session_id: sid,
            github_summary,
            linkedin_skills,
            career_goal
        });

        const aiRes = await fetch(`${AI_API_BASE}/generate-ai-roadmap/?${params}`, {
            method: 'POST',
            signal: AbortSignal.timeout(120000)  // 2-minute timeout for roadmap
        });

        if (!aiRes.ok) {
            const errBody = await aiRes.text();
            console.error('[ChatController] Roadmap API error:', errBody);
            return res.status(aiRes.status).json({ error: 'AI roadmap generation failed', detail: errBody });
        }

        const data = await aiRes.json();

        return res.json({
            success: true,
            message: data.message,
            roadmap: data.roadmap,
            session_id: sid
        });

    } catch (error) {
        console.error('[ChatController] generateRoadmap error:', error);
        res.status(500).json({ error: 'Server error while generating roadmap' });
    }
};

/**
 * GET /api/chat/history
 * Retrieve chat history for the logged-in user.
 */
export const getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 50 } = req.query;

        const chatHistory = await ChatMessage.find({ userId })
            .sort('-createdAt')
            .limit(parseInt(limit));

        res.json({
            success: true,
            chatHistory: chatHistory.reverse()   // Oldest first
        });
    } catch (error) {
        console.error('[ChatController] getChatHistory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/**
 * DELETE /api/chat/history
 * Clear all chat messages for the logged-in user.
 */
export const clearChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        await ChatMessage.deleteMany({ userId });
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        console.error('[ChatController] clearChatHistory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

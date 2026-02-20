

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { usePageTransition } from '@/hooks/useGSAP';
import {
    Send, ArrowLeft, Bot, User, CheckCircle,
    BookOpen, Sparkles, RotateCcw, ChevronRight,
    MessageCircle, MapPin, Trophy
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMsg {
    _id: string;
    sender: { _id: string; name: string; username: string; role: string };
    receiver: { _id: string; name: string; username: string; role: string };
    message: string;
    read: boolean;
    createdAt: string;
}

interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
}

interface RoadmapState {
    loaded: boolean;
    loading: boolean;
    domain: string;
    roadmap: string;
    quiz_questions: QuizQuestion[];
}

// ── Quiz Bank (fallback for all domains when AI parsing fails) ─────────────────
const QUIZ_BANK: Record<string, QuizQuestion[]> = {
    'Data Science': [
        { question: 'Which Python library is most commonly used for data manipulation and analysis?', options: ['A) NumPy', 'B) Pandas', 'C) Matplotlib', 'D) Scikit-learn'], answer: 'B' },
        { question: 'What does EDA stand for in the Data Science workflow?', options: ['A) Estimated Data Analysis', 'B) External Data Aggregation', 'C) Exploratory Data Analysis', 'D) Encoded Data Architecture'], answer: 'C' },
        { question: 'Which technique is used to handle missing values by predicting them from other features?', options: ['A) Dropping rows', 'B) Mean imputation', 'C) Forward fill', 'D) Multiple imputation'], answer: 'D' },
        { question: 'What is the purpose of a train-test split in a Data Science project?', options: ['A) To reduce dataset size', 'B) To evaluate model performance on unseen data', 'C) To clean the data', 'D) To normalise features'], answer: 'B' },
        { question: 'Which chart type is best for showing the distribution of a continuous variable?', options: ['A) Bar chart', 'B) Pie chart', 'C) Histogram', 'D) Scatter plot'], answer: 'C' },
    ],
    'Web Development': [
        { question: 'What does CSS stand for?', options: ['A) Computer Style Sheets', 'B) Cascading Style Sheets', 'C) Creative Style System', 'D) Coded Style Syntax'], answer: 'B' },
        { question: 'Which HTML tag is used to link an external JavaScript file?', options: ['A) <js>', 'B) <link>', 'C) <script>', 'D) <src>'], answer: 'C' },
        { question: 'What is the difference between GET and POST HTTP methods?', options: ['A) GET is faster than POST', 'B) GET sends data in body, POST in URL', 'C) GET sends data in URL, POST sends in body', 'D) There is no difference'], answer: 'C' },
        { question: 'Which JavaScript framework uses a Virtual DOM for rendering?', options: ['A) Angular', 'B) Vue', 'C) React', 'D) Both B and C'], answer: 'D' },
        { question: 'What does REST stand for in REST API?', options: ['A) Remote Execution State Transfer', 'B) Representational State Transfer', 'C) Resource Endpoint State Technology', 'D) Rendered Server Transfer'], answer: 'B' },
    ],
    'Machine Learning': [
        { question: 'Which algorithm is used for classification and draws a hyperplane between classes?', options: ['A) K-Means', 'B) Linear Regression', 'C) Support Vector Machine', 'D) Apriori'], answer: 'C' },
        { question: 'What is overfitting in a Machine Learning model?', options: ['A) Model performs well on training data but poorly on new data', 'B) Model is too simple to learn patterns', 'C) Training takes too long', 'D) Model uses too few features'], answer: 'A' },
        { question: 'Which metric is most appropriate for imbalanced classification datasets?', options: ['A) Accuracy', 'B) Mean Squared Error', 'C) F1-Score', 'D) R² Score'], answer: 'C' },
        { question: 'What does the learning rate control in gradient descent?', options: ['A) Number of training epochs', 'B) Size of the step taken towards minimum', 'C) Number of features used', 'D) Regularisation strength'], answer: 'B' },
        { question: 'Which type of learning uses labelled data for training?', options: ['A) Unsupervised Learning', 'B) Reinforcement Learning', 'C) Supervised Learning', 'D) Self-supervised Learning'], answer: 'C' },
    ],
    'Cybersecurity': [
        { question: 'What type of attack encrypts the victim\'s data and demands payment to restore access?', options: ['A) Phishing', 'B) Ransomware', 'C) SQL Injection', 'D) DDoS'], answer: 'B' },
        { question: 'What does HTTPS use to encrypt communication between browser and server?', options: ['A) MD5 hash', 'B) Base64 encoding', 'C) TLS/SSL certificates', 'D) AES without keys'], answer: 'C' },
        { question: 'Which type of penetration testing is done with full knowledge of the system?', options: ['A) Black Box Testing', 'B) Grey Box Testing', 'C) White Box Testing', 'D) Blind Testing'], answer: 'C' },
        { question: 'What is the primary purpose of a firewall?', options: ['A) Encrypt hard drive data', 'B) Monitor and control network traffic based on rules', 'C) Run antivirus scans', 'D) Store passwords securely'], answer: 'B' },
        { question: 'What does SQL injection exploit?', options: ['A) Weak password policies', 'B) Unvalidated user input in database queries', 'C) Outdated SSL certificates', 'D) Misconfigured DNS servers'], answer: 'B' },
    ],
    'Mobile Development': [
        { question: 'Which language is primarily used to build Android apps natively?', options: ['A) Swift', 'B) Objective-C', 'C) Kotlin', 'D) Dart'], answer: 'C' },
        { question: 'What is the primary advantage of using Flutter for mobile development?', options: ['A) It only works for iOS', 'B) It compiles native code for both iOS and Android from one codebase', 'C) It uses JavaScript exclusively', 'D) It requires separate UI code per platform'], answer: 'B' },
        { question: 'What is an Activity in Android development?', options: ['A) A background service', 'B) A single screen with a user interface', 'C) A database table', 'D) A REST API call handler'], answer: 'B' },
        { question: 'Which protocol is most commonly used for push notifications in mobile apps?', options: ['A) FTP', 'B) SMTP', 'C) FCM (Firebase Cloud Messaging)', 'D) BitTorrent'], answer: 'C' },
        { question: 'What is the role of the App Store / Play Store review process?', options: ['A) Speed up app downloads', 'B) Ensure apps meet quality and security standards', 'C) Translate apps to multiple languages', 'D) Host app backend servers'], answer: 'B' },
    ],
    'Cloud Computing': [
        { question: 'What does IaaS stand for in cloud computing?', options: ['A) Internet as a Service', 'B) Infrastructure as a Service', 'C) Integration as a Service', 'D) Intelligence as a Service'], answer: 'B' },
        { question: 'Which AWS service is primarily used to store and retrieve objects like files?', options: ['A) EC2', 'B) RDS', 'C) S3', 'D) Lambda'], answer: 'C' },
        { question: 'What is auto-scaling in cloud computing?', options: ['A) Manual resizing of servers', 'B) Automatically adjusting resources based on demand', 'C) Automatic data backup', 'D) Network speed optimisation'], answer: 'B' },
        { question: 'What is a CDN (Content Delivery Network) used for?', options: ['A) Storing relational databases', 'B) Running machine learning models', 'C) Delivering content faster by caching it at edge locations', 'D) Encrypting cloud storage'], answer: 'C' },
        { question: 'Which cloud deployment model is solely used by one organisation?', options: ['A) Public Cloud', 'B) Community Cloud', 'C) Hybrid Cloud', 'D) Private Cloud'], answer: 'D' },
    ],
    'DevOps': [
        { question: 'What is CI/CD in DevOps?', options: ['A) Cloud Infrastructure / Cloud Deployment', 'B) Continuous Integration / Continuous Delivery', 'C) Code Inspection / Code Debugging', 'D) Container Infrastructure / Container Delivery'], answer: 'B' },
        { question: 'Which tool is most widely used for container orchestration?', options: ['A) Docker', 'B) Jenkins', 'C) Kubernetes', 'D) Ansible'], answer: 'C' },
        { question: 'What is Infrastructure as Code (IaC)?', options: ['A) Writing code that runs on cloud VMs', 'B) Managing infrastructure through code rather than manual processes', 'C) Using code to monitor network traffic', 'D) Storing source code in the cloud'], answer: 'B' },
        { question: 'Which tool is commonly used for creating CI/CD pipelines?', options: ['A) Vagrant', 'B) Prometheus', 'C) Jenkins', 'D) Grafana'], answer: 'C' },
        { question: 'What is the "shift left" principle in DevOps?', options: ['A) Moving servers to the left data center', 'B) Testing and security earlier in the development lifecycle', 'C) Writing code from right to left', 'D) Deploying to staging before production'], answer: 'B' },
    ],
    'UI/UX Design': [
        { question: 'What does UX design primarily focus on?', options: ['A) Visual aesthetics of the interface', 'B) The overall experience and usability for the user', 'C) Backend code optimisation', 'D) Database schema design'], answer: 'B' },
        { question: 'What is a wireframe in UI/UX design?', options: ['A) A finished high-fidelity prototype', 'B) A low-fidelity sketch showing layout and structure', 'C) A colour palette for the brand', 'D) A backend API design document'], answer: 'B' },
        { question: 'What is the purpose of A/B testing in UX?', options: ['A) Testing two different codebases', 'B) Comparing two design variations to see which performs better', 'C) Testing on Android vs iOS', 'D) Checking accessibility vs performance'], answer: 'B' },
        { question: 'What does "affordance" mean in UX design?', options: ['A) The cost of implementing a feature', 'B) A design element that suggests how it should be used', 'C) The time budget for a sprint', 'D) User feedback score'], answer: 'B' },
        { question: 'Which tool is most commonly used for UI prototyping and collaboration?', options: ['A) Microsoft Word', 'B) Figma', 'C) Eclipse IDE', 'D) MySQL Workbench'], answer: 'B' },
    ],
    'Backend Engineering': [
        { question: 'What is the purpose of an ORM (Object Relational Mapper)?', options: ['A) Optimise network routing', 'B) Map database tables to programming language objects', 'C) Render HTML templates', 'D) Manage cloud storage'], answer: 'B' },
        { question: 'What does idempotency mean in REST APIs?', options: ['A) Requests must always return different results', 'B) Making the same request multiple times produces the same result', 'C) The server caches all responses', 'D) Only one client can call the API at a time'], answer: 'B' },
        { question: 'Which HTTP status code represents "Resource Not Found"?', options: ['A) 200', 'B) 201', 'C) 404', 'D) 500'], answer: 'C' },
        { question: 'What is database indexing used for?', options: ['A) Encrypting data at rest', 'B) Speeding up query performance', 'C) Backing up the database', 'D) Replicating data across servers'], answer: 'B' },
        { question: 'What is the difference between SQL and NoSQL databases?', options: ['A) SQL is newer than NoSQL', 'B) SQL uses structured tables; NoSQL uses flexible document/key-value stores', 'C) NoSQL only stores numbers', 'D) SQL cannot handle more than 1000 records'], answer: 'B' },
    ],
    'Full Stack Development': [
        { question: 'In the MERN stack, what does "M" stand for?', options: ['A) MySQL', 'B) MongoDB', 'C) Maven', 'D) Middleware'], answer: 'B' },
        { question: 'What is the role of an API in a full stack application?', options: ['A) Style the frontend UI', 'B) Act as a bridge between frontend and backend', 'C) Store user session data', 'D) Compile TypeScript code'], answer: 'B' },
        { question: 'What does CORS stand for and why is it important?', options: ['A) Cross-Origin Resource Sharing — controls which domains can access your API', 'B) Client-Oriented Request System — speeds up API calls', 'C) Cached Object Request System — reduces database load', 'D) Cross-Object Rendering System — handles frontend rendering'], answer: 'A' },
        { question: 'What is the purpose of environment variables (.env files)?', options: ['A) Store UI component styles', 'B) Keep sensitive config like API keys outside the codebase', 'C) Define CSS custom properties', 'D) Manage npm dependencies'], answer: 'B' },
        { question: 'What is JWT commonly used for in full stack apps?', options: ['A) Database query optimisation', 'B) User authentication and session management', 'C) Caching API responses', 'D) Compressing image uploads'], answer: 'B' },
    ],
    'Artificial Intelligence': [
        { question: 'What is the Turing Test designed to evaluate?', options: ['A) Code efficiency', 'B) Whether a machine can exhibit intelligent behaviour indistinguishable from a human', 'C) Speed of an AI model', 'D) Database read performance'], answer: 'B' },
        { question: 'What is a Neural Network inspired by?', options: ['A) Binary logic gates', 'B) The structure and function of the human brain', 'C) Relational databases', 'D) Quantum physics'], answer: 'B' },
        { question: 'What is Natural Language Processing (NLP) used for?', options: ['A) Generating 3D graphics', 'B) Enabling computers to understand and process human language', 'C) Compiling programming languages', 'D) Managing memory allocation'], answer: 'B' },
        { question: 'What type of AI learns by receiving rewards or penalties for its actions?', options: ['A) Supervised Learning', 'B) Unsupervised Learning', 'C) Reinforcement Learning', 'D) Transfer Learning'], answer: 'C' },
        { question: 'What is the purpose of the activation function in a neural network?', options: ['A) Initialise model weights randomly', 'B) Introduce non-linearity so the network learns complex patterns', 'C) Reduce the learning rate over time', 'D) Split data into training and test sets'], answer: 'B' },
    ],
    'Blockchain': [
        { question: 'What is a blockchain fundamentally?', options: ['A) A centralised database controlled by one company', 'B) A distributed, immutable ledger of transactions', 'C) A type of encryption algorithm', 'D) A programming language for smart contracts'], answer: 'B' },
        { question: 'What is a smart contract?', options: ['A) A legal document stored on the internet', 'B) Self-executing code on a blockchain that runs when conditions are met', 'C) An encrypted email system', 'D) A contract signed with digital ink'], answer: 'B' },
        { question: 'What is the consensus mechanism used by Bitcoin?', options: ['A) Proof of Stake', 'B) Delegated Proof of Stake', 'C) Proof of Work', 'D) Proof of Authority'], answer: 'C' },
        { question: 'What problem does blockchain solve in digital transactions?', options: ['A) Slow internet speeds', 'B) Double spending and the need for a trusted third party', 'C) Password security', 'D) Email spam'], answer: 'B' },
        { question: 'Which blockchain platform is most popular for building decentralised apps (DApps)?', options: ['A) Bitcoin', 'B) Ripple', 'C) Ethereum', 'D) Litecoin'], answer: 'C' },
    ],
    'Embedded Systems': [
        { question: 'What is a microcontroller?', options: ['A) A small keyboard for controlling robotics', 'B) A compact integrated circuit with a processor, memory, and I/O on one chip', 'C) A type of operating system', 'D) A wireless communication module'], answer: 'B' },
        { question: 'What does RTOS stand for?', options: ['A) Remote Terminal Operating System', 'B) Real-Time Operating System', 'C) Reduced Task Operating System', 'D) Robotic Technology OS'], answer: 'B' },
        { question: 'Which protocol is commonly used for serial communication between microcontrollers?', options: ['A) HTTP', 'B) UART / SPI / I2C', 'C) FTP', 'D) TCP/IP'], answer: 'B' },
        { question: 'What is PWM (Pulse Width Modulation) used for in embedded systems?', options: ['A) Storing data to flash memory', 'B) Controlling power delivery to devices like motors and LEDs', 'C) Wireless data transmission', 'D) Debugging firmware'], answer: 'B' },
        { question: 'Which language is most commonly used to program embedded systems?', options: ['A) Python', 'B) Java', 'C) C / C++', 'D) Ruby'], answer: 'C' },
    ],
    'Data Engineering': [
        { question: 'What is an ETL pipeline?', options: ['A) Edit, Transfer, Log', 'B) Extract, Transform, Load — moving data from source to destination', 'C) Encode, Test, Launch', 'D) Evaluate, Train, Label'], answer: 'B' },
        { question: 'Which tool is most widely used for distributed big data processing?', options: ['A) Microsoft Excel', 'B) Apache Hadoop / Spark', 'C) MySQL', 'D) Node.js'], answer: 'B' },
        { question: 'What is data partitioning in a data warehouse?', options: ['A) Deleting old data', 'B) Dividing data into logical segments to improve query performance', 'C) Encrypting sensitive columns', 'D) Indexing every column'], answer: 'B' },
        { question: 'What is the difference between a data lake and a data warehouse?', options: ['A) They are the same thing', 'B) Data lake stores raw unstructured data; data warehouse stores structured processed data', 'C) Data warehouse stores raw data; data lake stores only structured data', 'D) Data lakes are only for images and videos'], answer: 'B' },
        { question: 'Which file format is widely preferred for big data storage due to its columnar nature?', options: ['A) CSV', 'B) JSON', 'C) Parquet', 'D) XML'], answer: 'C' },
    ],
};

/** Returns quiz questions: AI-generated if valid, otherwise hardcoded bank */
const getQuizQuestions = (domain: string, aiQuestions: QuizQuestion[]): QuizQuestion[] => {
    if (aiQuestions && aiQuestions.length >= 3) return aiQuestions;
    // Fuzzy match domain name (case-insensitive)
    const key = Object.keys(QUIZ_BANK).find(k =>
        k.toLowerCase() === domain?.toLowerCase() ||
        domain?.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(domain?.toLowerCase())
    );
    return key ? QUIZ_BANK[key] : QUIZ_BANK['Web Development'];
};

// ── Component ─────────────────────────────────────────────────────────────────

const MentorshipChat = () => {
    const { mentorshipId } = useParams<{ mentorshipId: string }>();
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const pageRef = usePageTransition();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── Chat state ─────────────────────────────────────────────────────────
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [otherUser, setOtherUser] = useState<any>(null);

    // ── Left-panel tab: 'roadmap' | 'quiz' ────────────────────────────────
    const [leftTab, setLeftTab] = useState<'roadmap' | 'quiz'>('roadmap');

    // ── Roadmap + Quiz state ───────────────────────────────────────────────
    const [roadmapState, setRoadmapState] = useState<RoadmapState>({
        loaded: false, loading: false, domain: '', roadmap: '', quiz_questions: []
    });

    // ── Domain picker (for Connection-based mentorships w/ no stored domain)
    const [showDomainPicker, setShowDomainPicker] = useState(false);
    const [selectedDomain, setSelectedDomain] = useState('');

    // ── Quiz state ────────────────────────────────────────────────────────
    const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);

    // ── Unread message notification ───────────────────────────────────────
    const [unreadCount, setUnreadCount] = useState(0);
    const lastSeenCountRef = useRef(0);

    // ── Scroll chat to bottom ─────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Fetch chat messages + determine other user ─────────────────────────
    const fetchChatData = async () => {
        const token = localStorage.getItem('alumni_hub_token');
        if (!token || !mentorshipId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/mentorship/chat/${mentorshipId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            let tempOther = null;
            if (data.success) {
                setMessages(data.messages);
                if (data.messages.length > 0) {
                    const first = data.messages[0];
                    tempOther = first.sender._id === user?.id ? first.receiver : first.sender;
                    setOtherUser(tempOther);
                }
            }

            // Fallback: fetch mentorship details for other user name
            if (!tempOther) {
                const mRes = await fetch('/api/mentorship/requests', { headers: { Authorization: `Bearer ${token}` } });
                const mData = await mRes.json();
                if (mData.success) {
                    const m = mData.requests.find((r: any) => r._id === mentorshipId);
                    if (m) {
                        const other = user?.role === 'student' ? m.alumni : m.student;
                        setOtherUser(other);
                        // Auto-load roadmap if not loaded
                        if (!roadmapState.loaded && !roadmapState.loading) {
                            loadDomainRoadmap(m.domain);
                        }
                    }
                }
            }
        } catch (e) {
            toast.error('Error loading chat');
        } finally {
            setIsLoading(false);
        }
    };

    // ── Poll silently every 5 s ─────────────────────────────────────────────
    const pollMessages = async () => {
        const token = localStorage.getItem('alumni_hub_token');
        if (!token || !mentorshipId) return;
        try {
            const res = await fetch(`/api/mentorship/chat/${mentorshipId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const incoming = data.messages as ChatMsg[];
                setMessages(incoming);
                // Count messages from the other person that we haven't seen yet
                const newFromOther = incoming.filter(
                    (m) => String(m.sender?._id || m.sender) !== String(user?.id)
                ).length;
                if (newFromOther > lastSeenCountRef.current) {
                    setUnreadCount(newFromOther - lastSeenCountRef.current);
                }
            }
        } catch { }
    };

    useEffect(() => {
        if (user && mentorshipId) {
            fetchChatData();
            const iv = setInterval(pollMessages, 5000);
            const to = setTimeout(() => setIsLoading(false), 10000);
            return () => { clearInterval(iv); clearTimeout(to); };
        }
    }, [user, mentorshipId]);

    // ── Domain picker helpers ────────────────────────────────────────────
    const COMMON_DOMAINS = [
        'Data Science', 'Web Development', 'Machine Learning', 'Cybersecurity',
        'Mobile Development', 'Cloud Computing', 'DevOps', 'UI/UX Design',
        'Backend Engineering', 'Full Stack Development', 'Artificial Intelligence',
        'Blockchain', 'Embedded Systems', 'Data Engineering'
    ];

    const handleDomainPickerSubmit = () => {
        if (!selectedDomain.trim()) return;
        setShowDomainPicker(false);
        loadDomainRoadmap(selectedDomain.trim());
    };

    // ── Load AI domain roadmap + quiz ─────────────────────────────────────
    const loadDomainRoadmap = async (domain?: string) => {
        const token = localStorage.getItem('alumni_hub_token');
        if (!token || !mentorshipId) return;

        // If no domain is known yet, show the picker
        const effectiveDomain = domain || roadmapState.domain || '';
        if (!effectiveDomain) {
            setShowDomainPicker(true);
            return;
        }

        setRoadmapState(s => ({ ...s, loading: true, domain: effectiveDomain }));
        toast.info(`🤖 Generating ${effectiveDomain} roadmap & quiz...`);
        try {
            const res = await fetch(`/api/mentorship/chat/${mentorshipId}/domain-roadmap`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: effectiveDomain })
            });
            const data = await res.json();

            if (data.success) {
                setRoadmapState({
                    loaded: true,
                    loading: false,
                    domain: data.domain || domain || '',
                    roadmap: data.roadmap,
                    quiz_questions: data.quiz_questions || [],
                });
                toast.success('✅ Roadmap & quiz generated!');
            } else {
                throw new Error(data.message);
            }
        } catch (e: any) {
            setRoadmapState(s => ({ ...s, loading: false }));
            toast.error('Failed to generate roadmap: ' + (e.message || 'Server error'));
        }
    };

    // ── Send chat message ─────────────────────────────────────────────────
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;
        const token = localStorage.getItem('alumni_hub_token');
        if (!token || !mentorshipId) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/mentorship/chat/${mentorshipId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ message: newMessage.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, data.chatMessage]);
                setNewMessage('');
            } else {
                toast.error(data.message || 'Failed to send');
            }
        } catch {
            toast.error('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    // ── Quiz handlers ─────────────────────────────────────────────────────
    const handleQuizAnswer = (qIdx: number, option: string) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({ ...prev, [qIdx]: option }));
    };

    const handleQuizSubmit = () => {
        if (quizSubmitted) return;
        let score = 0;
        roadmapState.quiz_questions.forEach((q, i) => {
            const selected = quizAnswers[i] || '';
            const correctLetter = q.answer?.trim().toUpperCase();
            const selectedLetter = selected.charAt(0).toUpperCase();
            if (selectedLetter === correctLetter) score++;
        });
        setQuizScore(score);
        setQuizSubmitted(true);
        toast.success(`Quiz submitted! Score: ${score}/${roadmapState.quiz_questions.length} 🎉`);
    };

    const resetQuiz = () => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(0);
    };

    // ── Render inline bold (handles **text** markdown) ────────────────────────
    const renderInline = (text: string) => {
        // Strip markdown link syntax, keep just label
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        // Split on **bold** markers
        const parts = text.split(/\*\*(.+?)\*\*/g);
        return parts.map((part, i) =>
            i % 2 === 1
                ? <strong key={i} className="font-black text-foreground">{part}</strong>
                : <span key={i}>{part}</span>
        );
    };

    // ── Render roadmap with full markdown support ──────────────────────────────
    const renderRoadmap = (text: string) => {
        // Clean up triple asterisks and stray # outside of headers
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];

        lines.forEach((rawLine, i) => {
            const line = rawLine.trim();
            if (!line) { elements.push(<div key={i} className="h-2" />); return; }

            // ### Week N:  OR  Week N:  (both forms the LLM produces)
            if (line.match(/^#{1,3}\s*Week\s*\d+/i) || line.match(/^Week\s*\d+/i)) {
                const label = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                elements.push(
                    <div key={i} className="mt-6 mb-3">
                        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2.5">
                            <ChevronRight size={15} className="text-primary flex-shrink-0" />
                            <span className="font-black text-sm text-primary">{label}</span>
                        </div>
                    </div>
                );
                return;
            }

            // ### any other heading
            if (line.startsWith('#')) {
                const label = line.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                elements.push(
                    <p key={i} className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-4 mb-1">{label}</p>
                );
                return;
            }

            // Numbered list  →  1. **Task**: description
            const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
            if (numberedMatch) {
                const content = numberedMatch[2];
                elements.push(
                    <div key={i} className="flex items-start gap-2.5 ml-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                            {numberedMatch[1]}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{renderInline(content)}</p>
                    </div>
                );
                return;
            }

            // Bullet list  →  - **Task**: description  or  • task
            if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) {
                const content = line.replace(/^[-•*]\s*/, '');
                elements.push(
                    <div key={i} className="flex items-start gap-2 ml-3 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <p className="text-sm text-foreground leading-relaxed">{renderInline(content)}</p>
                    </div>
                );
                return;
            }

            // Plain line (might have **bold**)
            elements.push(
                <p key={i} className="text-sm text-foreground/80 mb-1 leading-relaxed">{renderInline(line)}</p>
            );
        });

        return elements;
    };


    // ─────────────────────────────────────────────────────────────────────
    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Chat...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const { loaded, loading, domain, roadmap, quiz_questions: rawAiQuestions } = roadmapState;
    // Use AI questions if ≥3 parsed correctly, otherwise fall back to quiz bank
    const quiz_questions = getQuizQuestions(domain, rawAiQuestions);

    return (
        <MainLayout>
            <div ref={pageRef} className="pt-16 h-screen flex flex-col bg-background">

                {/* ── Domain Picker Modal ────────────────────────────────────── */}
                {showDomainPicker && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-background border border-border/50 rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-fade-in">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="text-primary" size={20} />
                                </div>
                                <div>
                                    <h2 className="font-black text-foreground text-lg">Choose Your Domain</h2>
                                    <p className="text-xs text-muted-foreground">AI will build a 6-week roadmap + quiz just for this domain</p>
                                </div>
                            </div>

                            {/* Common domains grid */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {COMMON_DOMAINS.map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setSelectedDomain(d)}
                                        className={`text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${selectedDomain === d
                                            ? 'bg-primary/10 border-primary/40 text-primary font-bold'
                                            : 'bg-muted/30 border-border/30 hover:border-primary/30 hover:bg-primary/5 text-foreground'
                                            }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>

                            {/* Custom domain input */}
                            <div className="mb-5">
                                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Or type a custom domain:</p>
                                <input
                                    type="text"
                                    value={selectedDomain}
                                    onChange={e => setSelectedDomain(e.target.value)}
                                    placeholder="e.g. Robotics, Game Development..."
                                    className="w-full h-11 px-4 bg-muted border-2 border-transparent rounded-xl text-sm outline-none focus:border-primary/30 transition-all"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDomainPicker(false)}
                                    className="flex-1 py-3 bg-muted text-muted-foreground text-sm font-bold rounded-xl hover:bg-muted/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDomainPickerSubmit}
                                    disabled={!selectedDomain.trim()}
                                    className="flex-1 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    🚀 Generate Roadmap
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Top Header ─────────────────────────────────────────────── */}

                <div className="px-6 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    {otherUser && (
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-black text-sm">
                                {otherUser.name?.charAt(0) || <User size={18} />}
                            </div>
                            <div>
                                <h2 className="text-base font-black text-foreground leading-tight">{otherUser.name}</h2>
                                <p className="text-xs text-muted-foreground">
                                    {otherUser.role === 'alumni' ? `Alumni • ${otherUser.currentCompany || 'Mentor'}` : 'Student'} • {domain && `${domain} Mentorship`}
                                </p>
                            </div>
                        </div>
                    )}
                    {/* Regenerate button — students only */}
                    {user?.role === 'student' && (
                        <button
                            onClick={() => { setRoadmapState(s => ({ ...s, loaded: false })); loadDomainRoadmap(); resetQuiz(); }}
                            disabled={loading}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
                            Regen AI
                        </button>
                    )}
                </div>

                {/* ── Main Body: Left (Roadmap/Quiz) + Right (Chat) ─────────── */}
                {/* Left panel only for students. Alumni get full-width chat.     */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ════ LEFT PANEL — AI Roadmap + Quiz (students only) ════ */}
                    {user?.role === 'student' && <div className="w-[420px] flex-shrink-0 border-r border-border/50 flex flex-col bg-muted/20">

                        {/* Left tab switcher */}
                        <div className="flex border-b border-border/50 flex-shrink-0">
                            <button
                                onClick={() => setLeftTab('roadmap')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${leftTab === 'roadmap'
                                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <MapPin size={13} /> 6-Week Roadmap
                            </button>
                            <button
                                onClick={() => setLeftTab('quiz')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${leftTab === 'quiz'
                                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <BookOpen size={13} /> Skill Quiz
                                {(loaded || domain) && (
                                    <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center">
                                        5
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Left panel content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* ── Not loaded yet ── */}
                            {!loaded && !loading && (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Sparkles className="text-primary" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground mb-1">AI Roadmap & Quiz</h3>
                                        <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                                            Generate a personalised 6-week roadmap and skill assessment quiz for your <strong>{domain || 'mentorship'}</strong> domain.
                                        </p>
                                        <button
                                            onClick={() => loadDomainRoadmap()}
                                            className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
                                        >
                                            🚀 Generate Now
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* ── Loading ── */}
                            {loading && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    <div>
                                        <p className="font-bold text-sm text-foreground">AI is generating...</p>
                                        <p className="text-xs text-muted-foreground mt-1">Building your domain roadmap & quiz<br />This takes ~30–60 seconds</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Roadmap tab ── */}
                            {loaded && leftTab === 'roadmap' && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin size={16} className="text-primary" />
                                        <h3 className="font-black text-foreground text-sm">6-Week {domain} Roadmap</h3>
                                    </div>
                                    <div className="space-y-1">{renderRoadmap(roadmap)}</div>
                                </div>
                            )}

                            {/* ── Quiz tab ── */}
                            {leftTab === 'quiz' && (
                                <div>
                                    {/* Domain label */}
                                    {domain && (
                                        <div className="flex items-center gap-2 mb-4">
                                            <BookOpen size={15} className="text-primary" />
                                            <h3 className="font-black text-foreground text-sm">{domain} — Skill Quiz</h3>
                                            <span className="ml-auto text-[10px] text-muted-foreground font-medium">5 Questions</span>
                                        </div>
                                    )}
                                    {!domain && !loading && (
                                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                            <Sparkles size={28} className="text-primary" />
                                            <p className="text-sm font-bold text-foreground">Pick a domain first</p>
                                            <p className="text-xs text-muted-foreground">Click "Generate Now" on the Roadmap tab to choose your domain and start the quiz.</p>
                                        </div>
                                    )}
                                    {/* Score banner */}
                                    {quizSubmitted && (
                                        <div className={`flex items-center gap-3 p-4 rounded-2xl mb-5 ${quizScore >= 4 ? 'bg-green-500/10 border border-green-500/20' : 'bg-warning/10 border border-warning/20'
                                            }`}>
                                            <Trophy size={20} className={quizScore >= 4 ? 'text-green-500' : 'text-warning'} />
                                            <div>
                                                <p className="font-black text-sm">{quizScore >= 4 ? '🎉 Excellent!' : quizScore >= 2 ? '👍 Good effort!' : '📚 Keep learning!'}</p>
                                                <p className="text-xs text-muted-foreground">Score: {quizScore}/{quiz_questions.length}</p>
                                            </div>
                                            <button onClick={resetQuiz} className="ml-auto text-xs text-primary font-bold hover:underline">Retry</button>
                                        </div>
                                    )}



                                    <div className="space-y-5">
                                        {quiz_questions.map((q, qi) => {
                                            const selected = quizAnswers[qi];
                                            const correctLetter = q.answer?.trim().toUpperCase();
                                            return (
                                                <div key={qi} className="bg-background border border-border/50 rounded-2xl p-4">
                                                    <p className="text-sm font-bold text-foreground mb-3">
                                                        <span className="text-primary mr-1">Q{qi + 1}.</span> {q.question}
                                                    </p>
                                                    <div className="space-y-2">
                                                        {q.options.map((opt, oi) => {
                                                            const letter = opt.charAt(0).toUpperCase();
                                                            const isSelected = selected === opt;
                                                            const isCorrect = quizSubmitted && letter === correctLetter;
                                                            const isWrong = quizSubmitted && isSelected && letter !== correctLetter;
                                                            return (
                                                                <button
                                                                    key={oi}
                                                                    onClick={() => handleQuizAnswer(qi, opt)}
                                                                    className={`w-full text-left text-sm px-3 py-2.5 rounded-xl border transition-all ${isCorrect ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300' :
                                                                        isWrong ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' :
                                                                            isSelected ? 'bg-primary/10 border-primary/30 text-primary' :
                                                                                'bg-muted/30 border-border/30 hover:border-primary/30 hover:bg-primary/5'
                                                                        } ${quizSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                                                                >
                                                                    {isCorrect && <CheckCircle size={12} className="inline mr-1.5" />}
                                                                    {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {quiz_questions.length > 0 && !quizSubmitted && (
                                        <button
                                            onClick={handleQuizSubmit}
                                            disabled={Object.keys(quizAnswers).length < quiz_questions.length}
                                            className="w-full mt-5 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            Submit Quiz →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>}

                    {/* ════ RIGHT PANEL — Direct Chat ══════════════════════════ */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Chat header */}
                        <div className="px-4 py-3 border-b border-border/50 bg-background/95 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={16} className="text-primary" />
                                <span className="text-sm font-black">Chat with {otherUser?.name || (user?.role === 'alumni' ? 'Student' : 'your mentor')}</span>
                                {/* Unread badge — clears when chat is visible */}
                                {unreadCount > 0 && (
                                    <span
                                        onClick={() => { setUnreadCount(0); lastSeenCountRef.current = messages.filter(m => String(m.sender?._id || m.sender) !== String(user?.id)).length; }}
                                        className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black animate-bounce cursor-pointer"
                                        title="New messages — click to clear"
                                    >
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {user?.role === 'alumni' ? `${domain || 'Mentorship'} chat` : `Ask anything about ${domain}`}
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center opacity-40">
                                        <Send className="text-muted-foreground" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-foreground mb-1">No messages yet</h3>
                                        <p className="text-xs text-muted-foreground">
                                            Say hi to {otherUser?.name || 'your mentor'}!<br />
                                            Ask questions about <strong>{domain}</strong>.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => {
                                    const isMe = String(msg.sender?._id || msg.sender) === String(user?.id);
                                    return (
                                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                            {/* Avatar for other user */}
                                            {!isMe && (
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center text-xs font-black mr-2 flex-shrink-0 self-end mb-1">
                                                    {(msg.sender as any)?.name?.charAt(0) || <User size={12} />}
                                                </div>
                                            )}
                                            <div className={`max-w-[78%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm font-medium whitespace-pre-wrap break-words ${isMe
                                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                    : 'bg-muted text-foreground rounded-bl-sm'
                                                    }`}>
                                                    {msg.message}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground px-1">
                                                    {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            {/* Avatar for me */}
                                            {isMe && (
                                                <div className="w-7 h-7 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs font-black ml-2 flex-shrink-0 self-end mb-1">
                                                    {user?.name?.charAt(0) || <User size={12} />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message input */}
                        <div className="px-4 py-3 border-t border-border/50 bg-background/95 flex-shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Ask ${otherUser?.name || 'your mentor'} about ${domain || 'anything'}...`}
                                    disabled={isSending}
                                    className="flex-1 h-11 px-4 bg-muted border-2 border-transparent rounded-xl text-sm outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || isSending}
                                    className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                            {user?.role === 'student' && (
                                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                                    💡 Tip: Use the left panel to view your AI roadmap and take the skill quiz!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default MentorshipChat;

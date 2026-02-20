import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import GlassCard from '@/components/ui/GlassCard';
import { useAuth } from '@/context/AuthContext';
import { usePageTransition, useStaggerReveal } from '@/hooks/useGSAP';
import {
    MessageCircle, Users, CheckCircle, Clock, Briefcase, Building2, Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface MentorshipRequest {
    _id: string;
    alumni: {
        _id: string;
        name: string;
        username: string;
        email: string;
        currentCompany?: string;
        currentPosition?: string;
        linkedIn?: string;
    };
    domain: string;
    message: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
    createdAt: string;
}

const StudentMentorship = () => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const pageRef = usePageTransition();
    const cardsRef = useStaggerReveal(0.05);

    const [mentorships, setMentorships] = useState<MentorshipRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch student's mentorship requests
    const fetchMentorships = async () => {
        const token = localStorage.getItem('alumni_hub_token');
        if (!token) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/mentorship/requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                setMentorships(data.requests);
            } else {
                toast.error('Failed to load mentorships');
            }
        } catch (error) {
            console.error('Error fetching mentorships:', error);
            toast.error('Error loading mentorships');
        } finally {
            setIsLoading(false);
        }
    };

    // Update mentorship request status
    const handleUpdateStatus = async (requestId: string, status: 'accepted' | 'rejected') => {
        const token = localStorage.getItem('alumni_hub_token');
        if (!token) return;

        const loadingToast = toast.loading(`${status === 'accepted' ? 'Accepting' : 'Rejecting'} mentorship request...`);

        try {
            const response = await fetch(`/api/mentorship/requests/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Mentorship request ${status}!`, { id: loadingToast });
                fetchMentorships(); // Refresh the list
            } else {
                toast.error(data.message || `Failed to ${status} request`, { id: loadingToast });
            }
        } catch (error) {
            console.error(`Error updating mentorship status:`, error);
            toast.error('Connection error', { id: loadingToast });
        }
    };

    useEffect(() => {
        if (user) fetchMentorships();
    }, [user]);

    // Redirect if not student
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'student')) {
            navigate('/signin');
        }
    }, [user, navigate, authLoading]);

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                        Loading Your Mentorships...
                    </p>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 'student') {
        return null;
    }

    const acceptedMentorships = mentorships.filter(m => m.status === 'accepted');
    const pendingMentorships = mentorships.filter(m => m.status === 'pending');

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-warning/10 text-warning';
            case 'accepted': return 'bg-success/10 text-success';
            case 'rejected': return 'bg-destructive/10 text-destructive';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock size={16} />;
            case 'accepted': return <CheckCircle size={16} />;
            default: return <Clock size={16} />;
        }
    };

    return (
        <MainLayout>
            <div ref={pageRef} className="pt-24 px-6 md:px-20 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                            <Users className="text-primary-foreground" size={24} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-foreground tracking-tight">
                                My Mentorships
                            </h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                Connect with your alumni mentors • Ask questions • Get guidance
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <GlassCard variant="light" className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                                    Active Mentors
                                </p>
                                <p className="text-3xl font-black text-success">{acceptedMentorships.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                <CheckCircle className="text-success" size={24} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard variant="light" className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                                    Pending
                                </p>
                                <p className="text-3xl font-black text-warning">{pendingMentorships.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                                <Clock className="text-warning" size={24} />
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard variant="light" className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">
                                    Total Requests
                                </p>
                                <p className="text-3xl font-black text-primary">{mentorships.length}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Users className="text-primary" size={24} />
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* Accepted Mentorships */}
                {acceptedMentorships.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-2xl font-black text-foreground mb-6">Active Mentorships</h2>
                        <div ref={cardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {acceptedMentorships.map((mentorship) => (
                                <GlassCard
                                    key={mentorship._id}
                                    variant="light"
                                    className="p-6 hover-lift relative overflow-hidden"
                                >
                                    {/* Gradient Overlay */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success/5 to-transparent rounded-full blur-3xl"></div>

                                    <div className="relative">
                                        {/* Status Badge */}
                                        <div className={`absolute top-0 right-0 flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs uppercase ${getStatusColor(mentorship.status)}`}>
                                            {getStatusIcon(mentorship.status)}
                                            {mentorship.status}
                                        </div>

                                        {/* Mentor Info */}
                                        <div className="mb-4 pt-8">
                                            <h3 className="text-xl font-black text-foreground mb-1">
                                                {mentorship.alumni.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                @{mentorship.alumni.username}
                                            </p>
                                        </div>

                                        {/* Mentor Details */}
                                        <div className="space-y-3 mb-6">
                                            {mentorship.alumni.currentCompany && (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="text-primary" size={14} />
                                                    <span className="text-sm font-medium text-foreground">
                                                        {mentorship.alumni.currentPosition || 'Professional'} at {mentorship.alumni.currentCompany}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="text-warning" size={14} />
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    Domain: {mentorship.domain}
                                                </span>
                                            </div>
                                            {mentorship.alumni.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="text-muted-foreground" size={14} />
                                                    <span className="text-xs text-muted-foreground">
                                                        {mentorship.alumni.email}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <Link to={`/mentorship-chat/${mentorship._id}`}>
                                            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors mb-2">
                                                <MessageCircle size={16} />
                                                Message Mentor
                                            </button>
                                        </Link>
                                        <Link to={`/mentorship-chat/${mentorship._id}`} state={{ openTab: 'roadmap' }}>
                                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/20 text-primary rounded-xl text-sm font-bold hover:from-primary/30 hover:to-purple-500/30 transition-all">
                                                🗺️ View AI Roadmap & Quiz
                                            </button>
                                        </Link>

                                        <p className="text-xs text-muted-foreground text-center mt-3">
                                            Connected {new Date(mentorship.createdAt).toLocaleDateString()}
                                        </p>

                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Mentorships */}
                {pendingMentorships.length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-2xl font-black text-foreground mb-6 underline decoration-warning/30 underline-offset-8">Mentorship Requests Sent to You</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {pendingMentorships.map((mentorship) => (
                                <GlassCard
                                    key={mentorship._id}
                                    variant="light"
                                    className="p-6 border-2 border-warning/20 shadow-xl shadow-warning/5 relative overflow-hidden"
                                >
                                    {/* Pulse Indicator */}
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse"></div>
                                        <span className="text-[10px] font-bold text-warning uppercase tracking-widest">Action Required</span>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="text-xl font-black text-foreground mb-1">
                                            {mentorship.alumni.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            @{mentorship.alumni.username} • Alumni Mentor
                                        </p>
                                    </div>

                                    <div className="bg-muted/30 rounded-2xl p-4 mb-6">
                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <MessageCircle size={12} className="text-primary" />
                                            Invitation Message:
                                        </p>
                                        <p className="text-sm text-foreground font-medium italic">
                                            "{mentorship.message || `I'd like to guide you in ${mentorship.domain}`}"
                                        </p>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="text-primary" size={14} />
                                            <span className="text-sm font-bold text-foreground">
                                                Domain: {mentorship.domain}
                                            </span>
                                        </div>
                                        {mentorship.alumni.currentCompany && (
                                            <div className="flex items-center gap-2">
                                                <Building2 className="text-muted-foreground" size={14} />
                                                <span className="text-xs text-muted-foreground">
                                                    {mentorship.alumni.currentPosition} at {mentorship.alumni.currentCompany}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleUpdateStatus(mentorship._id, 'accepted')}
                                            className="flex-1 py-3 bg-success text-success-foreground rounded-xl text-sm font-bold hover:bg-success/90 transition-all hover:scale-[1.02]"
                                        >
                                            Accept Mentorship
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(mentorship._id, 'rejected')}
                                            className="px-4 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold hover:bg-destructive hover:text-destructive-foreground transition-all"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {mentorships.length === 0 && !isLoading && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
                            <Users className="text-muted-foreground" size={32} />
                        </div>
                        <h3 className="text-xl font-black text-foreground mb-2">No Mentorships Yet</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Start by requesting mentorship from experienced alumni
                        </p>
                        <button className="px-6 py-3 btn-primary">
                            Request Mentorship
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default StudentMentorship;

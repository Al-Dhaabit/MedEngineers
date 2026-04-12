"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Ticket, 
  Sparkles, 
  Users, 
  Mic2, 
  Wrench, 
  Presentation, 
  RadioTower, 
  MessageSquare, 
  Trophy, 
  Star, 
  Flag, 
  MapPin, 
  Clock,
  CalendarDays,
  ZoomIn,
  X,
  ArrowLeft,
  LayoutList,
  LayoutGrid,
  Timer,
  Target,
  Shield,
  Plus,
  Trash2,
  UserCircle,
  Eye,
  Swords,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  ChevronUp,
  Briefcase,
  Download,
  type LucideIcon,
} from "lucide-react";

/* ─── TYPES ─── */
type TimelineStatus = "done" | "now" | "upcoming";

interface TimelineNode {
  time: string;
  label: string;
  status: TimelineStatus;
}

interface AgendaItem {
  id: number;
  time: string;
  endTime: string;
  duration: string;
  title: string;
  description: string;
  location: string;
  icon: LucideIcon;
  color: string;
  shadow: string;
  category: string;
  status: string;
}

interface SpeakerType {
  id: number;
  name: string;
  initials: string;
  role: string;
  talkTitle: string;
  time: string;
  duration: string;
  tags: string[];
  avatarColor: string;
  upvotes: number;
}

interface TeamMember {
  email: string;
  name?: string;
  mobile?: string;
  role?: string;
}

interface Team {
  id: number;
  name: string;
  members: TeamMember[];
  emoji: string;
  colorClass: string;
}

/* ─── AGENDA DATA ─── */
const agendaItems: AgendaItem[] = [
  {
    id: 1,
    time: "7:30 AM",
    endTime: "8:00 AM",
    duration: "30 min",
    title: "Pre-event Setup",
    description: "Pre-event setup and final checks before the event starts!",
    location: "Main Venue",
    icon: CheckCircle2,
    color: "bg-emerald-500",
    shadow: "shadow-emerald-500/30",
    category: "Setup",
    status: "upcoming",
  },
  {
    id: 2,
    time: "8:00 AM",
    endTime: "9:00 AM",
    duration: "1 hour",
    title: "Registrations & Activities",
    description: "Registrations open, side activities setup and open to all attendees.",
    location: "Main Entrance",
    icon: Ticket,
    color: "bg-blue-500",
    shadow: "shadow-blue-500/30",
    category: "Registration",
    status: "upcoming",
  },
  {
    id: 3,
    time: "9:00 AM",
    endTime: "9:15 AM",
    duration: "15 min",
    title: "Opening Ceremony",
    description: "Opening ceremony commences to kick off MedEngineers 2026.",
    location: "MAIN AUDITORIUM",
    icon: Sparkles,
    color: "bg-purple-500",
    shadow: "shadow-purple-500/30",
    category: "Ceremony",
    status: "upcoming",
  },
  {
    id: 4,
    time: "9:15 AM",
    endTime: "9:45 AM",
    duration: "30 min",
    title: "Team Formation & Festival",
    description: "Teams start working together to decide upon a topic for their presentation. Meanwhile, activities, sponsor booths, food stalls and the club stall (festival) begin.",
    location: "MAIN BUILDING ROTUNDA & MAIN PLAZA",
    icon: Users,
    color: "bg-amber-500",
    shadow: "shadow-amber-500/30",
    category: "Activity",
    status: "upcoming",
  },
  {
    id: 5,
    time: "10:00 AM",
    endTime: "2:00 PM",
    duration: "4 hours",
    title: "Sponsor Keynotes",
    description: "Keynote speeches from sponsors commence, with live updates and tracking on our official website, organized through timeslots.",
    location: "MAIN AUDITORIUM + HALL A & B",
    icon: Mic2,
    color: "bg-indigo-500",
    shadow: "shadow-indigo-500/30",
    category: "Keynote",
    status: "upcoming",
  },
  {
    id: 6,
    time: "12:00 PM",
    endTime: "12:30 PM",
    duration: "30 min",
    title: "Prototyping Mentorship",
    description: "Mentorship period in collaboration with IEEE for 25 prototyping teams for guidance purposes. These teams work in individual classrooms.",
    location: "ENGINEERING BUILDING",
    icon: Wrench,
    color: "bg-pink-500",
    shadow: "shadow-pink-500/30",
    category: "Workshop",
    status: "upcoming",
  },
  {
    id: 7,
    time: "12:30 PM",
    endTime: "2:00 PM",
    duration: "1.5 hours",
    title: "Poster Concept Mentorship",
    description: "Mentorship period in collaboration with IEEE for 75 teams for guidance on their posters and concepts.",
    location: "MAIN BUILDING ROTUNDA",
    icon: Presentation,
    color: "bg-rose-500",
    shadow: "shadow-rose-500/30",
    category: "Workshop",
    status: "upcoming",
  },
  {
    id: 8,
    time: "2:00 PM",
    endTime: "3:00 PM",
    duration: "1 hour",
    title: "Keynote Speeches",
    description: "Keynote speeches continue for all participants.",
    location: "MAIN AUDITORIUM",
    icon: RadioTower,
    color: "bg-sky-500",
    shadow: "shadow-sky-500/30",
    category: "Keynote",
    status: "upcoming",
  },
  {
    id: 9,
    time: "3:00 PM",
    endTime: "4:00 PM",
    duration: "1 hour",
    title: "Panel Discussion",
    description: "Panel discussion commences, speakers get 10 minutes each (8 minutes for speeches + 2 for Q/A).",
    location: "MAIN AUDITORIUM",
    icon: MessageSquare,
    color: "bg-cyan-500",
    shadow: "shadow-cyan-500/30",
    category: "Discussion",
    status: "upcoming",
  },
  {
    id: 10,
    time: "4:00 PM",
    endTime: "6:30 PM",
    duration: "2.5 hours",
    title: "Presentations & Pitching",
    description: "All 100 teams submit their presentations, prototype development time ends. Pitching in the MAIN AUDITORIUM for the 25 prototyping teams begins, and the other 75 teams present their posters. Festival continues until 7:30 PM.",
    location: "MAIN AUDITORIUM / MAIN PLAZA",
    icon: Trophy,
    color: "bg-yellow-500",
    shadow: "shadow-yellow-500/30",
    category: "Presentation",
    status: "upcoming",
  },
  {
    id: 11,
    time: "6:30 PM",
    endTime: "7:00 PM",
    duration: "30 min",
    title: "Awards & Closing Ceremony",
    description: "Awards ceremony, followed by the closing ceremony, and a final event group picture.",
    location: "MAIN AUDITORIUM",
    icon: Star,
    color: "bg-purple-600",
    shadow: "shadow-purple-600/30",
    category: "Ceremony",
    status: "upcoming",
  },
  {
    id: 12,
    time: "7:00 PM",
    endTime: "",
    duration: "",
    title: "Event Concludes",
    description: "Participants exit, cleanup begins, event ends!",
    location: "Main Exit",
    icon: Flag,
    color: "bg-slate-500",
    shadow: "shadow-slate-500/30",
    category: "Closing",
    status: "upcoming",
  }
];

/* ─── TIMELINE NODES ─── */
const timelineNodes: TimelineNode[] = [
  { time: "8AM", label: "Doors Open", status: "upcoming" },
  { time: "9AM", label: "Opening Ceremony", status: "upcoming" },
  { time: "10AM", label: "Sponsor Keynotes", status: "upcoming" },
  { time: "12PM", label: "Mentorship", status: "upcoming" },
  { time: "3PM", label: "Panel Discussion", status: "upcoming" },
  { time: "4PM", label: "Presentations", status: "upcoming" },
  { time: "7PM", label: "Closing", status: "upcoming" },
];

/* ─── CATEGORY COLORS ─── */
const categoryColors: Record<string, string> = {
  Setup: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Registration: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Ceremony: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Activity: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Keynote: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  Workshop: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  Discussion: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Presentation: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Closing: "text-slate-400 bg-slate-400/10 border-slate-400/20",
};

/* ─── TEAM COLORS (avatar) ─── */
const TEAM_COLORS = [
  "bg-blue-500/20 text-blue-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-purple-500/20 text-purple-400",
  "bg-[#007b8a]/20 text-[#007b8a]",
  "bg-red-500/20 text-red-400",
  "bg-cyan-500/20 text-cyan-400",
  "bg-orange-500/20 text-orange-400",
  "bg-green-500/20 text-green-400",
];

const TEAM_EMOJIS = ["🚀", "💡", "⚡", "🔥", "🌟", "🎯", "🛸", "🦁", "🐉", "🎪", "🔮", "💎"];

function getInitials(name?: string): string {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── STAT CARD COMPONENT ─── */
function StatCard({ value, label, accentColor, icon: Icon }: { value: string; label: string; accentColor: string; icon: LucideIcon }) {
  return (
    <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 md:p-6 overflow-hidden group hover:border-white/[0.15] transition-all duration-300">
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[60px] opacity-[0.06] ${accentColor}`} />
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-white/[0.06]`}>
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${accentColor.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <div className={`text-2xl md:text-3xl font-extrabold tracking-tight font-mono ${accentColor.replace('bg-', 'text-')}`}>
            {value}
          </div>
          <div className="text-xs md:text-sm text-gray-400 mt-0.5">{label}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── TIMELINE DOT ─── */
function TimelineDot({ node }: { node: TimelineNode }) {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0 w-[95px] md:w-[120px]">
      <div className={`
        w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold font-mono
        border-2 transition-all duration-300
        ${node.status === "done"
          ? "bg-[#007b8a] border-[#007b8a] text-white shadow-[0_0_20px_rgba(0,123,138,0.4)]" 
          : node.status === "now"
          ? "bg-black/40 border-[#007b8a] text-[#007b8a] animate-pulse" 
          : "bg-black border-white/10 text-gray-500"
        }
      `}>
        {node.status === "done" ? "✓" : node.time}
      </div>
      <div className="text-center max-w-[80px]">
        <div className="text-[10px] md:text-xs font-medium text-gray-300 leading-tight">{node.label}</div>
        <span className={`
          inline-block mt-1 text-[9px] font-semibold px-2 py-0.5 rounded
          ${node.status === "done"
            ? "bg-emerald-500/15 text-emerald-400"
            : node.status === "now"
            ? "bg-[#007b8a]/15 text-[#007b8a]"
            : "bg-white/5 text-gray-500"
          }
        `}>
          {node.status === "done" ? "Done" : node.status === "now" ? "Now" : "Upcoming"}
        </span>
      </div>
    </div>
  );
}

/* ─── AGENDA CARD (LIST VIEW) ─── */
function AgendaCardList({ item }: { item: AgendaItem }) {
  const IconComponent = item.icon;
  const catColor = categoryColors[item.category] || "text-gray-400 bg-gray-400/10 border-gray-400/20";

  return (
    <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 md:p-6 flex flex-row items-start gap-4 md:gap-8 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] group">
      
      {/* Date/Time Left side */}
      <div className="flex flex-col items-center shrink-0 w-[60px] md:w-[90px]">
        <div className="text-sm md:text-lg font-bold font-mono text-white text-center">{item.time}</div>
        {item.duration && (
          <div className="text-[10px] md:text-xs text-gray-500 font-mono mt-0.5">{item.duration}</div>
        )}
        <div className={`mt-3 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 border border-white/10 bg-white/[0.04]`}>
          <IconComponent className={`w-4 h-4 md:w-5 md:h-5 ${item.color.replace('bg-', 'text-')}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="text-base md:text-lg font-semibold text-white">{item.title}</h3>
          <span className={`inline-flex items-center text-[9px] md:text-[10px] font-semibold px-2 py-0.5 rounded border ${catColor}`}>
            {item.category}
          </span>
        </div>
        <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-2 line-clamp-2">{item.description}</p>
        {item.location && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              <MapPin className="w-3 h-3 text-[#007b8a]" />
              <span className="font-semibold tracking-wide uppercase">{item.location}</span>
            </span>
            {item.endTime && (
              <span className="inline-flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="font-mono">{item.time} – {item.endTime}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Time badge (desktop) */}
      <div className="hidden lg:flex items-center text-sm font-bold text-[#007b8a] bg-[#007b8a]/10 border border-[#007b8a]/20 px-4 py-1.5 rounded-full whitespace-nowrap shrink-0">
        <Clock className="w-3.5 h-3.5 mr-2" />
        {item.time}{item.endTime ? ` – ${item.endTime}` : ""}
      </div>
    </div>
  );
}

/* ─── AGENDA CARD (GRID VIEW) ─── */
function AgendaCardGrid({ item }: { item: AgendaItem }) {
  const IconComponent = item.icon;
  const catColor = categoryColors[item.category] || "text-gray-400 bg-gray-400/10 border-gray-400/20";

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] hover:-translate-y-1 group flex flex-col h-full">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.04]`}>
          <IconComponent className={`w-5 h-5 ${item.color.replace('bg-', 'text-')}`} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm md:text-base font-semibold text-white truncate">{item.title}</h3>
          <div className="text-[10px] md:text-xs text-gray-500 font-mono">{item.time}{item.endTime ? ` – ${item.endTime}` : ""}</div>
        </div>
      </div>

      {/* Category tag */}
      <span className={`inline-flex items-center self-start text-[9px] md:text-[10px] font-semibold px-2 py-0.5 rounded border mb-3 ${catColor}`}>
        {item.category} · {item.duration}
      </span>

      {/* Description */}
      <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-3 flex-1">{item.description}</p>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <MapPin className="w-3 h-3 text-[#007b8a] shrink-0" />
        <span className="text-[10px] font-semibold tracking-wide uppercase text-gray-500 truncate">{item.location}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD TEAM MODAL
═══════════════════════════════════════════ */
function AddTeamModal({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (team: Team) => void }) {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<TeamMember[]>([{ email: "" }]);

  const addMember = () => setMembers([...members, { email: "" }]);
  const removeMember = (index: number) => setMembers(members.filter((_, i) => i !== index));
  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleSave = () => {
    if (!teamName.trim()) return alert("Enter a team name");
    
    const validMembers = members.filter(m => m.email.trim());
    if (!validMembers.length) return alert("Add at least one member with an email");

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const member of validMembers) {
      if (!emailRegex.test(member.email.trim())) {
        return alert(`Invalid email address format: ${member.email}`);
      }
    }

    onSave({
      id: Date.now(),
      name: teamName.trim(),
      members: validMembers,
      emoji: TEAM_EMOJIS[Math.floor(Math.random() * TEAM_EMOJIS.length)],
      colorClass: TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)],
    });
    setTeamName("");
    setMembers([{ email: "" }]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#111118] border border-white/10 rounded-2xl p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full border border-white/10 bg-transparent text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all">
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          Add <span className="text-[#007b8a] italic font-[family-name:var(--font-playfair)]">Team</span>
        </h2>

        {/* Team Name */}
        <div className="mb-5">
          <label className="block text-[10px] font-bold tracking-[1px] uppercase text-gray-500 mb-2">Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="e.g. Team Phoenix"
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm px-4 py-3 focus:outline-none focus:border-[#007b8a] transition-colors placeholder:text-gray-600"
          />
        </div>

        {/* Members */}
        <div className="text-[10px] font-bold tracking-[1px] uppercase text-gray-500 mb-3">Members</div>
        {members.map((member, i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold tracking-[1px] uppercase text-gray-500">Member {i + 1}</span>
              {members.length > 1 && (
                <button onClick={() => removeMember(i)} className="text-[10px] text-red-400 hover:text-red-300 border border-white/10 px-2 py-0.5 rounded hover:bg-white/5 transition-all">✕</button>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold tracking-[1px] uppercase text-gray-500">Email Address</label>
                {member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim()) && (
                  <span className="text-[9px] text-red-500 font-bold tracking-wide uppercase animate-pulse">Invalid Format</span>
                )}
              </div>
              <input 
                type="email" 
                value={member.email || ""} 
                onChange={e => updateMember(i, "email", e.target.value)} 
                placeholder="user@example.com"
                className={`w-full bg-white/[0.04] border rounded-lg text-white text-xs px-3 py-2.5 focus:outline-none transition-colors placeholder:text-gray-600 ${
                  member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email.trim())
                    ? "border-red-500/50 focus:border-red-500" 
                    : "border-white/10 focus:border-[#007b8a]"
                }`} 
              />
            </div>
          </div>
        ))}

        <button onClick={addMember} className="text-xs font-medium text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg hover:border-white/20 hover:text-gray-200 transition-all mb-6">
          ＋ Add Member
        </button>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-5 border-t border-white/10">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-400 border border-white/10 rounded-xl hover:border-white/20 hover:text-gray-200 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold bg-[#007b8a] text-white rounded-xl hover:bg-[#008f9f] transition-all shadow-[0_0_15px_rgba(0,123,138,0.3)]">
            Save Team
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   ADMIN PANEL COMPONENT
   (Now accepts preview toggle props)
═══════════════════════════════════════════ */
function AdminPanel({ 
  adminView, 
  onViewChange,
  productsCount
}: { 
  adminView: "management" | "attendee" | "competitor"; 
  onViewChange: (view: "management" | "attendee" | "competitor") => void;
  productsCount: number;
}) {
  const [teams, setTeams] = useState<Team[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("medhack_teams");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [teamViewMode, setTeamViewMode] = useState<"table" | "cards">("table");
  const [showAddTeam, setShowAddTeam] = useState(false);

  // Persist teams
  useEffect(() => {
    localStorage.setItem("medhack_teams", JSON.stringify(teams));
  }, [teams]);

  const addTeam = (team: Team) => setTeams([...teams, team]);
  const deleteTeam = (id: number) => {
    if (confirm("Remove this team and all their members?")) {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  // Flatten for table
  const allMembers = teams.flatMap(t => t.members.map(m => ({ ...m, team: t })));

  const isPreview = adminView !== "management";

  return (
    <div className="space-y-6">
      {/* Admin Section Header - ALWAYS CLEAR */}
      <div className="mt-4 mb-2 p-6 md:p-8 bg-white/[0.02] border border-white/10 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#007b8a]/5 blur-[80px] -mr-10 -mt-10 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#007b8a]/20 flex items-center justify-center border border-[#007b8a]/30 shadow-[0_0_20px_rgba(0,123,138,0.1)]">
              <Shield className="w-6 h-6 text-[#007b8a]" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">Admin <span className="text-[#007b8a] italic font-medium font-[family-name:var(--font-playfair)]">Dashboard</span></h2>
              </div>
              <p className="text-gray-500 text-sm mt-1 font-medium italic">Full administrative oversight for MedEngineers 2026</p>
            </div>
          </div>

          {/* View Selection Toggle */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
            <button 
              onClick={() => onViewChange("management")}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-[1px] uppercase transition-all ${adminView === "management" ? "bg-[#007b8a] text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
            >
              Management
            </button>
            <button 
              onClick={() => onViewChange("competitor")}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-[1px] uppercase transition-all ${adminView === "competitor" ? "bg-amber-500/80 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
            >
              Competitor Preview
            </button>
            <button 
              onClick={() => onViewChange("attendee")}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold tracking-[1px] uppercase transition-all ${adminView === "attendee" ? "bg-blue-500/80 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
            >
              Attendee Preview
            </button>
          </div>
        </div>
      </div>

      {/* Admin Content - DIMMED IN PREVIEW MODES */}
      <div className={`transition-all duration-700 ${isPreview ? "opacity-30 grayscale blur-[4px] pointer-events-none scale-[0.98]" : "opacity-100"}`}>

      {/* Stats row - Unified and simplified */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        <StatCard value={String(teams.length)} label="Total Teams" accentColor="bg-[#007b8a]" icon={Users} />
        <StatCard value={String(allMembers.length)} label="Total Contestants" accentColor="bg-blue-500" icon={UserCircle} />
        <StatCard value={String(productsCount)} label="Products Submitted" accentColor="bg-emerald-500" icon={LayoutList} />
      </div>

      {/* Teams & Members section label */}
      <div className="text-[10px] font-bold tracking-[2px] uppercase text-gray-500 mb-4">
        Teams & Members
      </div>

      {/* View bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTeamViewMode("table")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
              teamViewMode === "table"
                ? "bg-[#007b8a] border-[#007b8a] text-white"
                : "bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setTeamViewMode("cards")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
              teamViewMode === "cards"
                ? "bg-[#007b8a] border-[#007b8a] text-white"
                : "bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
        </div>
        <button
          onClick={() => setShowAddTeam(true)}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#007b8a] text-white rounded-xl hover:bg-[#008f9f] transition-all shadow-[0_0_15px_rgba(0,123,138,0.3)]"
        >
          <Plus className="w-4 h-4" />
          Add Team
        </button>
      </div>

      {/* ─── TABLE VIEW ─── */}
      {teamViewMode === "table" && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
          {allMembers.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-sm">No teams yet — click Add Team to start</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/[0.04]">
                    <th className="px-4 md:px-5 py-3 text-left text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500">#</th>
                    <th className="px-4 md:px-5 py-3 text-left text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500">Member</th>
                    <th className="px-4 md:px-5 py-3 text-left text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500">Team</th>
                    <th className="px-4 md:px-5 py-3 text-left text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500 hidden md:table-cell">Mobile</th>
                    <th className="px-4 md:px-5 py-3 text-left text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500 hidden md:table-cell">Role</th>
                    <th className="px-4 md:px-5 py-3 text-left text-[10px] font-bold tracking-[1.5px] uppercase text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allMembers.map((member, i) => (
                    <tr key={`${member.team.id}-${i}`} className="border-t border-white/[0.06] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 md:px-5 py-3.5 text-xs text-gray-500 font-mono">{String(i + 1).padStart(2, "0")}</td>
                      <td className="px-4 md:px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${member.team.colorClass}`}>
                            {getInitials(member.name || member.email)}
                          </div>
                          <span className="text-sm text-white font-medium">{member.name || member.email}</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md px-2.5 py-1 text-xs font-mono">
                          <span>{member.team.emoji}</span>
                          <span className="text-gray-300">{member.team.name}</span>
                        </span>
                      </td>
                      <td className="px-4 md:px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-gray-400 font-mono">{member.mobile || "—"}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-gray-400">{member.role || "—"}</span>
                      </td>
                      <td className="px-4 md:px-5 py-3.5">
                        <button
                          onClick={() => deleteTeam(member.team.id)}
                          className="text-xs font-semibold text-red-400 border border-red-400/30 bg-transparent px-3 py-1 rounded-md hover:bg-red-400/10 transition-all"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── CARDS VIEW ─── */}
      {teamViewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.length === 0 ? (
            <div className="text-center py-16 text-gray-500 col-span-full">
              <div className="text-4xl mb-4">👥</div>
              <p className="text-sm">No teams added yet</p>
            </div>
          ) : (
            teams.map(team => (
              <div key={team.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 transition-all duration-300 hover:border-white/[0.15] hover:-translate-y-1">
                {/* Card header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${team.colorClass}`}>
                    {team.emoji}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-white">{team.name}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</div>
                  </div>
                </div>

                {/* Members list */}
                <div className="flex flex-col gap-2 mb-4">
                  {team.members.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${team.colorClass}`}>
                        {getInitials(m.name || m.email)}
                      </div>
                      <span className="flex-1 truncate">{m.name || m.email}</span>
                      {m.mobile && <span className="text-[10px] text-gray-600 font-mono">{m.mobile}</span>}
                    </div>
                  ))}
                </div>

                {/* Card footer */}
                <div className="flex justify-end pt-3 border-t border-white/5">
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-400 border border-red-400/30 bg-transparent px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
    {/* Add Team Modal - Outside dimmed area */}
    <AddTeamModal isOpen={showAddTeam} onClose={() => setShowAddTeam(false)} onSave={addTeam} />
    </div>
  );
}


/* ═══════════════════════════════════════════
   DEV MODE ROLE TYPES
═══════════════════════════════════════════ */
type UserRole = "attendee" | "competitor" | "admin";

const ROLE_CONFIG: Record<UserRole, { label: string; icon: LucideIcon; color: string; bgColor: string; borderColor: string; description: string }> = {
  attendee: { label: "Attendee", icon: Eye, color: "text-blue-400", bgColor: "bg-blue-500/15", borderColor: "border-blue-500/30", description: "Public view — schedule only" },
  competitor: { label: "Competitor", icon: Swords, color: "text-amber-400", bgColor: "bg-amber-500/15", borderColor: "border-amber-500/30", description: "Participant view — schedule + team info" },
  admin: { label: "Admin", icon: Shield, color: "text-[#007b8a]", bgColor: "bg-[#007b8a]/15", borderColor: "border-[#007b8a]/30", description: "Full access — manage teams & members" },
};

/* ─── DEV MODE SWITCHER ─── */
function DevRoleSwitcher({ currentRole, onRoleChange }: { currentRole: UserRole; onRoleChange: (role: UserRole) => void }) {
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev) return null;

  return (
    <div className="fixed top-3 right-3 z-[1000] group">
      <div className="flex items-center gap-1 bg-[#111118]/80 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-xl hover:bg-[#111118] transition-all duration-300">
        {(Object.keys(ROLE_CONFIG) as UserRole[]).map((role) => {
          const config = ROLE_CONFIG[role];
          const RoleIcon = config.icon;
          const isActive = currentRole === role;
          return (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`p-2 rounded-full transition-all duration-200 relative group/btn ${
                isActive
                  ? `${config.bgColor} ${config.color} shadow-lg shadow-black/50`
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <RoleIcon className="w-3.5 h-3.5" />
              {/* Minimal Tooltip */}
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black text-[9px] font-bold text-white rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-2xl">
                {config.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type ProjectType = {
  id: number;
  team: string;
  title: string;
  description: string;
  imageUrl: string;
  baseVotes: number;
  members: { initials: string; name: string; phone: string }[];
};

const MOCK_PROJECTS: ProjectType[] = [];

/* ═══════════════════════════════════════════
   MAIN AGENDA PAGE (inner, reads searchParams)
═══════════════════════════════════════════ */
function AgendaPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDev = process.env.NODE_ENV === "development";

  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [activeFilter, setActiveFilter] = useState("All");
  const [currentRole, setCurrentRole] = useState<UserRole>("attendee");
  const [roleLoading, setRoleLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState<{title: string, imageUrl: string, description: string} | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [votedProjectId, setVotedProjectId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);

  // Speaker state
  const [speakers, setSpeakers] = useState<SpeakerType[]>([]);
  const [showAddSpeakerModal, setShowAddSpeakerModal] = useState(false);
  const [speakerViewMode, setSpeakerViewMode] = useState<"list" | "grid">("list");
  const [speakerUpvotes, setSpeakerUpvotes] = useState<Record<number, boolean>>({});
  const [spkName, setSpkName] = useState("");
  const [spkRole, setSpkRole] = useState("");
  const [spkTalkTitle, setSpkTalkTitle] = useState("");
  const [spkTime, setSpkTime] = useState("");
  const [spkDuration, setSpkDuration] = useState("");
  const [spkTags, setSpkTags] = useState("");
  const [adminView, setAdminView] = useState<"management" | "attendee" | "competitor">("management");

  useEffect(() => {
    if (showSubmitModal || selectedProject || showAddSpeakerModal || isMapExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [showSubmitModal, selectedProject, showAddSpeakerModal, isMapExpanded]);

  // Determine role on mount: dev query param or real session check
  useEffect(() => {
    const roleParam = searchParams.get("role") as UserRole | null;

    if (isDev && roleParam && ["attendee", "competitor", "admin"].includes(roleParam)) {
      setCurrentRole(roleParam);
      setRoleLoading(false);
      return;
    }

    // Production: check real admin session
    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/verify-session", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.admin === true) {
            setCurrentRole("admin");
          }
        }
      } catch {
        // Not admin, that's fine
      } finally {
        setRoleLoading(false);
      }
    };
    checkAdmin();
  }, [searchParams, isDev]);

  // Dev role switcher handler
  const handleRoleChange = useCallback((role: UserRole) => {
    setCurrentRole(role);
    if (isDev) {
      const url = new URL(window.location.href);
      url.searchParams.set("role", role);
      window.history.replaceState({}, "", url.toString());
    }
  }, [isDev]);

  const categories = ["All", ...Array.from(new Set(agendaItems.map(i => i.category)))];

  const filteredItems = activeFilter === "All" 
    ? agendaItems 
    : agendaItems.filter(i => i.category === activeFilter);

  // Compute stats
  const totalSessions = agendaItems.length;
  const totalCategories = new Set(agendaItems.map(i => i.category)).size;
  const totalHours = "11.5";
  const daysToEvent = Math.max(0, Math.ceil((new Date("2026-05-23").getTime() - new Date().getTime()) / 86400000));

  const canVote = currentRole === "attendee";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c0c] via-[#050505] to-[#121212] relative overflow-hidden text-gray-100 font-sans">
      {/* Background glowing effects - Subnormal Mesh Gradient */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#007b8a]/5 via-transparent to-transparent pointer-events-none opacity-40" />
      <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] rounded-full bg-[#007b8a]/3 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-900/3 blur-[120px] pointer-events-none" />

      {/* Dev Role Switcher */}
      <DevRoleSwitcher currentRole={currentRole} onRoleChange={handleRoleChange} />
      
      {/* ─── FULL-SCREEN MAP MODAL (ROOT LEVEL) ─── */}
      {isMapExpanded && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center bg-black p-4 md:p-10 overflow-y-auto animate-in fade-in zoom-in-95 duration-300"
          onClick={() => setIsMapExpanded(false)}
        >
          {/* Control Bar - Top Right */}
          <div className="sticky top-0 w-full flex justify-end mb-4 z-[10000] pointer-events-none">
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all duration-300 border border-white/10 group pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setIsMapExpanded(false);
              }}
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          
          <div 
            className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Image 
              src="/images/event_map.jpg" 
              alt="Expanded University Event Map" 
              fill
              className="object-contain drop-shadow-[0_0_50px_rgba(0,123,138,0.3)]"
              sizes="90vw"
              priority
            />
          </div>
          
          {/* Download Button Below Map */}
          <div className="mt-8 mb-24 flex flex-col items-center gap-4 shrink-0">
            <a 
              href="/images/event_map.jpg"
              download="MedEngineers_Event_Map.jpg"
              className="flex items-center gap-2 px-8 py-4 bg-[#007b8a] hover:bg-[#008f9f] text-white rounded-full font-bold text-base transition-all duration-300 shadow-2xl shadow-[#007b8a]/40 scale-100 hover:scale-105 active:scale-95"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-5 h-5" />
              Download Map
            </a>
          </div>
        </div>
      )}

      {/* Navigation Back */}
      <div className={`absolute top-6 md:top-10 left-4 md:left-8 lg:left-12 xl:left-16 z-20 animate-in fade-in duration-700 transition-opacity ${isMapExpanded ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <Link 
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full hover:bg-white/10 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-20 pt-28 max-w-6xl">
        
        {/* ─── ADMIN DASHBOARD (TOP LEVEL) ─── */}
        {!roleLoading && currentRole === "admin" && (
          <div className="animate-in fade-in slide-in-from-top-6 duration-1000 mb-10">
            <AdminPanel 
              adminView={adminView} 
              onViewChange={setAdminView}
              productsCount={MOCK_PROJECTS.length + (submittedProduct ? 1 : 0)}
            />
          </div>
        )}

        {/* ─── PUBLIC STAT CARDS ─── */}
        {currentRole !== "admin" && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100 fill-mode-both">
            {currentRole === "attendee" ? (
              <>
                <StatCard value="0" label="Speakers" accentColor="bg-[#007b8a]" icon={Mic2} />
                <StatCard value="0" label="Sessions" accentColor="bg-blue-500" icon={CalendarDays} />
                <StatCard value="0" label="Total Votes" accentColor="bg-rose-500" icon={Heart} />
              </>
            ) : (
              <>
                <StatCard value="0" label="Total Teams" accentColor="bg-[#007b8a]" icon={Users} />
                <StatCard value="0" label="Total Members" accentColor="bg-blue-500" icon={UserCircle} />
                <StatCard value="0" label="Products Submitted" accentColor="bg-emerald-500" icon={LayoutList} />
              </>
            )}
          </div>
        )}

        {/* ─── MANAGEMENT MODE SPECIFIC SECTIONS ─── */}
        {currentRole === "admin" && adminView === "management" && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            {/* These management versions will be rendered here.
                I'll define them as distinct blocks or just reuse parts but with admin checks.
                For now, I'll move the Speaker and Product sections here. */}
          </div>
        )}

        {/* ─── PUBLIC/PREVIEW FLOW (Hidden in Management Mode) ─── */}
        { (currentRole !== "admin" || adminView !== "management") && (
          <div className="space-y-16 animate-in fade-in duration-700">
            {/* ─── HEADER ─── */}
            <div className="text-center mb-14 animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both">
              <div className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[#007b8a]/30 bg-[#007b8a]/10 text-[#007b8a] text-sm font-bold tracking-widest mb-6 shadow-[0_0_20px_rgba(0,123,138,0.2)]">
                <CalendarDays className="w-4 h-4 mr-2" />
                EVENT FLOW
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 pb-2 md:pb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400/80 leading-[1.1]">
                Agenda
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
                Follow the official schedule to catch every keynote, presentation, and ceremony taking place at MedEngineers 2026.
              </p>
            </div>

            {/* ─── MAP SECTION ─── */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">
          <div 
            className="p-1 rounded-3xl bg-gradient-to-b from-white/10 to-transparent shadow-2xl relative group cursor-pointer"
            onClick={() => setIsMapExpanded(true)}
          >
            <div className="absolute inset-0 bg-[#007b8a]/20 blur-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none rounded-3xl" />
            
            <div className="relative rounded-[22px] overflow-hidden border border-white/5 bg-black/40 group isolate">
              <Image 
                src="/images/event_map.jpg" 
                alt="University Event Map" 
                width={1200} 
                height={800} 
                className="w-full h-auto object-cover opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80"
              />
              
              {/* Click to Enlarge Overlay Label */}
              <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-transform duration-300 group-hover:-translate-y-1">
                <div className="flex items-center gap-1.5 md:gap-2 bg-[#007b8a]/90 backdrop-blur-md px-3 md:px-6 py-1.5 md:py-3 rounded-full border border-white/20 shadow-xl">
                  <ZoomIn className="w-3 h-3 md:w-5 md:h-5 text-white animate-pulse" />
                  <span className="text-white font-bold tracking-wide uppercase text-[10px] sm:text-xs md:text-sm drop-shadow-sm whitespace-nowrap">
                    Tap to Enlarge Map
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── HORIZONTAL TIMELINE ─── */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 mb-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300 fill-mode-both">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-gray-500 mb-6">
            Event Day Schedule Overview
          </div>
          <div className="relative mt-4">
            {/* Rail */}
            <div className="absolute top-5 md:top-6 left-8 right-8 h-0.5 bg-white/10" />
            {/* Fill (0% for upcoming) */}
            <div className="absolute top-5 md:top-6 left-8 h-0.5 bg-gradient-to-r from-[#007b8a] to-[#00b4c7] rounded transition-all duration-700" style={{ width: "0%" }} />
            
            {/* Nodes */}
            <div className="flex justify-between md:justify-around relative z-10 overflow-x-auto pb-4 px-2 no-scrollbar">
              {timelineNodes.map((node, index) => (
                <TimelineDot key={index} node={node} />
              ))}
            </div>
          </div>
        </div>

        {/* ─── SCHEDULE SECTION ─── */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-[400ms] fill-mode-both">
          <div className="text-[10px] font-bold tracking-[2px] uppercase text-gray-500 mb-4">
            Full Event Schedule
          </div>

          {/* View bar: Filters + Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            
            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                    activeFilter === cat
                      ? "bg-[#007b8a] border-[#007b8a] text-white shadow-[0_0_12px_rgba(0,123,138,0.3)]"
                      : "bg-transparent border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  viewMode === "list"
                    ? "bg-[#007b8a] border-[#007b8a] text-white"
                    : "bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                List
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  viewMode === "grid"
                    ? "bg-[#007b8a] border-[#007b8a] text-white"
                    : "bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Grid
              </button>
            </div>
          </div>

          {/* ─── LIST VIEW ─── */}
          {viewMode === "list" && (
            <div className="flex flex-col gap-3">
              {filteredItems.map((item) => (
                <AgendaCardList key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* ─── GRID VIEW ─── */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <AgendaCardGrid key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {filteredItems.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-sm">No sessions match the selected filter.</p>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════
           SPEAKER SCHEDULE (ADMIN & ATTENDEE)
        ═══════════════════════════════ */}
        {!roleLoading && (currentRole === "admin" || currentRole === "attendee") && (
          <div className="mt-16 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500 fill-mode-both">
            <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray-400 mb-4 ml-1">
              SPEAKER SCHEDULE
            </div>

            {/* Controls Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              {/* List / Grid Toggle */}
              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                <button
                  onClick={() => setSpeakerViewMode("list")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    speakerViewMode === "list"
                      ? "bg-[#007b8a] text-white"
                      : "bg-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  List
                </button>
                <button
                  onClick={() => setSpeakerViewMode("grid")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    speakerViewMode === "grid"
                      ? "bg-[#007b8a] text-white"
                      : "bg-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grid
                </button>
              </div>

              {/* Add Speaker removed from public flow - only in Management mode */}
            </div>

            {/* Speaker List View */}
            {speakerViewMode === "list" && (
              <div className="flex flex-col gap-3">
                {speakers.length === 0 && (
                  <div className="text-center py-16 text-gray-500 border border-white/5 rounded-2xl bg-white/[0.02]">
                    <Mic2 className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm font-medium">No speakers added yet.</p>
                    {currentRole === "admin" && adminView === "management" && <p className="text-xs text-gray-600 mt-1">Click &quot;+ Add Speaker&quot; to get started.</p>}
                  </div>
                )}
                {speakers.map((spk, idx) => (
                  <div key={spk.id} className="bg-[#1A1A24] border border-white/5 hover:border-white/10 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 transition-all relative group">
                    {/* Time */}
                    <div className="shrink-0 w-28 text-left">
                      <div className="text-white font-mono font-bold text-lg tracking-tight">{spk.time}</div>
                      <div className="text-gray-500 text-xs font-mono">{spk.duration}</div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-14 bg-white/10" />

                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${spk.avatarColor}`}>
                      {spk.initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h4 className="text-white font-bold text-base">{spk.name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider border border-blue-400/30 text-blue-400 px-2 py-0.5 rounded-full">Upcoming</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">{spk.role}</p>
                      <p className="text-[#007b8a] text-sm font-medium flex items-center gap-1">
                        <span className="text-red-400">🎯</span>
                        {spk.talkTitle}
                      </p>
                      {spk.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          {spk.tags.map((tag, i) => (
                            <span key={i} className="text-[11px] text-gray-400 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.02]">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Upvote + Delete */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => {
                          if (canVote) {
                            setSpeakerUpvotes(prev => {
                              const already = prev[spk.id];
                              if (already) {
                                setSpeakers(s => s.map(sp => sp.id === spk.id ? { ...sp, upvotes: sp.upvotes - 1 } : sp));
                                const copy = { ...prev };
                                delete copy[spk.id];
                                return copy;
                              } else {
                                setSpeakers(s => s.map(sp => sp.id === spk.id ? { ...sp, upvotes: sp.upvotes + 1 } : sp));
                                return { ...prev, [spk.id]: true };
                              }
                            });
                          }
                        }}
                        className={`w-14 h-14 rounded-full border flex flex-col items-center justify-center transition-all ${
                          speakerUpvotes[spk.id]
                            ? "border-[#007b8a] text-[#007b8a] bg-[#007b8a]/10"
                            : "border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200"
                        }`}
                      >
                        <ChevronUp className="w-5 h-5" />
                        <span className="text-xs font-bold -mt-0.5">{spk.upvotes}</span>
                      </button>

                      {/* Delete removed from public flow - only in Management mode */}
                    </div>

                    {/* Top Rated badge for first */}
                    {idx === 0 && spk.upvotes > 0 && (
                      <div className="absolute -top-2.5 right-4 bg-[#111118] border border-[#007b8a]/30 px-3 py-1 rounded-full text-[10px] font-bold text-[#007b8a] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-[#007b8a]" />
                        Top Rated
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Speaker Grid View */}
            {speakerViewMode === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {speakers.length === 0 && (
                  <div className="col-span-full text-center py-16 text-gray-500 border border-white/5 rounded-2xl bg-white/[0.02]">
                    <Mic2 className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                    <p className="text-sm font-medium">No speakers added yet.</p>
                  </div>
                )}
                {speakers.map((spk) => (
                  <div key={spk.id} className="bg-[#1A1A24] border border-white/5 hover:border-white/10 rounded-2xl p-6 flex flex-col transition-all relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white ${spk.avatarColor}`}>
                        {spk.initials}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (canVote) {
                              setSpeakerUpvotes(prev => {
                                const already = prev[spk.id];
                                if (already) {
                                  setSpeakers(s => s.map(sp => sp.id === spk.id ? { ...sp, upvotes: sp.upvotes - 1 } : sp));
                                  const copy = { ...prev };
                                  delete copy[spk.id];
                                  return copy;
                                } else {
                                  setSpeakers(s => s.map(sp => sp.id === spk.id ? { ...sp, upvotes: sp.upvotes + 1 } : sp));
                                  return { ...prev, [spk.id]: true };
                                }
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 text-xs font-bold transition-all ${
                            speakerUpvotes[spk.id]
                              ? "border-[#007b8a] text-[#007b8a] bg-[#007b8a]/10"
                              : "border-white/10 text-gray-400 hover:border-white/20"
                          }`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          {spk.upvotes}
                        </button>
                        {/* Delete removed from public flow - only in Management mode */}
                      </div>
                    </div>
                    <h4 className="text-white font-bold text-base mb-0.5">{spk.name}</h4>
                    <p className="text-gray-400 text-xs mb-2">{spk.role}</p>
                    <p className="text-[#007b8a] text-sm font-medium mb-3 flex items-center gap-1">
                      <span className="text-red-400">🎯</span>
                      {spk.talkTitle}
                    </p>
                    <div className="mt-auto flex items-center gap-2 text-gray-500 text-xs font-mono">
                      <Clock className="w-3 h-3" />
                      {spk.time} · {spk.duration}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

         {/* ═══════════════════════════════
            COMPETITOR-ONLY SECTION
         ═══════════════════════════════ */}
         {!roleLoading && (currentRole === "competitor" || (currentRole === "admin" && adminView === "competitor")) && (
          <div className="mt-16 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500 fill-mode-both">
            <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray-400 mb-3 ml-1">
              TEAM PRODUCTS
            </div>
            {/* If product submitted, display it here, otherwise show the CTA */}
            {submittedProduct ? (
              <div className="bg-[#1A1A24] border border-[#007b8a]/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#007b8a]/5 rounded-full blur-[80px] pointer-events-none" />
                
                {submittedProduct.imageUrl && (
                  <div className="w-full md:w-1/3 shrink-0 rounded-xl bg-black/40 border border-white/5 relative aspect-[16/9] flex flex-col items-center justify-center p-4 text-center group">
                    <div className="bg-white/5 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                      <ExternalLink className="w-6 h-6 text-[#007b8a]" />
                    </div>
                    <a href={submittedProduct.imageUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#007b8a] hover:text-[#009dae] uppercase tracking-wide px-4 py-2 hover:bg-white/5 rounded-lg transition-colors">
                      View Attached Image
                    </a>
                  </div>
                )}
                
                <div className="flex-1 relative z-10 flex flex-col justify-center">
                  <h4 className="text-2xl font-bold text-white mb-2">{submittedProduct.title}</h4>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6">{submittedProduct.description}</p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#007b8a]/10 border border-[#007b8a]/30 text-[#007b8a] rounded-lg text-xs font-semibold w-fit shadow-[0_0_10px_rgba(0,123,138,0.1)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Product Submitted
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 hover:border-white/[0.15]">
                <div className="relative z-10">
                  <h3 className="text-3xl md:text-[32px] font-extrabold tracking-tight text-white mb-1.5 flex items-baseline gap-2">
                    Product <span className="text-[#007b8a] italic text-3xl md:text-[34px] font-medium font-[family-name:var(--font-playfair)]">Showcase</span>
                  </h3>
                  <p className="text-gray-300 text-sm md:text-[15px]">
                    All submitted projects from participating teams
                  </p>
                </div>

                <div className="relative z-10 shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => setShowSubmitModal(true)}
                    className="w-full md:w-auto px-5 py-2.5 bg-[#007b8a] hover:bg-[#009dae] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 text-[15px] shadow-[0_0_15px_rgba(0,123,138,0.3)]">
                    <span className="font-semibold text-lg leading-none mb-0.5">+</span> Submit Product
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PROJECT SHOWCASE (ATTENDEE & ADMIN PREVIEW) ─── */}
        {!roleLoading && (currentRole === "attendee" || currentRole === "competitor" || (currentRole === "admin" && adminView !== "management")) && (
          <div className="mt-16 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-500 fill-mode-both">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray-400 mb-1 ml-1">
                  {adminView === "management" ? "LIVE LEADERBOARD" : "COMMUNITY SHOWCASE"}
                </div>
                <h3 className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                  Product <span className="text-[#007b8a] italic font-medium font-[family-name:var(--font-playfair)]">{adminView === "management" ? "Standings" : "Gallery"}</span>
                </h3>
              </div>
              <div className="bg-[#007b8a]/10 border border-[#007b8a]/30 text-[#007b8a] text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 w-fit shadow-[0_0_15px_rgba(0,123,138,0.15)]">
                <Star className="w-4 h-4" />
                Vote for your favorite project below!
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const allProjects = [...MOCK_PROJECTS];
                if (submittedProduct) {
                  allProjects.push({
                    id: 999,
                    team: "Your Team", 
                    title: submittedProduct.title,
                    description: submittedProduct.description,
                    imageUrl: submittedProduct.imageUrl,
                    baseVotes: 0,
                    members: []
                  });
                }

                const projectsToRender = allProjects.map(p => ({ ...p, totalVotes: p.baseVotes + (votedProjectId === p.id ? 1 : 0) }));

                return projectsToRender.map((proj, index) => (
                  <div 
                    key={proj.id} 
                    onClick={() => setSelectedProject(proj)}
                    className="bg-[#1A1A24] border border-white/5 hover:border-[#007b8a]/30 rounded-2xl p-6 transition-all group flex flex-col h-full shadow-lg relative cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-bold text-[#007b8a] uppercase tracking-widest">{proj.team}</span>
                      <div className="flex items-center gap-3">
                        {currentRole === "admin" && adminView === "management" && (
                          <div className="bg-white/5 px-2 py-1 rounded text-xs font-bold text-gray-300 flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                            {proj.totalVotes}
                          </div>
                        )}
                        <a 
                          href={proj.imageUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-500 hover:text-[#007b8a] transition-colors p-1" 
                          title="View attached image"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">{proj.title}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">{proj.description}</p>
                    
                    {canVote && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (votedProjectId === proj.id) {
                            setVotedProjectId(null); // toggle off
                          } else {
                            setVotedProjectId(proj.id); // inherently enforces one vote limit
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 transition-all ${
                          votedProjectId === proj.id 
                            ? "bg-[#007b8a] text-white shadow-[0_0_15px_rgba(0,123,138,0.3)]" 
                            : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${votedProjectId === proj.id ? "fill-white" : ""}`} />
                        {votedProjectId === proj.id ? "Voted!" : "Vote for this Project"}
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
          </div>
        )}

        {/* ─── MANAGEMENT SECTION (Rendered only for Admin in Management Mode) ─── */}
        {currentRole === "admin" && adminView === "management" && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {/* SPEAKER MANAGEMENT RE-RENDER */}
            <div className="mt-8 mb-16">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray-400 mb-2 ml-1">
                    SPEAKER SCHEDULE
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-white mb-1.5 flex items-baseline gap-2">
                    Manage <span className="text-[#007b8a] italic font-medium font-[family-name:var(--font-playfair)]">Sessions</span>
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                    <button onClick={() => setSpeakerViewMode("list")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${speakerViewMode === "list" ? "bg-[#007b8a] text-white" : "text-gray-400"}`}>List</button>
                    <button onClick={() => setSpeakerViewMode("grid")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${speakerViewMode === "grid" ? "bg-[#007b8a] text-white" : "text-gray-400"}`}>Grid</button>
                  </div>
                  <button
                    onClick={() => setShowAddSpeakerModal(true)}
                    className="px-5 py-2.5 bg-[#007b8a] hover:bg-[#009dae] text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-sm shadow-[0_0_15px_rgba(0,123,138,0.3)]"
                  >
                    <Plus className="w-4 h-4" />
                    Add Speaker
                  </button>
                </div>
              </div>

              {/* Render Speaker views here - reusing existing data/states */}
              {speakerViewMode === "list" ? (
                <div className="flex flex-col gap-3">
                  {speakers.map((spk, idx) => (
                    <div key={spk.id} className="bg-[#1A1A24] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 transition-all relative group">
                      <div className="shrink-0 w-28 text-left">
                        <div className="text-white font-mono font-bold text-lg tracking-tight">{spk.time}</div>
                        <div className="text-gray-500 text-xs font-mono">{spk.duration}</div>
                      </div>
                      <div className="hidden md:block w-px h-14 bg-white/10" />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 ${spk.avatarColor}`}>{spk.initials}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-bold text-base">{spk.name}</h4>
                        <p className="text-gray-400 text-sm mb-1">{spk.role}</p>
                        <p className="text-[#007b8a] text-sm font-medium">{spk.talkTitle}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Votes</span>
                          <span className="text-white font-mono font-bold text-xl">{spk.upvotes}</span>
                        </div>
                        <button onClick={() => setSpeakers(s => s.filter(sp => sp.id !== spk.id))} className="text-gray-600 hover:text-red-400 transition-colors p-2 bg-white/5 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ))}
                  {speakers.length === 0 && <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-gray-500">No speakers added yet. Click &quot;Add Speaker&quot; above.</div>}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {speakers.map((spk) => (
                    <div key={spk.id} className="bg-[#1A1A24] border border-white/5 rounded-2xl p-6 flex flex-col relative group">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white ${spk.avatarColor}`}>{spk.initials}</div>
                        <button onClick={() => setSpeakers(s => s.filter(sp => sp.id !== spk.id))} className="text-gray-600 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"><X className="w-5 h-5" /></button>
                      </div>
                      <h4 className="text-white font-bold text-base mb-0.5">{spk.name}</h4>
                      <p className="text-gray-400 text-xs mb-3">{spk.role}</p>
                      <p className="text-[#007b8a] text-sm font-medium mb-4">{spk.talkTitle}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-mono">{spk.time} · {spk.duration}</span>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-xs font-bold text-gray-300"><ChevronUp className="w-3 h-3" /> {spk.upvotes}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PRODUCT STANDINGS MANAGEMENT */}
            <div className="mt-16 mb-24">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray-400 mb-2 ml-1">
                    LIVE LEADERBOARD
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                    Product <span className="text-[#007b8a] italic font-medium font-[family-name:var(--font-playfair)]">Standings</span>
                  </h3>
                </div>
                <div className="bg-[#fcd036]/10 border border-[#fcd036]/30 text-[#fcd036] text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 w-fit shadow-[0_0_15px_rgba(252,208,54,0.15)]">
                  <Trophy className="w-4 h-4" />
                  Live Voting Results
                </div>
              </div>

              <div className="space-y-4">
                {(() => {
                  const allProjects = [...MOCK_PROJECTS];
                  if (submittedProduct) {
                    allProjects.push({
                      id: 999,
                      team: "Your Team", 
                      title: submittedProduct.title,
                      description: submittedProduct.description,
                      imageUrl: submittedProduct.imageUrl,
                      baseVotes: 0,
                      members: []
                    });
                  }
                  
                  return allProjects
                    .map(p => ({ ...p, totalVotes: p.baseVotes + (votedProjectId === p.id ? 1 : 0) }))
                    .sort((a, b) => b.totalVotes - a.totalVotes)
                    .map((proj, idx) => (
                      <div key={proj.id} className="bg-[#1A1A24] border border-white/5 rounded-2xl p-6 flex items-center gap-6 group hover:border-[#007b8a]/30 transition-all">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${idx === 0 ? "bg-[#fcd036] text-black" : idx === 1 ? "bg-gray-300 text-black" : idx === 2 ? "bg-amber-600 text-white" : "bg-white/5 text-gray-500"}`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] font-bold text-[#007b8a] uppercase tracking-widest block mb-1">{proj.team}</span>
                          <h4 className="text-white font-bold text-lg">{proj.title}</h4>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Total Votes</span>
                            <span className="text-3xl font-black text-white">{proj.totalVotes}</span>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#007b8a] transition-colors">
                            <Heart className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-16" />

        {/* Submit Product Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
              {/* Close Button */}
              <button 
                onClick={() => setShowSubmitModal(false)}
                className="absolute top-5 right-5 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all z-50 border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Header */}
              <div className="px-8 mt-8 mb-6">
                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-baseline gap-2 text-left">
                  Submit <span className="text-[#007b8a] italic font-medium font-[family-name:var(--font-playfair)]">Product</span>
                </h2>
              </div>

              {/* Form Body */}
              <div className="px-8 pb-8 space-y-5 text-left">
                <div>
                  <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2 shrink-0">
                    Product Title
                  </label>
                  <input 
                    type="text" 
                    value={productTitle}
                    onChange={(e) => setProductTitle(e.target.value)}
                    placeholder="e.g. EcoTrack"
                    className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2 shrink-0">
                    Image URL <span className="text-gray-500 font-semibold">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={productImageUrl}
                    onChange={(e) => setProductImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white mb-1.5"
                  />
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium pl-1">
                    Please upload your image to <span className="text-gray-300 font-bold">Google Drive</span>, ensure the sharing permission is "Anyone with the link", and paste the link here.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2 shrink-0">
                    Short Description
                  </label>
                  <textarea 
                    rows={4}
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    placeholder="What problem does this solve?"
                    className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium resize-none text-white"
                  />
                </div>

                <div className="pt-8 flex items-center justify-end gap-3 mt-4">
                  <button 
                    onClick={() => setShowSubmitModal(false)}
                    className="px-6 py-2.5 rounded-xl font-bold bg-transparent hover:bg-white/5 border border-white/10 transition-all text-[15px] text-gray-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                        if (productTitle && productDesc) {
                          setSubmittedProduct({
                            title: productTitle,
                            imageUrl: productImageUrl,
                            description: productDesc
                          });
                          setShowSubmitModal(false);
                        } else {
                          alert("Please fill in the Product Title and Short Description.");
                        }
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold bg-[#007b8a] hover:bg-[#009dae] transition-all text-[15px] text-white shadow-[0_0_15px_rgba(0,123,138,0.2)]"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Details Modal */}
        {selectedProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#111118] border border-white/5 rounded-3xl w-full max-w-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col pt-10">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-50 border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Hero Header Area (Placeholder for image) */}
              <div className="mx-6 h-64 md:h-72 bg-[#1A1A24] rounded-2xl relative flex items-center justify-center border border-white/5 overflow-hidden">
                 <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-[#007b8a] to-transparent pointer-events-none" />
                 <ImageIcon className="w-16 h-16 text-white/10" />
                 <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-[#007b8a]/20 rounded-full blur-[100px] pointer-events-none" />
              </div>

              {/* Title & Desc */}
              <div className="p-8 pb-4 text-left">
                <div className="text-[12px] font-bold tracking-[2px] uppercase text-[#fcd036] mb-2 font-mono">
                  TEAM {selectedProject.team}
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-4">
                  {selectedProject.title}
                </h2>
                <p className="text-gray-300 text-[15px] leading-relaxed mb-8">
                  {selectedProject.description}
                </p>

                {/* Team Members */}
                <div className="mb-8">
                  <div className="text-[11px] font-bold tracking-[2px] uppercase text-gray-500 mb-4 shrink-0">
                    TEAM MEMBERS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedProject.members.map((member, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {member.initials}
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm leading-tight">{member.name}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{member.phone}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between bg-black/20">
                 {currentRole === "attendee" ? (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (votedProjectId === selectedProject.id) setVotedProjectId(null);
                       else setVotedProjectId(selectedProject.id);
                     }}
                     className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                       votedProjectId === selectedProject.id 
                         ? "bg-[#007b8a] text-white shadow-[0_0_15px_rgba(0,123,138,0.3)]" 
                         : "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                     }`}
                   >
                     <Heart className={`w-4 h-4 ${votedProjectId === selectedProject.id ? "fill-white" : ""}`} />
                     {votedProjectId === selectedProject.id ? "1 Votes" : "Vote"}
                   </button>
                 ) : (
                   <div className="flex items-center gap-2 px-4 py-2 border border-[#fcd036]/30 rounded-xl bg-[#fcd036]/10">
                     <span className="text-[#fcd036] text-[10px]">▲</span>
                     <span className="font-bold text-[#fcd036] text-sm">
                       {selectedProject.baseVotes + (votedProjectId === selectedProject.id ? 1 : 0)} Votes
                     </span>
                   </div>
                 )}
                 <button 
                    onClick={() => setSelectedProject(null)}
                    className="px-6 py-2.5 rounded-xl font-bold bg-transparent hover:bg-white/5 border border-white/10 transition-all text-sm text-gray-300"
                  >
                    Close
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Speaker Modal */}
        {showAddSpeakerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
              {/* Close Button */}
              <button 
                onClick={() => setShowAddSpeakerModal(false)}
                className="absolute top-5 right-5 p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all z-50 border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="px-8 mt-8 mb-6">
                <h2 className="text-2xl font-extrabold tracking-tight text-white flex items-baseline gap-2 text-left">
                  Add <span className="text-[#007b8a] italic font-medium font-[family-name:var(--font-playfair)]">Speaker</span>
                </h2>
              </div>

              {/* Form Body */}
              <div className="px-8 pb-8 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      value={spkName}
                      onChange={(e) => setSpkName(e.target.value)}
                      placeholder="e.g. Dr. Mariam Al Rashidi"
                      className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2">
                      Role / Title
                    </label>
                    <input 
                      type="text" 
                      value={spkRole}
                      onChange={(e) => setSpkRole(e.target.value)}
                      placeholder="e.g. CTO at UAE Future Labs"
                      className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2">
                    Talk Title
                  </label>
                  <input 
                    type="text" 
                    value={spkTalkTitle}
                    onChange={(e) => setSpkTalkTitle(e.target.value)}
                    placeholder="e.g. Building AI Products That Actually Work"
                    className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2">
                      Time
                    </label>
                    <input 
                      type="text" 
                      value={spkTime}
                      onChange={(e) => setSpkTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2">
                      Duration
                    </label>
                    <input 
                      type="text" 
                      value={spkDuration}
                      onChange={(e) => setSpkDuration(e.target.value)}
                      placeholder="e.g. 45 min"
                      className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold tracking-[1.5px] uppercase text-gray-400 mb-2">
                    Tags <span className="text-gray-500 font-semibold">(comma separated)</span>
                  </label>
                  <input 
                    type="text" 
                    value={spkTags}
                    onChange={(e) => setSpkTags(e.target.value)}
                    placeholder="e.g. AI, Product, Design"
                    className="w-full bg-[#1A1A24] border border-white/5 rounded-lg px-4 py-3 placeholder-zinc-600 focus:outline-none focus:border-[#007b8a]/50 focus:ring-1 focus:ring-[#007b8a]/50 transition-all font-medium text-white text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="pt-6 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setShowAddSpeakerModal(false)}
                    className="px-6 py-2.5 rounded-xl font-bold bg-transparent hover:bg-white/5 border border-white/10 transition-all text-[15px] text-gray-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (spkName && spkTalkTitle && spkTime) {
                        const avatarColors = ["bg-purple-600", "bg-rose-600", "bg-indigo-600", "bg-emerald-600", "bg-amber-600", "bg-cyan-600"];
                        const nameParts = spkName.trim().split(" ");
                        const initials = nameParts.length >= 2 
                          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                          : spkName.slice(0, 2).toUpperCase();
                        const tags = spkTags ? spkTags.split(",").map(t => t.trim()).filter(Boolean) : [];

                        setSpeakers(prev => [...prev, {
                          id: Date.now(),
                          name: spkName,
                          initials,
                          role: spkRole,
                          talkTitle: spkTalkTitle,
                          time: spkTime,
                          duration: spkDuration || "30 min",
                          tags,
                          avatarColor: avatarColors[prev.length % avatarColors.length],
                          upvotes: 0,
                        }]);

                        setSpkName(""); setSpkRole(""); setSpkTalkTitle("");
                        setSpkTime(""); setSpkDuration(""); setSpkTags("");
                        setShowAddSpeakerModal(false);
                      } else {
                        alert("Please fill in at least the Name, Talk Title, and Time.");
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold bg-[#007b8a] hover:bg-[#009dae] transition-all text-[15px] text-white shadow-[0_0_15px_rgba(0,123,138,0.2)]"
                  >
                    Add Speaker
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WRAPPER — Suspense boundary for useSearchParams
═══════════════════════════════════════════ */
export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#007b8a] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AgendaPageInner />
    </Suspense>
  );
}

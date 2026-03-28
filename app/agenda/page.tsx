"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
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
  ArrowLeft
} from "lucide-react";

const agendaItems = [
  {
    id: 1,
    time: "7:30 AM - 8:00 AM",
    title: "Pre-event Setup",
    description: "Pre-event setup and final checks before the event starts!",
    location: "Main Venue",
    icon: CheckCircle2,
    color: "bg-emerald-500",
    shadow: "shadow-emerald-500/30",
  },
  {
    id: 2,
    time: "8:00 AM - 9:00 AM",
    title: "Registrations & Activities",
    description: "Registrations open, side activities setup and open to all attendees.",
    location: "Main Entrance",
    icon: Ticket,
    color: "bg-blue-500",
    shadow: "shadow-blue-500/30",
  },
  {
    id: 3,
    time: "9:00 AM - 9:15 AM",
    title: "Opening Ceremony",
    description: "Opening ceremony commences to kick off MedEngineers 2026.",
    location: "MAIN AUDITORIUM",
    icon: Sparkles,
    color: "bg-purple-500",
    shadow: "shadow-purple-500/30",
  },
  {
    id: 4,
    time: "9:15 AM - 9:45 AM",
    title: "Team Formation & Festival",
    description: "Teams start working together to decide upon a topic for their presentation. Meanwhile, activities, sponsor booths, food stalls and the club stall (festival) begin.",
    location: "MAIN BUILDING ROTUNDA & MAIN PLAZA",
    icon: Users,
    color: "bg-amber-500",
    shadow: "shadow-amber-500/30",
  },
  {
    id: 5,
    time: "10:00 AM - 2:00 PM",
    title: "Sponsor Keynotes",
    description: "Keynote speeches from sponsors commence, with live updates and tracking on our official website, organized through timeslots.",
    location: "MAIN AUDITORIUM + HALL A & B",
    icon: Mic2,
    color: "bg-indigo-500",
    shadow: "shadow-indigo-500/30",
  },
  {
    id: 6,
    time: "12:00 PM - 12:30 PM",
    title: "Prototyping Mentorship",
    description: "Mentorship period in collaboration with IEEE for 25 prototyping teams for guidance purposes. These teams work in individual classrooms.",
    location: "ENGINEERING BUILDING",
    icon: Wrench,
    color: "bg-pink-500",
    shadow: "shadow-pink-500/30",
  },
  {
    id: 7,
    time: "12:30 PM - 2:00 PM",
    title: "Poster Concept Mentorship",
    description: "Mentorship period in collaboration with IEEE for 75 teams for guidance on their posters and concepts.",
    location: "MAIN BUILDING ROTUNDA",
    icon: Presentation,
    color: "bg-rose-500",
    shadow: "shadow-rose-500/30",
  },
  {
    id: 8,
    time: "2:00 PM - 3:00 PM",
    title: "Keynote Speeches",
    description: "Keynote speeches continue for all participants.",
    location: "MAIN AUDITORIUM",
    icon: RadioTower,
    color: "bg-sky-500",
    shadow: "shadow-sky-500/30",
  },
  {
    id: 9,
    time: "3:00 PM - 4:00 PM",
    title: "Panel Discussion",
    description: "Panel discussion commences, speakers get 10 minutes each (8 minutes for speeches + 2 for Q/A).",
    location: "MAIN AUDITORIUM",
    icon: MessageSquare,
    color: "bg-cyan-500",
    shadow: "shadow-cyan-500/30",
  },
  {
    id: 10,
    time: "4:00 PM - 6:30 PM",
    title: "Presentations & Pitching",
    description: "All 100 teams submit their presentations, prototype development time ends. Pitching in the MAIN AUDITORIUM for the 25 prototyping teams begins, and the other 75 teams present their posters. Festival continues until 7:30 PM.",
    location: "MAIN AUDITORIUM / MAIN PLAZA",
    icon: Trophy,
    color: "bg-yellow-500",
    shadow: "shadow-yellow-500/30",
  },
  {
    id: 11,
    time: "6:30 PM - 7:00 PM",
    title: "Awards & Closing Ceremony",
    description: "Awards ceremony, followed by the closing ceremony, and a final event group picture.",
    location: "MAIN AUDITORIUM",
    icon: Star,
    color: "bg-purple-600",
    shadow: "shadow-purple-600/30",
  },
  {
    id: 12,
    time: "7:00 PM",
    title: "Event Concludes",
    description: "Participants exit, cleanup begins, event ends!",
    location: "Main Exit",
    icon: Flag,
    color: "bg-slate-500",
    shadow: "shadow-slate-500/30",
  }
];

export default function AgendaPage() {
  const [isMapExpanded, setIsMapExpanded] = React.useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0c0c] via-[#050505] to-[#121212] relative overflow-hidden text-gray-100 font-sans">
      {/* Smoother background glowing effects */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-[#007b8a]/10 to-transparent opacity-40 pointer-events-none" />
      <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[#007b8a]/5 blur-[200px] pointer-events-none" />
      <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-600/5 blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[90%] h-[40%] rounded-full bg-[#007b8a]/5 blur-[250px] pointer-events-none" />

      {/* Navigation Back */}
      <div className="absolute top-6 md:top-10 left-4 md:left-8 lg:left-12 xl:left-16 z-20 animate-in fade-in duration-700">
        <Link 
          href="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full hover:bg-white/10 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-20 pt-28 max-w-4xl">
        
        {/* Header Section */}
        <div className="text-center mb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-[#007b8a]/30 bg-[#007b8a]/10 text-[#007b8a] text-sm font-bold tracking-widest mb-6 shadow-[0_0_20px_rgba(0,123,138,0.2)]">
            <CalendarDays className="w-4 h-4 mr-2" />
            EVENT FLOW
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 pb-2 md:pb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 leading-tight">
            Agenda
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Follow the official schedule to catch every keynote, presentation, and ceremony taking place at MedEngineers 2026.
          </p>
        </div>

        {/* Map Section */}
        <div className="mb-20 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200 fill-mode-both">
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
              
              {/* Persistent Click to Enlarge Overlay Label */}
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

        {/* Interactive Full-Screen Modal Overlay for the Map */}
        {isMapExpanded && (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-10 animate-in fade-in zoom-in-95 duration-300"
            onClick={() => setIsMapExpanded(false)}
          >
            <button 
              className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-[#007b8a]/30 rounded-full text-white backdrop-blur-md transition-all duration-300 border border-white/10 hover:border-[#007b8a]/50 z-[101] group"
              onClick={(e) => {
                e.stopPropagation();
                setIsMapExpanded(false);
              }}
            >
              <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
            </button>
            
            <div 
              className="relative w-full h-full max-w-[90vw] max-h-[85vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Image 
                src="/images/event_map.jpg" 
                alt="Expanded University Event Map" 
                fill
                className="object-contain drop-shadow-2xl"
                sizes="90vw"
              />
            </div>
          </div>
        )}

        {/* Timeline Section */}
        <div className="relative ml-4 md:ml-8 pb-10">
          {agendaItems.map((item, index) => (
            <div 
              key={item.id} 
              className="mb-12 relative group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connecting line (hidden for last item) */}
              {index !== agendaItems.length - 1 && (
                <div className="absolute top-5 md:top-6 left-[19px] md:left-[23px] w-0.5 h-[calc(100%+48px)] bg-white/10 z-0" />
              )}
              
              {/* Timeline dot & icon */}
              <span className={`absolute top-0 left-0 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full ring-4 ring-[#050505] ${item.color} shadow-lg ${item.shadow} transition-transform duration-300 group-hover:scale-110 z-10`}>
                <item.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </span>
              
              {/* Agenda Card */}
              <div className="ml-16 md:ml-20 bg-white/[0.03] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1 hover:border-white/20">
                
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-3">
                  <h3 className="text-2xl font-bold text-white tracking-tight">{item.title}</h3>
                  <div className="flex items-center text-sm font-bold text-[#007b8a] bg-[#007b8a]/10 border border-[#007b8a]/20 px-4 py-1.5 rounded-full w-fit whitespace-nowrap">
                    <Clock className="w-4 h-4 mr-2" />
                    {item.time}
                  </div>
                </div>
                
                <p className="text-gray-300 mb-6 text-base md:text-lg leading-relaxed font-medium">
                  {item.description}
                </p>

                {item.location && (
                  <div className="flex items-center text-sm text-gray-400 bg-white/5 px-4 py-2.5 rounded-full w-fit border border-white/5">
                    <MapPin className="w-4 h-4 mr-2 text-rose-400" />
                    <span className="font-semibold tracking-wide uppercase text-xs">{item.location}</span>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

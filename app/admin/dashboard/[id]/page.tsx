import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import LogoutButton from "@/components/logout";
import StatusManager from "./StatusManager";

// Add these exports to disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface Competitor {
    id: string;
    [key: string]: any; // Allow any dynamic fields
}

async function getCompetitor(id: string): Promise<Competitor | null> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error('Invalid competitor ID:', id);
        return null;
    }
    
    const doc = await adminDb.collection("competitors").doc(id.trim()).get();
    
    if (!doc.exists) {
        console.error('Competitor document not found for ID:', id);
        return null;
    }
    
    const data = doc.data();
    console.log('Competitor data:', data); // Debug log to see all fields
    
    return {
        id: doc.id,
        ...data
    } as Competitor;
}

export default async function CompetitorDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const resolvedParams = await params;
    console.log('Page params:', resolvedParams);
    console.log('Competitor ID:', resolvedParams.id);
    
    const competitor = await getCompetitor(resolvedParams.id);
    
    if (!competitor) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            <div className="mb-6">
                <a href="/admin/dashboard" className="text-brand-teal hover:underline mb-4 inline-block">
                    ← Back to Dashboard
                </a>
            </div>
            
            <div className="border rounded-lg p-6">
                <h1 className="text-2xl font-bold mb-4">Competitor Details</h1>
                
                <StatusManager 
                    competitorId={competitor.id} 
                    currentStatus={competitor.status || 'pending'} 
                />
                
                <div className="mb-6">
                    <h3 className="font-semibold text-gray-700 mb-4">Application Details</h3>
                    <div className="bg-gray-50 rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(competitor)
                                .filter(([key]) => key !== 'id') // Exclude the ID field
                                .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically
                                .map(([key, value]) => (
                                    <div key={key} className="border-b border-gray-200 pb-3">
                                        <h4 className="font-medium text-gray-600 capitalize mb-1">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </h4>
                                        <p className="text-gray-900 break-words">
                                            {(() => {
                                                if (value === null || value === undefined) return 'N/A';
                                                if (typeof value === 'boolean') return value ? 'Yes' : 'No';
                                                if (typeof value === 'string') {
                                                    // Check if it's a URL
                                                    if (value.startsWith('http')) {
                                                        return (
                                                            <a 
                                                                href={value} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline"
                                                            >
                                                                {value.includes('linkedin') ? 'LinkedIn Profile' : 
                                                                 value.includes('resume') || value.includes('cv') ? 'View Resume' :
                                                                 'Open Link'}
                                                            </a>
                                                        );
                                                    }
                                                    // Check if it's a date
                                                    if (value.includes('T') && !isNaN(Date.parse(value))) {
                                                        return new Date(value).toLocaleString();
                                                    }
                                                    return value;
                                                }
                                                if (typeof value === 'object') {
                                                    return JSON.stringify(value, null, 2);
                                                }
                                                return String(value);
                                            })()}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <LogoutButton />
                </div>
            </div>
        </div>
    );
}

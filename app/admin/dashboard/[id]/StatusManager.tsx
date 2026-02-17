'use client';

import { useState } from 'react';

interface StatusManagerProps {
    competitorId: string;
    currentStatus: string;
}

export default function StatusManager({ competitorId, currentStatus }: StatusManagerProps) {
    const [status, setStatus] = useState(currentStatus);
    const [loading, setLoading] = useState(false);

    const updateStatus = async (newStatus: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/update-status', {
                method: 'POST',
                credentials: 'include', // Send session cookie
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    competitorId,
                    status: newStatus
                })
            });

            if (response.ok) {
                setStatus(newStatus);
                // Refresh the page to show updated data
                window.location.reload();
            } else if (response.status === 401 || response.status === 403) {
                // Authentication/Authorization failed - redirect to admin login
                alert('Session expired or insufficient permissions. Redirecting to login...');
                window.location.href = '/admin';
            } else {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || 'Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating status. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Status Management</h3>
            <div className="flex items-center gap-4">
                <span className="font-medium">Current Status: </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'Accepted' ? 'bg-green-100 text-green-800' :
                        status === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                    }`}>
                    {status || 'pending'}
                </span>
            </div>
            <div className="flex gap-3 mt-4">
                <button
                    onClick={() => updateStatus('Accepted')}
                    disabled={loading || status === 'Accepted'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Updating...' : 'Approve'}
                </button>
                <button
                    onClick={() => updateStatus('Rejected')}
                    disabled={loading || status === 'Rejected'}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Updating...' : 'Reject'}
                </button>
            </div>
        </div>
    );
}

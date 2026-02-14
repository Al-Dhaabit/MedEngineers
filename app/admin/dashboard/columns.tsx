"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"

// This type matches your Firestore "competitors" document structure
export type Competitor = {
    id: string
    fullName: string
    email: string
    status: string
}

export const columns: ColumnDef<Competitor>[] = [
    {
        accessorKey: "fullName",
        header: "Full Name",
        cell: ({ row }) => {
            const fullName = row.getValue("fullName") as string;
            const id = row.original.id;
            return (
                <Link
                    href={`/admin/dashboard/${id}`}
                    className="text-brand-teal hover:underline font-medium"
                >
                    {fullName}
                </Link>
            )
        }
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "status",
        header: "Status",
    },
]
"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export type PaymentSubmission = {
  id: string;
  fullName: string;
  email: string;
  isPaid: boolean;
  status: string;
};

export const paymentColumns: ColumnDef<PaymentSubmission>[] = [
  {
    accessorKey: "fullName",
    header: "Full Name",
    cell: ({ row }) => {
      const fullName = row.getValue("fullName") as string;
      const id = row.original.id;
      return (
        <Link href={`/admin/dashboard/payment/${id}`} className="text-brand-teal hover:underline font-medium">
          {fullName}
        </Link>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "isPaid",
    header: "isPaid",
    cell: ({ row }) => ((row.getValue("isPaid") as boolean) ? "true" : "false"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const normalized =
        status === "payment_confirmed" || status === "final_phase" || status === "domain_selection"
          ? "Approved"
          : status === "payment_rejected"
            ? "Rejected"
            : status === "approved_awaiting_payment_submission" || status === "rejected_awaiting_payment_submission"
              ? "Awaiting Payment"
              : status === "payment_submitted_under_review"
                ? "Pending Review"
                : "Pending";
      return normalized;
    },
  },
];

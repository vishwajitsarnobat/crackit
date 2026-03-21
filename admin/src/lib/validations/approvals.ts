// if approval is rejected, the ceo or centre head must provide reason

import {z} from "zod";

export const processApprovalSchema = z
    .object({
        action: z.enum(["approve", "reject"]),
        rejectionReason: z.string().optional(),
    })
    .refine(
        (data) => {
            if (
                data.action === "reject" &&
                (!data.rejectionReason ||
                    data.rejectionReason.trim().length === 0)
            ) {
                return false;
            }
            return true;
        },
        {
            message:
                "Rejection reason is required when rejecting an approval request.",
            path: ["rejectionReason"],
        },
    );

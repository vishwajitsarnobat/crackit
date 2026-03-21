// TODO: we aren't bothering accountant here and also ceo, check future use once

import {z} from "zod";

export const signupSchema = z
    .object({
        fullName: z.string().min(2, "Full name must be at least 2 characters."),
        email: z.email("Invalid email address."),
        password: z.string().min(6, "Password must be at least 6 characters."),
        roleStr: z.enum([
            "ceo",
            "centre_head",
            "teacher",
            "accountant",
            "student",
        ]),
        centreIds: z.array(z.uuid()).optional(),
    })
    .refine(
        (data) => {
            if (
                (data.roleStr === "centre_head" ||
                    data.roleStr === "teacher") &&
                (!data.centreIds || data.centreIds.length === 0)
            ) {
                return false;
            }
            return true;
        },
        {
            message:
                "Centre Heads and Teachers must be assigned to at least one centre.",
            path: ["centreIds"],
        },
    );

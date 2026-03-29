import { z } from 'zod';

export const adminSchema = z.object({
    name: z.string().min(2, "이름은 2자 이상이어야 합니다.").max(20, "이름은 20자 이하여야 합니다."),
    email: z.string().email("유효한 이메일 형식이 아닙니다."),
    employeeId: z.string().regex(/^[a-zA-Z0-9-]+$/, "사번은 영문, 숫자, 하이픈만 가능합니다."),
    role: z.string().min(1, "권한을 선택해 주세요."),
    isActive: z.boolean().optional(),
});

export type AdminFormData = z.infer<typeof adminSchema>;

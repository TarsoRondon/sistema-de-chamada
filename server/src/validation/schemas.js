const { z } = require('zod');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateTime(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

const loginSchema = z
  .object({
    email: z.string().trim().email('email invalido'),
    password: z.string().min(1, 'password obrigatorio'),
    organization_id: z.coerce.number().int().positive().optional(),
  })
  .strict();

const deviceEventSchema = z
  .object({
    student_matricula: z.string().trim().min(1).max(50),
    event_type: z.enum(['IN', 'OUT']),
    event_time: z.string().refine(isValidDateTime, 'event_time invalido'),
    method: z.enum(['FINGERPRINT', 'RFID', 'QR', 'MANUAL']),
  })
  .passthrough();

const classSessionCreateSchema = z
  .object({
    turma_id: z.coerce.number().int().positive(),
    subject_id: z.coerce.number().int().positive().optional(),
    data_aula: z.string().regex(dateRegex, 'data_aula deve estar em YYYY-MM-DD').optional(),
    hora_inicio: z.string().regex(timeRegex, 'hora_inicio invalida'),
    hora_fim: z.string().regex(timeRegex, 'hora_fim invalida'),
  })
  .strict();

const classSessionIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

const manualAttendanceSchema = z
  .object({
    class_session_id: z.coerce.number().int().positive(),
    student_id: z.coerce.number().int().positive().optional(),
    student_matricula: z.string().trim().min(1).max(50).optional(),
    status: z.enum(['PRESENT', 'LATE', 'LEFT']),
    justificativa: z.string().trim().max(255).optional(),
    timestamp: z.string().refine(isValidDateTime, 'timestamp invalido').optional(),
  })
  .strict()
  .refine((data) => Boolean(data.student_id || data.student_matricula), {
    message: 'student_id ou student_matricula e obrigatorio',
    path: ['student_id'],
  });

const liveFeedQuerySchema = z
  .object({
    turma_id: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .passthrough();

module.exports = {
  loginSchema,
  deviceEventSchema,
  classSessionCreateSchema,
  classSessionIdParamSchema,
  manualAttendanceSchema,
  liveFeedQuerySchema,
};

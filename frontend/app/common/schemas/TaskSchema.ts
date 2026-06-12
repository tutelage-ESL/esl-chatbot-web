import { z } from 'zod'

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().min(1, 'Description is required').max(5000, 'Description must be at most 5000 characters'),
  deadline: z.string().optional(),
})
export type TaskFormValues = z.infer<typeof taskFormSchema>

export const taskSubmissionSchema = z
  .object({
    content: z.string().trim().max(10000, 'Content must be at most 10000 characters').optional(),
    fileUrl: z.string().trim().optional().refine(
      v => !v || /^https?:\/\//i.test(v),
      'Must be a valid URL (https://…)',
    ),
  })
  .refine(
    d => (d.content && d.content.length > 0) || (d.fileUrl && d.fileUrl.length > 0),
    { message: 'Provide written work or a file link', path: ['content'] },
  )
export type TaskSubmissionValues = z.infer<typeof taskSubmissionSchema>

export const feedbackSchema = z.object({
  feedback: z.string().trim().min(1, 'Feedback is required').max(5000, 'Feedback must be at most 5000 characters'),
})
export type FeedbackValues = z.infer<typeof feedbackSchema>

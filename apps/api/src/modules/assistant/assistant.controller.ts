import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { AssistantReply } from '@dari/contracts';
import { z } from 'zod';
import type { AuthUser } from '../../common/auth/auth-user';
import { Client, type ClientMeta, OptionalUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { AssistantService } from './assistant.service';

const body = z.object({
  city: z.string().trim().min(2).max(60),
  message: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(10)
    .default([]),
});

@Public()
@Controller({ path: 'assistant', version: '1' })
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post()
  @HttpCode(200)
  ask(@Body(zod(body)) input: z.infer<typeof body>, @OptionalUser() user: AuthUser | null, @Client() client: ClientMeta): Promise<AssistantReply> {
    return this.assistant.reply(input.message, input.history, input.city, user, client.ip);
  }
}

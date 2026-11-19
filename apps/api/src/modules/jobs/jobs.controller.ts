import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  type ApplyJobInput,
  applyJobSchema,
  type CreateJobInput,
  createJobSchema,
  type Job,
  type JobApplication,
  type ListJobsQuery,
  listJobsQuerySchema,
  type Page,
} from '@dari/contracts';
import type { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { zod } from '../../common/validation/zod.pipe';
import { JobsService } from './jobs.service';

@Controller({ path: 'jobs', version: '1' })
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Public()
  @Get()
  list(@Query(zod(listJobsQuerySchema)) q: ListJobsQuery): Promise<Page<Job>> {
    return this.jobs.list(q);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Job> {
    return this.jobs.get(id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(zod(createJobSchema)) body: CreateJobInput): Promise<Job> {
    return this.jobs.create(user, body);
  }

  @Post(':id/close')
  close(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<Job> {
    return this.jobs.close(user, id);
  }

  @Post(':id/applications')
  apply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(zod(applyJobSchema)) body: ApplyJobInput,
  ): Promise<JobApplication> {
    return this.jobs.apply(user, id, body);
  }

  @Get(':id/applications')
  applicants(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.applicants(user, id);
  }
}

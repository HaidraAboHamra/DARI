import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { ENV } from '../../config/config.module';
import type { Env } from '../../config/env';
import { RateLimitedError, UnauthorizedError } from '../../common/errors/app-error';
import { REDIS } from '../../infrastructure/redis/redis.module';
import { SmsGateway } from './sms.gateway';

const CODE_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const SEND_WINDOW_SECONDS = 10 * 60;
const MAX_SENDS_PER_PHONE = 3;
const MAX_SENDS_PER_IP = 20;

/**
 * One-time codes live only in Redis, hashed with a server secret, with strict
 * per-phone and per-IP send limits and a per-code attempt budget.
 */
@Injectable()
export class OtpService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(ENV) private readonly env: Env,
    private readonly sms: SmsGateway,
  ) {}

  async request(phone: string, ip: string): Promise<{ expiresIn: number }> {
    await this.enforceLimit(`otp:send:phone:${phone}`, MAX_SENDS_PER_PHONE);
    await this.enforceLimit(`otp:send:ip:${ip}`, MAX_SENDS_PER_IP);

    const code = this.env.OTP_DEV_CODE ?? String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.redis
      .multi()
      .set(this.codeKey(phone), this.hash(phone, code), 'EX', CODE_TTL_SECONDS)
      .del(this.attemptsKey(phone))
      .exec();
    await this.sms.send(phone, `رمز الدخول إلى داري: ${code}\nلا تشاركه مع أحد.`, code);
    return { expiresIn: CODE_TTL_SECONDS };
  }

  /** Consumes the code on success; burns it after too many wrong attempts. */
  async verify(phone: string, code: string): Promise<void> {
    const stored = await this.redis.get(this.codeKey(phone));
    if (!stored) throw new UnauthorizedError('الرمز منتهي الصلاحية، اطلب رمزاً جديداً');

    const attempts = await this.redis.incr(this.attemptsKey(phone));
    if (attempts === 1) await this.redis.expire(this.attemptsKey(phone), CODE_TTL_SECONDS);
    if (attempts > MAX_VERIFY_ATTEMPTS) {
      await this.redis.del(this.codeKey(phone), this.attemptsKey(phone));
      throw new UnauthorizedError('محاولات كثيرة، اطلب رمزاً جديداً');
    }

    const expected = Buffer.from(stored, 'hex');
    const actual = Buffer.from(this.hash(phone, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedError('الرمز غير صحيح');
    }
    await this.redis.del(this.codeKey(phone), this.attemptsKey(phone));
  }

  private async enforceLimit(key: string, max: number): Promise<void> {
    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, SEND_WINDOW_SECONDS);
    if (count > max) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitedError(Math.max(ttl, 1));
    }
  }

  private hash(phone: string, code: string): string {
    return createHmac('sha256', this.env.JWT_SECRET).update(`${phone}:${code}`).digest('hex');
  }

  private codeKey(phone: string): string {
    return `otp:code:${phone}`;
  }

  private attemptsKey(phone: string): string {
    return `otp:attempts:${phone}`;
  }
}

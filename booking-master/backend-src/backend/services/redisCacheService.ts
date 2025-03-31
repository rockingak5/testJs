import Redis from 'ioredis';
import redisClient from '~utilities/initRedis';
import { RedisKeys } from '../config/redis.config';
import { systemConfig } from '~config';

class RedisCacheService {
	private client: Redis;

	constructor(redisClient: Redis) {
		this.client = redisClient;
	}

	private generateKey(parts: string[]): string {
		return parts.join(':');
	}

	async setOccurrenceRegisterCount(occurrenceId: number, count: number): Promise<void> {
		const key = this.generateKey([
			RedisKeys.EVENT_OCCURRENCE,
			occurrenceId.toString(),
			RedisKeys.EVENT_CLIENT_REGISTRATION_COUNT,
		]);
		if (systemConfig.CONSOLE_ONLY) {
			console.log('setOccurrenceRegisterCount', { key, count });
		}
		await this.client.set(key, count.toString());
	}

	async increaseOccurrenceRegisterCount(occurrenceId: number, count: number): Promise<number> {
		const key = this.generateKey([
			RedisKeys.EVENT_OCCURRENCE,
			occurrenceId.toString(),
			RedisKeys.EVENT_CLIENT_REGISTRATION_COUNT,
		]);
		if (systemConfig.CONSOLE_ONLY) {
			console.log('increaseOccurrenceRegisterCount', { key, count });
		}
		return this.client.incrby(key, count.toString());
	}

	async decreaseOccurrenceRegisterCount(occurrenceId: number, count: number): Promise<void> {
		const key = this.generateKey([
			RedisKeys.EVENT_OCCURRENCE,
			occurrenceId.toString(),
			RedisKeys.EVENT_CLIENT_REGISTRATION_COUNT,
		]);
		if (systemConfig.CONSOLE_ONLY) {
			console.log('decreaseOccurrenceRegisterCount', { key, count });
		}
		await this.client.decrby(key, count);
	}
}

export const redisCacheService = new RedisCacheService(redisClient);

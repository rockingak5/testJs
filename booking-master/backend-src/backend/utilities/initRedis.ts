import Redis from 'ioredis';
import { redisConfig } from '~config';
import { pushEventAndCountClientRegistrationToRedis } from '~services/occurrenceService';

const redisClient = new Redis(redisConfig);

export const connectRedis = async (): Promise<void> => {
	try {
		await redisClient.ping();
		await pushEventAndCountClientRegistrationToRedis();
		console.log(`[Redis] Connected with host: ${redisConfig.host} - port ${redisConfig.port}`);
	} catch (error) {
		console.error('[Redis] Connection failed:', error);
		throw new Error('[Redis] Connection failed');
	}
};

export default redisClient;

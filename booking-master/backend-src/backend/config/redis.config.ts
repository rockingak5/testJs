export default {
	host: process.env.REDIS_HOST || 'localhost',
	port: parseInt(`${process.env.REDIS_PORT}`, 10) || 6379,
};

export const RedisKeys = {
	EVENT_CLIENT_REGISTRATION_COUNT: 'client_registration_event_count',
	EVENT_OCCURRENCE: 'event_occurrence',
};

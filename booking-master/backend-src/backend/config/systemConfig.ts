import path = require('path');

export default {
	// print logs to console instead of file output
	CONSOLE_ONLY: process.env.CONSOLE_ONLY == 'true',
	// root app
	ROOT_PATH: path.join(process.cwd()),
	PATH_FILE_UPLOAD: path.join(process.cwd(), 'public', 'uploads'),
	PATH_FILE_UPLOAD_CATEGORY: path.join(process.cwd(), 'public', 'uploads', 'categories'),
	PATH_FILE_UPLOAD_OCCASION: path.join(process.cwd(), 'public', 'uploads', 'occasions'),
	PATH_FILE_UPLOAD_MEMBER: path.join(process.cwd(), 'public', 'uploads', 'members'),
	PATH_FILE_UPLOAD_RICHMENU: path.join(process.cwd(), 'public', 'uploads', 'richmenus'),
	PATH_FILE_UPLOAD_SETTING: path.join(process.cwd(), 'public', 'uploads', 'settings'),
	PATH_FILE_UPLOAD_INQUIRIES: path.join(process.cwd(), 'public', 'uploads', 'inquiries'),
	PATH_FILE_UPLOAD_LOTTERIES: path.join(process.cwd(), 'public', 'uploads', 'lotteries'),
	PATH_FILE_UPLOAD_COUPONS: path.join(process.cwd(), 'public', 'uploads', 'coupons'),
	PATH_FILE_QRCODE: path.join(process.cwd(), 'public', 'qrcode'),
	LOG_PATH: path.join(process.cwd(), 'logs'),
	PATH_FILE_UPLOAD_SURVEY: path.join(process.cwd(), 'public', 'uploads', 'surveys'),
	// PORT
	PORT: parseInt(process.env.PORT as string, 10),
	HOST: process.env.HOST as string,

	// Set the NODE_ENV to 'development' by default
	NODE_ENV: process.env.NODE_ENV || 'development',
	isDevelopment: process.env.NODE_ENV == 'development',
	ENV_TEST: process.env.ENV_TEST == 'true',

	SITE_URI: process.env.SITE_URI as string,
	NGROK_URI: process.env.NGROK_URI,
	// session
	SALT_ROUND: 10,
	SESS_NAME: process.env.SESS_NAME || '',
	SESS_SEC: process.env.SESS_SEC || '',
	ENC_SEC: process.env.ENC_SEC || '',

	ENV_FAKE_LINE: process.env.ENV_FAKE_LINE ?? false,
	FAKE_USERID: process.env.FAKE_USERID ?? '',
	FAKE_DISPLAYNAME: process.env.FAKE_DISPLAYNAME ?? '',
	FAKE_PICURL: process.env.FAKE_PICURL ?? '',
	FAKE_STATUSMESSAGE: process.env.FAKE_STATUSMESSAGE ?? '',

	// line bot
	LINE: {
		CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
		CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN,
		LIFF_CHANNEL_ID: process.env.LINE_LOGIN_CHANNEL_ID,
		LINE_LIFF_URI: `https://liff.line.me/${process.env.LINE_LIFF_ID}`,
	},
};

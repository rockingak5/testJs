import { Client } from '@line/bot-sdk';
import { systemConfig } from '../config';

const configBot = {
	channelAccessToken: systemConfig.LINE.CHANNEL_ACCESS_TOKEN as string,
	channelSecret: systemConfig.LINE.CHANNEL_SECRET as string,
};
let botClient: Client | null;

export function getBot() {
	if (botClient == null) botClient = new Client(configBot);

	return botClient;
}
export function createGigaImageMessage(params: {
	title: string | null;
	body: string | null;
	url: string | null;
	picUrl: string | null;
}) {
	const message: any = {
		type: 'flex',
		altText: params.title,
		contents: {
			type: 'bubble',
			direction: 'ltr',
		},
	};
	if (params.title) {
		message.contents.header = {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: params.title,
					weight: 'bold',
					color: '#000000FF',
					align: 'center',
					wrap: true,
					contents: [],
				},
			],
		};
	}
	if (params.body) {
		message.contents.body = {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: params.body,
					align: 'start',
					wrap: true,
				},
			],
		};
	}
	if (params.picUrl) {
		message.contents.hero = {
			type: 'image',
			url: `${systemConfig.HOST}/uploads/coupons/${params.picUrl}`,
			size: 'full',
			aspectRatio: '1.51:1',
			aspectMode: 'fit',
		};
	}
	if (params.url) {
		message.contents.footer = {
			type: 'box',
			layout: 'horizontal',
			contents: [
				{
					type: 'button',
					action: {
						type: 'uri',
						label: 'クーポンはこちら',
						uri: params.url,
					},
					color: '#F36219FF',
					style: 'primary',
				},
			],
		};
	}
	return message;
}

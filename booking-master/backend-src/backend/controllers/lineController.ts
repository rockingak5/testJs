import { EventMessage, Message, ReplyableEvent, WebhookEvent } from '@line/bot-sdk';
import { Transaction } from 'sequelize';
import { RICH_MENU_TYPE, SYSTEM_ERROR } from '../config';
import { AppError } from '../utilities';
import { db } from '../models';
import { Member } from '../models/memberModel';
import { ChatService, LineService, memberFriendAddService, MemberService, SocketServerService } from '../services';

//WEBHOOK
export const handleEvent = async (event: WebhookEvent & ReplyableEvent) => {
	let replyObject: Message | Message[] | null = null;
	if (event.source.type === 'user') {
		if (!event.source.userId) {
			throw new AppError(SYSTEM_ERROR, 'lineId invalid');
		}
		let member = await MemberService.findMemberByLineId(event.source.userId);
		console.log('controllers.lineController.handleEvent', member);
		if (member == null) {
			const cLine = await LineService.getProfile(event.source.userId);
			if (cLine == null) {
				return null;
			}
			member = await db.members.create({
				displayName: cLine.displayName,
				lineId: cLine.userId,
				picUrl: cLine.pictureUrl,
				isFriends: true,
				curRM: RICH_MENU_TYPE.DEFAULT,
				via: 'others',
				origin: 'system',
			});
			SocketServerService.emitMemberCreated(member);
		} else {
			await MemberService.setRichmenuOfMember({
				member,
				type: member.curRM as RICH_MENU_TYPE,
			});
		}
		switch (event.type) {
			case 'message':
				replyObject = await handleMessage(event.message, member);
				break;
			case 'follow':
				await handleFollow(member);
				break;
			case 'unfollow':
				await handleUnfollow(member);
				break;
			default:
				break;
		}
		if (replyObject != null) {
			await LineService.replyMessage(event.replyToken, replyObject);
		}
	}
	return;
};
const handleMessage = async (message: EventMessage, member: Member) => {
	if (message.type == 'text') {
		await ChatService.createChatFromMember({
			member: member,
			contents: message.text,
			contentType: 'text',
			source: 'user',
		});
		SocketServerService.emitChatCreated({ memberId: member.memberId });
	}
	return null;
};

const handleFollow = async (member: Member, transaction?: Transaction) => {
	if (member.lineId) {
		await memberFriendAddService.upsertFriendAddedDate(member.lineId, new Date());
	}
	return member.update({ isFriends: true, friendAddedDate: new Date() }, { transaction });
};

const handleUnfollow = async (member: Member, transaction?: Transaction) => {
	if (member.lineId) {
		await memberFriendAddService.upsertFriendAddedDate(member.lineId, null);
	}
	return member.update({ isFriends: false, friendAddedDate: null }, { transaction });
};

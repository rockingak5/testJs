import { col, CreationAttributes, Transaction } from 'sequelize';
import { SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { Chat } from '../models/chatModel';
import { Member } from '../models/memberModel';
import { AppError } from '../utilities';
// import { LineService } from './lineService';
import { sendTextMessage } from './lineService';

export const createChatFromMember = async (
	{
		member,
		contents,
		contentType,
		source,
	}: { member: Member; contents: string; contentType: chatContentType; source: 'user' },
	transaction?: Transaction,
) => {
	let messages: CreationAttributes<Chat>[] = [];
	const textMessageMaxLength = 1000;
	if (contentType == 'text' && contents.length > textMessageMaxLength) {
		const segments = divideString(contents, textMessageMaxLength);
		messages = segments.map((segment) => ({ memberId: member.memberId, contents: segment, contentType, source }));
		for await (const message of messages) {
			await db.chats.create(message, { transaction });
		}
		await member.increment('unreadCount', { transaction });
		return;
	} else {
		return await Promise.all([
			db.chats.create({ memberId: member.memberId, contents, contentType, source }, { transaction }),
			member.increment('unreadCount', { transaction }),
		]);
	}
};

export const getChat = async (memberId: number, transaction?: Transaction) =>
	db.members
		.update(
			{ unreadCount: 0 },
			{
				where: { memberId: memberId },
				transaction,
			},
		)
		.then(([affectedCount]) =>
			Promise.all([
				Promise.resolve(affectedCount),
				db.chats.findAll({
					where: { memberId: memberId },
					order: [[col('chatId'), 'asc']],
					transaction,
				}),
			]),
		);

export const replyChat = async (memberId: number, contents: string, transaction?: Transaction) =>
	db.members
		.findByPk(memberId, { transaction })
		.then((member) => {
			if (member == null) {
				throw new AppError(SYSTEM_ERROR, `member ${memberId} does not exist`, false);
			} else if (member.lineId == null) {
				throw new AppError(SYSTEM_ERROR, `member ${memberId} no lineId`, false);
			} else {
				return member;
			}
		})
		.then((member) =>
			Promise.all([
				//send line message
				// LineService.sendMessage(member.lineId as string, contents),
				sendTextMessage(member.lineId as string, contents),
				db.chats.create(
					{ memberId: member.memberId, contents: contents, contentType: 'text', source: 'manager' },
					{ transaction },
				),
			]),
		);

function divideString(text: string, maxLength: number) {
	if (maxLength < 1) return [text];
	if (text.length <= maxLength) return [text];
	const result = [];
	let startIndex = 0;
	while (startIndex < text.length) {
		const segment = text.substring(startIndex, startIndex + maxLength);
		result.push(segment);
		startIndex += maxLength;
	}
	return result;
}

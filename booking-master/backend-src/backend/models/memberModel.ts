import {
	Sequelize,
	Model,
	DataTypes,
	Association,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	NonAttribute,
} from 'sequelize';
import { CampaignAnswer } from './campaignAnswerModel';
import { Chat } from './chatModel';
import { Registration } from './registrationModel';
import { Reminder } from './reminderModel';
import { Json } from 'sequelize/types/utils';
import { MemberGift } from './memberGiftModel';
import { DrawModel } from './draw.model';

export class Member extends Model<
	InferAttributes<Member, { omit: 'campaignAnswers' | 'chats' | 'registrations' | 'reminders' | 'memberGifts' }>,
	InferCreationAttributes<
		Member,
		{ omit: 'campaignAnswers' | 'chats' | 'registrations' | 'reminders' | 'memberGifts' | 'countVisit' }
	>
> {
	//ATTRIBUTES
	declare memberId: CreationOptional<number>;
	declare memberCode: string | null;
	declare lineId: string | null;
	declare displayName: string | null;
	declare picUrl: string | null;
	declare firstName: string | null;
	declare lastName: string | null;
	declare firstNameKana: string | null;
	declare lastNameKana: string | null;
	declare fullName: string | null;
	declare furiganaName: string | null;
	declare email: string | null;
	declare telephone: string | null;
	declare telephone2: string | null;
	declare telephone3: string | null;
	declare prefecture: string | null;
	declare city: string | null;
	declare areaCode: string | null;
	declare isConfirmed: boolean | null;
	declare currentPoints: number | null;
	declare origin: customerOrigin | null;
	declare notes: string | null;
	declare agent: string | null;
	declare via: memberViaType;
	declare postalCode: string | null;
	declare building: string | null;
	declare address: string | null;
	declare memberSince: Date | null;
	declare curRM: richmenuType | null;
	declare isCampaign: CreationOptional<boolean>;
	declare candidateAt: Date | null;
	declare isRegistered: CreationOptional<boolean>;
	declare isFriends: CreationOptional<boolean>;
	declare unreadCount: CreationOptional<number>;
	declare activeUntil: Date | null;
	declare lastVisit: Date | null;
	declare countVisit: number;
	declare friendAddedDate: Date | null;

	declare memberInfo?: Json;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare campaignAnswers?: NonAttribute<CampaignAnswer[]>;
	declare chats?: NonAttribute<Chat[]>;
	declare registrations?: NonAttribute<Registration[]>;
	declare reminders?: NonAttribute<Reminder[]>;
	declare memberGifts?: NonAttribute<MemberGift[]>;
	declare companyName: string | null;
	declare draws?: NonAttribute<DrawModel>;

	declare static associations: {
		campaignAnswers: Association<Member, CampaignAnswer>;
		chats: Association<Member, Chat>;
		registrations: Association<Member, Registration>;
		reminders: Association<Member, Reminder>;
		memberGifts: Association<Member, MemberGift>;
		draws: Association<Member, DrawModel>;
	};

	public addOrDeductPoint(newRelativePoint: number, pointIsAdd: boolean) {
		const addOrReduceMultiplier = pointIsAdd ? 1 : -1;
		const previousPoint = this.currentPoints ?? 0;
		return previousPoint + newRelativePoint * addOrReduceMultiplier;
	}

	static initClass = (sequelize: Sequelize) =>
		Member.init(
			{
				memberId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				memberCode: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				lineId: { type: DataTypes.STRING, unique: true, allowNull: true, defaultValue: null },
				displayName: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				picUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				firstName: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
				lastName: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
				fullName: { type: DataTypes.STRING(50), allowNull: true },
				furiganaName: { type: DataTypes.STRING(100), allowNull: true },
				firstNameKana: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
				lastNameKana: { type: DataTypes.STRING(32), allowNull: true, defaultValue: null },
				email: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
				telephone: { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
				telephone2: { type: DataTypes.STRING(20), allowNull: true },
				telephone3: { type: DataTypes.STRING(20), allowNull: true },
				prefecture: { type: DataTypes.STRING(20), allowNull: true },
				postalCode: { type: DataTypes.STRING(10), allowNull: true, defaultValue: null },
				city: { type: DataTypes.STRING(20), allowNull: true },
				areaCode: { type: DataTypes.STRING(20), allowNull: true },
				isConfirmed: { type: DataTypes.BOOLEAN, allowNull: true },
				currentPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				origin: { type: DataTypes.STRING(10), allowNull: false },
				notes: { type: DataTypes.STRING(500), allowNull: true },
				agent: { type: DataTypes.STRING(50), allowNull: true },
				building: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
				address: { type: DataTypes.STRING(200), allowNull: true, defaultValue: null },
				memberSince: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },
				curRM: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
				isCampaign: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				candidateAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
				isRegistered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isFriends: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				unreadCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				via: { type: DataTypes.STRING(30), allowNull: false },
				memberInfo: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
				companyName: { type: DataTypes.STRING(100), allowNull: true },
				activeUntil: { type: DataTypes.DATEONLY, allowNull: true, defaultValue: null },
				lastVisit: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
				countVisit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				friendAddedDate: { type: DataTypes.DATE, allowNull: true, defaultValue: null },

				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				paranoid: false,
				tableName: 'members',
				modelName: 'Member',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Member',
					plural: 'members',
				},
			},
		);
}

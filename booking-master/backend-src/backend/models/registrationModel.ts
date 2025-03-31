import {
	Model,
	Association,
	Sequelize,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
	CreationOptional,
	ForeignKey,
} from 'sequelize';
import { Occurrence } from './occurrenceModel';
import { Member } from './memberModel';
import { Reminder } from './reminderModel';
import { Occasion } from './occasionModel';
import { Category } from './categoryModel';
import { Json } from 'sequelize/types/utils';
import { Campaign } from './campaignModel';
import { MemberGift } from './memberGiftModel';

export class Registration extends Model<
	InferAttributes<
		Registration,
		{ omit: 'Occurrence' | 'Occasion' | 'Category' | 'Member' | 'reminders' | 'Campaign' | 'memberGifts' }
	>,
	InferCreationAttributes<
		Registration,
		{ omit: 'Occurrence' | 'Occasion' | 'Category' | 'Member' | 'reminders' | 'Campaign' | 'memberGifts' }
	>
> {
	declare registrationId: CreationOptional<number>;
	declare memberId: ForeignKey<Member['memberId'] | null>;
	declare occurrenceId: ForeignKey<Occurrence['occurrenceId']>;
	declare categoryId: ForeignKey<Category['categoryId'] | null>;
	declare occasionId: ForeignKey<Occasion['occasionId'] | null>;
	declare campaignId: ForeignKey<Campaign['campaignId'] | null>;
	declare expected: number;
	declare attended: CreationOptional<number>;
	declare isNotified1: Date | null;
	declare isNotified2: Date | null;
	declare cancelledAt: Date | null;
	declare message: string | null;
	declare isRegistered: boolean;
	declare isFriends: boolean;
	declare isManual: boolean;
	declare remarks: string | null;
	declare note?: Json;
	declare isNotificationSent?: boolean;
	declare participantName: CreationOptional<string>;
	declare participantCount: CreationOptional<number>;
	declare companionCount: CreationOptional<number>;
	declare actualParticipantCount: CreationOptional<number | null>;
	declare actualCompanionCount: CreationOptional<number | null>;

	declare isWin?: boolean;

	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare deletedAt: CreationOptional<Date>;
	//ASSOCIATION
	declare Category?: NonAttribute<Category>;
	declare Occasion?: NonAttribute<Occasion>;
	declare Occurrence?: NonAttribute<Occurrence>;
	declare Member?: NonAttribute<Member>;
	declare reminders?: NonAttribute<Reminder[]>;
	declare Campaign?: NonAttribute<Campaign>;
	declare memberGifts?: NonAttribute<MemberGift[]>;

	declare static associations: {
		Category: Association<Category, Registration>;
		Occasion: Association<Occasion, Registration>;
		Occurrence: Association<Occurrence, Registration>;
		Member: Association<Member, Registration>;
		reminders: Association<Reminder, Registration>;
		Campaign: Association<Campaign, Registration>;
		memberGifts: Association<Registration, MemberGift>;
	};
	static initClass = (sequelize: Sequelize) =>
		Registration.init(
			{
				registrationId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					allowNull: false,
					primaryKey: true,
					autoIncrement: true,
				},
				expected: { type: DataTypes.TINYINT, allowNull: false },
				attended: {
					type: DataTypes.TINYINT({
						length: 1,
					}),
					allowNull: true,
					defaultValue: 0,
				},
				isNotified1: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
				isNotified2: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
				cancelledAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
				message: { type: DataTypes.STRING(200), allowNull: true, defaultValue: null },
				isRegistered: { type: DataTypes.BOOLEAN, allowNull: false },
				isFriends: { type: DataTypes.BOOLEAN, allowNull: false },
				isManual: { type: DataTypes.BOOLEAN, allowNull: false },
				remarks: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				note: { type: DataTypes.JSON, allowNull: true },
				participantName: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				participantCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
				companionCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
				actualParticipantCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
				actualCompanionCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },

				isWin: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isNotificationSent: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },

				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
				deletedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'registrations',
				modelName: 'Registration',
				name: {
					singular: 'Registration',
					plural: 'registrations',
				},
			},
		);
}

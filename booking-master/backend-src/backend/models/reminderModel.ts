import {
	Model,
	Sequelize,
	DataTypes,
	Association,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
	ForeignKey,
	CreationOptional,
} from 'sequelize';
import { Member } from './memberModel';
import { Registration } from './registrationModel';
export class Reminder extends Model<
	InferAttributes<Reminder, { omit: 'Registration' | 'Member' }>,
	InferCreationAttributes<Reminder, { omit: 'Registration' | 'Member' }>
> {
	//ATTRIBUTES
	declare reminderId: CreationOptional<number>;
	declare memberId: ForeignKey<Member['memberId']>;
	declare registrationId: ForeignKey<Registration['registrationId']>;
	declare remindDT: Date;
	declare completeAt: Date | null;
	declare message: string;
	declare key: 'isNotified1' | 'isNotified2';

	declare Member?: NonAttribute<Member>;
	declare Registration?: NonAttribute<Registration>;
	declare static associations: {
		Member: Association<Member, Reminder>;
		Registration: Association<Registration, Reminder>;
	};
	static initClass = (sequelize: Sequelize) =>
		Reminder.init(
			{
				reminderId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
				remindDT: { type: DataTypes.DATE, allowNull: false },
				completeAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
				message: { type: DataTypes.STRING, allowNull: false },
				key: { type: DataTypes.STRING(30), allowNull: true },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'reminders',
				modelName: 'Reminder',
				name: {
					singular: 'Reminder',
					plural: 'reminders',
				},
			},
		);
}

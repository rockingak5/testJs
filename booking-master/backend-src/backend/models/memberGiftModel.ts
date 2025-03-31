import {
	Model,
	Association,
	Sequelize,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	NonAttribute,
	ForeignKey,
} from 'sequelize';
import { Gift } from './giftModel';
import { Member } from './memberModel';
import { Registration } from './registrationModel';
export class MemberGift extends Model<
	InferAttributes<MemberGift, { omit: 'Gift' | 'Member' | 'registrations' }>,
	InferCreationAttributes<MemberGift, { omit: 'Gift' | 'Member' | 'registrations' }>
> {
	//TIMESTAMPS
	declare memberGiftId: CreationOptional<number>;

	declare memberId: ForeignKey<Member['memberId']>;
	declare giftId: ForeignKey<Gift['giftId']>;
	declare registrationId: ForeignKey<Registration['registrationId']>;

	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare deletedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Member?: NonAttribute<Member>;
	declare Gift?: NonAttribute<Gift>;
	declare registrations?: NonAttribute<Registration>;

	declare static associations: {
		Gift: Association<MemberGift, Gift>;
		Member: Association<MemberGift, Member>;
		Registration: Association<MemberGift, Registration>;
	};
	static initClass = (sequelize: Sequelize) =>
		MemberGift.init(
			{
				memberGiftId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },

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
				tableName: 'memberGifts',
				modelName: 'MemberGift',
				name: {
					singular: 'MemberGift',
					plural: 'memberGifts',
				},
			},
		);
}

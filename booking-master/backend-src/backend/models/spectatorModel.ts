import {
	Sequelize,
	Model,
	DataTypes,
	Association,
	Transaction,
	ForeignKey,
	CreationOptional,
	NonAttribute,
	InferAttributes,
	InferCreationAttributes,
} from 'sequelize';
import { Member } from './memberModel';
export class Spectator extends Model<
	InferAttributes<Spectator, { omit: 'Member' }>,
	InferCreationAttributes<Spectator, { omit: 'Member' }>
> {
	//ATTRIBUTES
	declare spectatorId: CreationOptional<number>;
	declare memberId: ForeignKey<Member['memberId']>;
	declare isSpectatingMember: CreationOptional<boolean>;
	declare isSpectatingCampaign: CreationOptional<boolean>;
	declare isSpectatingRegistration: CreationOptional<boolean>;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Member: NonAttribute<Member>;
	declare static associations: {
		Member: Association<Member, Spectator>;
	};
	static async getAdmins(transaction?: Transaction) {
		return await Spectator.findAll({
			include: {
				association: Spectator.associations.Member,
				attributes: ['displayName', 'firstName', 'lastName', 'lineId'],
			},
			transaction: transaction,
		});
	}
	static initClass = (sequelize: Sequelize) =>
		Spectator.init(
			{
				spectatorId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
				},
				memberId: { type: DataTypes.INTEGER({ unsigned: true }), allowNull: false, unique: 'memberId' },
				isSpectatingMember: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isSpectatingCampaign: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isSpectatingRegistration: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'spectators',
				modelName: 'Spectator',
				name: {
					singular: 'Spectator',
					plural: 'spectators',
				},
			},
		);
}

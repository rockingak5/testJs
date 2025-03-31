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
import { OccasionDetail } from './occasionDetailModel';
import { OccasionImage } from './occasionImageModel';
import { Registration } from './registrationModel';
import { Campaign } from './campaignModel';
import { MemberGift } from './memberGiftModel';
// import { CategoryTag } from './categoryTagModel'

export class Gift extends Model<
	InferAttributes<Gift, { omit: 'registrations' | 'Campaign' | 'memberGifts' }>,
	InferCreationAttributes<Gift, { omit: 'registrations' | 'Campaign' | 'memberGifts' }>
> {
	declare giftId: CreationOptional<number>;
	declare campaignId: ForeignKey<Campaign['campaignId'] | null>;
	declare title: string;
	declare description: string;
	declare canOverlap: CreationOptional<boolean>;
	declare isDisplayed: CreationOptional<boolean>;
	declare showOrder: CreationOptional<number>;

	declare total: CreationOptional<number>;
	declare available: CreationOptional<boolean>;
	declare default: CreationOptional<boolean>;
	declare isSendGiftImage: CreationOptional<boolean>;
	declare type: CreationOptional<'gift' | 'ticket'>;

	//TIMESTAMPS
	declare createdAt?: CreationOptional<Date>;
	declare updatedAt?: CreationOptional<Date>;
	declare deletedAt?: CreationOptional<Date>;
	//ASSOCIATIONS
	declare occasionDetails?: NonAttribute<OccasionDetail[]>;
	declare occasionImages?: NonAttribute<OccasionImage[]>;
	declare registrations?: NonAttribute<Registration[]>;
	declare Campaign?: NonAttribute<Campaign>;
	declare memberGifts?: NonAttribute<MemberGift[]>;

	declare static associations: {
		Campaign: Association<Gift, Campaign>;
		occasionDetails: Association<Gift, OccasionDetail>;
		occasionImages: Association<Gift, OccasionImage>;
		registrations: Association<Gift, Registration>;
		memberGifts: Association<Gift, MemberGift>;
	};
	static initClass = (sequelize: Sequelize) =>
		Gift.init(
			{
				giftId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					allowNull: false,
					primaryKey: true,
					autoIncrement: true,
				},

				title: { type: DataTypes.STRING(100), allowNull: false },
				description: { type: DataTypes.STRING(500), allowNull: false },
				canOverlap: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
				total: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
				available: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				default: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isSendGiftImage: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				type: { type: DataTypes.ENUM('gift', 'ticket'), allowNull: false, defaultValue: 'ticket' },
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'gifts',
				modelName: 'Gift',
				name: {
					singular: 'Gift',
					plural: 'gifts',
				},
			},
		);
}

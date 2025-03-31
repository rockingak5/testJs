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
import { Category } from './categoryModel';
import { OccasionDetail } from './occasionDetailModel';
import { OccasionImage } from './occasionImageModel';
import { Occurrence } from './occurrenceModel';
import { Registration } from './registrationModel';
import { Json } from 'sequelize/types/utils';
import { Campaign } from './campaignModel';
import { OccasionCancelCondition } from './occasionCancelConditionsModel';
import { CategoryMessageDetail } from './categoryMessageDetail';

export class Occasion extends Model<
	InferAttributes<
		Occasion,
		{ omit: 'Category' | 'occurrences' | 'registrations' | 'Campaign' | 'CategoryMessageDetail' }
	>,
	InferCreationAttributes<
		Occasion,
		{ omit: 'Category' | 'occurrences' | 'registrations' | 'Campaign' | 'CategoryMessageDetail' }
	>
> {
	declare occasionId: CreationOptional<number>;
	declare categoryId: ForeignKey<Category['categoryId'] | null>;
	declare campaignId: ForeignKey<Campaign['campaignId'] | null>;
	declare title: string;
	declare description: string;
	declare canOverlap: CreationOptional<boolean>;
	declare isDisplayed: CreationOptional<boolean>;
	declare showOrder: CreationOptional<number>;

	declare isSettingTime: CreationOptional<boolean>;
	declare startRegistration: CreationOptional<Date>;
	declare endRegistration: CreationOptional<Date>;
	declare startDate: CreationOptional<Date>;
	declare endDate: CreationOptional<Date>;
	declare numberOfPeople: CreationOptional<number>;
	declare isMultiEvent: CreationOptional<boolean>;
	declare notRegisterEventSameTime: CreationOptional<boolean>;
	declare message?: Json;
	declare fee: CreationOptional<number>;
	declare cancelDescription: CreationOptional<string>;
	declare cancelable: CreationOptional<boolean>;
	declare cancelConditions?: CreationOptional<OccasionCancelCondition[]>;
	declare groupBooking: CreationOptional<boolean>;
	declare isMessage: CreationOptional<boolean>;

	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare deletedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare occasionDetails?: NonAttribute<OccasionDetail[]>;
	declare occasionImages?: NonAttribute<OccasionImage[]>;
	declare occurrences?: NonAttribute<Occurrence[]>;
	declare registrations?: NonAttribute<Registration[]>;
	declare Campaign?: NonAttribute<Campaign>;
	declare CancelConditions?: NonAttribute<OccasionCancelCondition[]>;
	declare CategoryMessageDetail?: NonAttribute<CategoryMessageDetail>;

	declare static associations: {
		Category: Association<Occasion, Category>;
		Campaign: Association<Occasion, Campaign>;
		occasionDetails: Association<Occasion, OccasionDetail>;
		occasionImages: Association<Occasion, OccasionImage>;
		occurrences: Association<Occasion, Occurrence>;
		registrations: Association<Occasion, Registration>;
		cancelConditions?: Association<Occasion, OccasionCancelCondition>;
		CategoryMessageDetail?: Association<Occasion, CategoryMessageDetail>;
	};
	static initClass = (sequelize: Sequelize) =>
		Occasion.init(
			{
				occasionId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					allowNull: false,
					primaryKey: true,
					autoIncrement: true,
				},

				fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.0 },
				cancelable: {
					type: DataTypes.BOOLEAN,
					defaultValue: false,
				},
				cancelDescription: {
					type: DataTypes.STRING,
					allowNull: true,
					defaultValue: null,
				},
				groupBooking: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},

				title: { type: DataTypes.STRING(100), allowNull: false },
				description: { type: DataTypes.STRING(500), allowNull: false },
				canOverlap: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },

				isSettingTime: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isMultiEvent: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				notRegisterEventSameTime: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				startRegistration: { type: DataTypes.DATE, allowNull: true },
				endRegistration: { type: DataTypes.DATE, allowNull: true },
				startDate: { type: DataTypes.DATE, allowNull: true },
				endDate: { type: DataTypes.DATE, allowNull: true },
				numberOfPeople: { type: DataTypes.SMALLINT, allowNull: true },
				message: { type: DataTypes.JSON, allowNull: true },
				isMessage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

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
				tableName: 'occasions',
				modelName: 'Occasion',
				name: {
					singular: 'Occasion',
					plural: 'occasions',
				},
			},
		);
}

import {
	Sequelize,
	Model,
	Association,
	DataTypes,
	CreationOptional,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
} from 'sequelize';
import { CategoryArea } from './categoryAreaModel';
import { CategoryDetail } from './categoryDetailModel';
import { CategoryImage } from './categoryImageModel';
import { CategoryTag } from './categoryTagModel';
import { Occasion } from './occasionModel';
import { Occurrence } from './occurrenceModel';
import { Registration } from './registrationModel';
import { CategoryMessage } from './categoryMessageModel';
import { Transaction } from './transactionModel';
import { CategoryCancelCondition } from './categoryCancelConditions';
import { CategoryMessageDetail } from './categoryMessageDetail';

export class Category extends Model<
	InferAttributes<
		Category,
		{
			omit:
				| 'occasions'
				| 'occurrences'
				| 'registrations'
				| 'categoryDetails'
				| 'categoryMessages'
				| 'categoryImages'
				| 'categoryTags'
				| 'CategoryMessageDetail';
		}
	>,
	InferCreationAttributes<
		Category,
		{
			omit:
				| 'occasions'
				| 'occurrences'
				| 'registrations'
				| 'categoryDetails'
				| 'categoryMessages'
				| 'categoryImages'
				| 'categoryTags'
				| 'CategoryMessageDetail';
		}
	>
> {
	//ATTRIBUTES
	declare categoryId: CreationOptional<number>;
	declare title: string;
	declare sub: string;
	declare description: string | null;
	declare campaignText: string | null;
	declare location: string | null;
	declare showOrder: CreationOptional<number>;
	declare isDisplayed: CreationOptional<boolean>;
	declare fee: number;
	declare cancelDescription: CreationOptional<string>;
	declare cancelable: CreationOptional<boolean>;
	declare isSettingTime: CreationOptional<boolean>;
	declare isSendImage: CreationOptional<boolean>;
	declare isProgram: CreationOptional<boolean>;
	declare startRegistration: CreationOptional<Date>;
	declare endRegistration: CreationOptional<Date>;
	declare startDate: CreationOptional<Date>;
	declare endDate: CreationOptional<Date>;
	declare numberOfPeople: CreationOptional<number>;
	declare isMultiEvent: CreationOptional<boolean>;
	declare notRegisterEventSameTime: CreationOptional<boolean>;
	declare checkInEnabled: CreationOptional<boolean>;
	declare type: 'qr' | 'ticket';
	declare groupBooking: CreationOptional<boolean>;
	declare cancelConditions?: CreationOptional<CategoryCancelCondition[]>;
	declare isMessage: CreationOptional<boolean>;

	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare deletedAt: CreationOptional<Date> | null;
	//ASSOCIATIONS
	declare categoryDetails?: NonAttribute<CategoryDetail[]>;
	declare categoryMessages?: NonAttribute<CategoryMessage[]>;
	declare categoryImages?: NonAttribute<CategoryImage[]>;
	declare categoryTags?: NonAttribute<CategoryTag[]>;
	declare occasions?: NonAttribute<Occasion[]>;
	declare occurrences?: NonAttribute<Occurrence[]>;
	declare registrations?: NonAttribute<Registration[]>;
	declare CategoryTransactions?: NonAttribute<Transaction[]>;
	declare CategoryCancelConditions?: NonAttribute<CategoryCancelCondition[]>;
	declare CancelConditions?: NonAttribute<CategoryCancelCondition[]>;
	declare CategoryMessageDetail?: NonAttribute<CategoryMessageDetail>;

	declare static associations: {
		categoryAreas: Association<Category, CategoryArea>;
		categoryDetails: Association<Category, CategoryDetail>;
		categoryMessages: Association<Category, CategoryMessage>;
		categoryImages: Association<Category, CategoryImage>;
		categoryTags: Association<Category, CategoryTag>;
		occasions: Association<Occasion, Category>;
		occurrences: Association<Occurrence, Category>;
		registrations: Association<Registration, Category>;
		cancelConditions?: Association<Category, CategoryCancelCondition>;
		CategoryMessageDetail?: Association<Category, CategoryMessageDetail>;
	};
	static initClass = (sequelize: Sequelize) =>
		Category.init(
			{
				categoryId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				title: { type: DataTypes.STRING, allowNull: false },
				sub: { type: DataTypes.STRING, allowNull: false },
				description: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				campaignText: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				location: { type: DataTypes.STRING(1000), allowNull: true, defaultValue: null },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
				type: { type: DataTypes.ENUM('qr', 'ticket'), allowNull: false, defaultValue: 'qr' },
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
				checkInEnabled: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: true,
				},
				groupBooking: {
					type: DataTypes.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},

				isSettingTime: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isSendImage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isProgram: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				isMultiEvent: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				notRegisterEventSameTime: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				startRegistration: { type: DataTypes.DATE, allowNull: true },
				endRegistration: { type: DataTypes.DATE, allowNull: true },
				startDate: { type: DataTypes.DATE, allowNull: true },
				endDate: { type: DataTypes.DATE, allowNull: true },
				numberOfPeople: { type: DataTypes.SMALLINT, allowNull: true },
				isMessage: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
				deletedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: true,
				tableName: 'categories',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Category',
					plural: 'categories',
				},
			},
		);
}

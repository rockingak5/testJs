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
import { Category } from './categoryModel';
import { Occasion } from './occasionModel';
import { Registration } from './registrationModel';
import { Campaign } from './campaignModel';
export class Occurrence extends Model<
	InferAttributes<Occurrence, { omit: 'Occasion' | 'Category' | 'registrations' | 'Campaign' }>,
	InferCreationAttributes<Occurrence, { omit: 'Occasion' | 'Category' | 'registrations' | 'Campaign' }>
> {
	declare occurrenceId: CreationOptional<number>;
	declare occasionId: ForeignKey<Occasion['occasionId'] | null>;
	declare categoryId: ForeignKey<Category['categoryId'] | null>;
	declare campaignId: ForeignKey<Campaign['campaignId'] | null>;
	declare startDate: Date;
	declare startAt: Date;
	declare endAt: Date;
	declare maxAttendee: number;
	declare isDisplayed: CreationOptional<boolean>;
	declare remarks: string | null;
	declare sumExpected?: NonAttribute<number>;
	declare isSettingTime: CreationOptional<boolean>;

	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare deletedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare Occasion?: NonAttribute<Occasion>;
	declare registrations?: NonAttribute<Registration[]>;
	declare Campaign?: NonAttribute<Campaign>;
	declare static associations: {
		Category: Association<Occurrence, Category>;
		Occasion: Association<Occurrence, Occasion>;
		registrations: Association<Occurrence, Registration>;
		Campaign: Association<Occurrence, Campaign>;
	};
	static initClass = (sequelize: Sequelize) =>
		Occurrence.init(
			{
				occurrenceId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					allowNull: false,
					primaryKey: true,
					autoIncrement: true,
				},
				// occasionId: { type: DataTypes.INTEGER({ unsigned: true }), allowNull: false },
				startDate: { type: DataTypes.DATE, allowNull: false },
				startAt: { type: DataTypes.DATE, allowNull: false },
				endAt: { type: DataTypes.DATE, allowNull: false },
				maxAttendee: { type: DataTypes.INTEGER, allowNull: false },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
				remarks: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				isSettingTime: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

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
				tableName: 'occurrences',
				modelName: 'Occurrence',
				name: {
					singular: 'Occurrence',
					plural: 'occurrences',
				},
			},
		);
}

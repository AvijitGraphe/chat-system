const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const Group = sequelize.define(
  "Group",
  {
    group_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    group_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_by:{
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "user_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      allowNull: false,
    },
    create_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    update_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: "Group",
    underscored: true,
  }
);


Group.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
module.exports = Group;
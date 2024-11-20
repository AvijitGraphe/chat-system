const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Group = require("./Group");
const User = require("./User");

const GroupMember = sequelize.define(
  "GroupMember",
  {
    group_member_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    group_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Group,
        key: "group_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      allowNull: false,
    },
    group_name:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "user_id",
      },
      onDelete: "CASCADE",  
      onUpdate: "CASCADE",
      allowNull: false,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    }
  },
  {
    timestamps: true,
    tableName: "GroupMember",
    underscored: true,
  }
);  

module.exports = GroupMember;
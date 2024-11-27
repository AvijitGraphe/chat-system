
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Group = require("./Group");
const User = require("./User");
const Message = require("./Message");
const GroupMember = require("./GroupMember");
require("dotenv").config();

const GroupMessageRead = sequelize.define(
  "GroupMessageRead",
  {
    read_id: {
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
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: "user_id",
      },
      onDelete: "CASCADE",  
      onUpdate: "CASCADE",
      allowNull: true,
    },
    message_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Message,
        key: "message_id",
      },
      onDelete: "CASCADE",  
      onUpdate: "CASCADE",
      allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('check', 'uncheck'), 
        defaultValue: 'uncheck', 
        allowNull: false,
      },
    read_at: {
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
    tableName: "GroupMessageRead",
    underscored: true,
  }
);  

GroupMessageRead.belongsTo(Group, { foreignKey: "group_id" });
GroupMessageRead.belongsTo(User, { foreignKey: "user_id" });
GroupMessageRead.belongsTo(Message, { foreignKey: "message_id" });



module.exports = GroupMessageRead;
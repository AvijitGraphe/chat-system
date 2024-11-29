const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Group = require("./Group");
const User = require("./User");


const Message = sequelize.define("Message", {
  message_id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  sender_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: "user_id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    allowNull: false,
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: "user_id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
    allowNull: true,
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
  content: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  prevMessageId:{
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  prevContent: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sender_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  rebackName: {
    type: DataTypes.STRING,
    defaultValue: "",
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('check', 'uncheck'), 
    defaultValue: 'uncheck', 
    allowNull: false,
  },
  group_status: {
    type: DataTypes.ENUM('check', 'uncheck'), 
    defaultValue: 'uncheck', 
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false, 
  tableName: "Message",
});


Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });
Message.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

module.exports = Message;

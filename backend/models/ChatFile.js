const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Messages = require("./Message");

const ChatFile = sequelize.define(
  "ChatFile",
  {
    file_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    message_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Messages,
        key: "message_id",
      },
      allowNull: true,
    },
  },
  {
    timestamps: true,
    tableName: "ChatFile",
    underscored: true,
  }
);

ChatFile.belongsTo(Messages, { foreignKey: "message_id", as: "message" });

module.exports = ChatFile;

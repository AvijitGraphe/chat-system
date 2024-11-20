const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User_Status = sequelize.define(
  "User_Status",
  {
    user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "User",
        key: "user_id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    tableName: "User_Status",
    underscored: true,
  }
);

module.exports = User_Status;
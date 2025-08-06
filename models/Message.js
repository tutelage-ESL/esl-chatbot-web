module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sender: {
      type: DataTypes.STRING,
      allowNull: false, // 'user' or 'bot'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
  }, {
    tableName: 'Messages',
    timestamps: true
  });
};
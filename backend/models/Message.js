module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
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
        allowNull: false
      },
  }, {
    tableName: 'messages',
    timestamps: true
  });

  // Define associations
  Message.associate = function(models) {
    Message.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      constraints: false
    });
  };

  return Message;
};
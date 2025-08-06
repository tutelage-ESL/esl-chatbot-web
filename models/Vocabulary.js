module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Vocabulary', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    word: {
      type: DataTypes.STRING,
      allowNull: false
    },
    definition: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pronunciation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    example: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    partOfSpeech: {
      type: DataTypes.STRING,
      allowNull: true
    },
    synonyms: {
      type: DataTypes.JSON,
      allowNull: true
    },
    antonyms: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'Vocabulary',
    timestamps: true
  });
};
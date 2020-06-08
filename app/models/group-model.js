let mongoose = require('mongoose');

let GroupSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  alias: {
    $type: String,
    required: [true, "aliasRequired"],
  },
  // Институт, в котором находится группа
  institute: {
    $type: mongoose.Types.ObjectId
  },
  // Участники академической группы
  members: [
    {
      $type: mongoose.Types.ObjectId
    }
  ],
  // Курсы, доступные для данной группы
  courses: [
    {
      $type: mongoose.Types.ObjectId
    }
  ],
  // Руководитель группы
  director: {
    $type: mongoose.Types.ObjectId
  }
}, { typeKey: '$type' });

let Group = mongoose.model('Group', GroupSchema);

module.exports = Group;
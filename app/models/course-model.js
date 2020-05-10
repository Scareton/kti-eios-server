let mongoose = require('mongoose');

// КОНТЕНТ (Вложения в курс)
// TODO сортировка вложений (order)
let ContentSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  type: {
    $type: String,
    required: [true, "typeRequired"],
  },
  description: {
    $type: String,
    required: [true, "contentRequired"]
  },
  students: [
    {
      _id: {
        $type: mongoose.Types.ObjectId,
        required: [true, "studentIdRequired"]
      },
      s: {
        $type: Number,
        required: [true, "studentStatusRequired"]
      }
    }
  ],
  req: [{
    target: {
      $type: mongoose.Types.ObjectId,
      required: [true, "reqTargetRequired"]
    }
  }]
}, { typeKey: '$type' })
let Content = mongoose.model('Content', ContentSchema);

// СЕКЦИЯ
let SectionSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  description: {
    $type: String
  },
  students: [
    {
      _id: {
        $type: mongoose.Types.ObjectId,
        required: [true, "studentIdRequired"]
      },
      s: {
        $type: Number,
        required: [true, "studentStatusRequired"]
      }
    }
  ],
  content: [ContentSchema],
  req: [{
    target: {
      $type: mongoose.Types.ObjectId,
      required: [true, "reqTargetRequired"]
    }
  }]
}, { typeKey: '$type' })
let Section = mongoose.model('Section', SectionSchema);

// КУРС
let CourseSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  availability: {
    $type: Number,
    default: 0
  },
  description: {
    $type: String,
    default: ""
  },
  level: {
    $type: mongoose.Types.ObjectId,
    required: [true, "levelRequired"]
  },
  discipline: {
    $type: mongoose.Types.ObjectId,
    required: [true, "disciplineRequired"]
  },
  type: {
    $type: String,
    default: "course",
    immutable: true
  },
  sections: [SectionSchema]
}, { typeKey: '$type' });
let Course = mongoose.model('Course', CourseSchema);


module.exports = Course;
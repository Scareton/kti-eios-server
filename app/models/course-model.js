let mongoose = require('mongoose');

// КОНТЕНТ (Вложения в курс)
// TODO сортировка вложений (order)
let ContentSchema = new mongoose.Schema({
  name: {
    $type: String,
    required: [true, "nameRequired"],
  },
  type: {
    $type: Number,
    required: [true, "typeRequired"],
  },
  taskDT: {
    $type: Array
  },
  description: {
    $type: String,
    required: [true, "contentRequired"]
  },
  content: {
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
      },
      a: {
        p: {
          $type: String
        },
        s: {
          $type: Number
        }
      }
    }
  ],
  req: {
    target: {
      $type: mongoose.Types.ObjectId
    }
  }
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
  req: {
    target: {
      $type: mongoose.Types.ObjectId
    }
  }
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
let mongoose = require('mongoose');

let UserSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, "nameRequired"],
    trim: true
  },
  surname: {
    type: String,
    required: [true, "surnameRequired"],
    trim: true
  },
  patronymic: {
    type: String,
    trim: true
  },
  username: {
    type: String,
    required: [true, "usernameRequired"],
    maxlength: [32, "tooLong"],
    minlength: [4, "tooShort"],
    match: [/^[a-zA-Z0-9]+$/, "usernameIncorrect"],
    unique: [true, "usernameUnique"]
  },
  password: {
    type: String,
    maxlength: [32, "tooLong"],
    minlength: [8, "tooShort"],
    match: [/(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z!@#$%^&*]{6,}/, "passwordIncorrect"],
    required: [true, "passwordRequired"]
  },
  image: {
    type: String,
  },
  role: {
    type: Number,
    required: [true, "roleRequired"]
  },
  student: {
    year: {
      type: Number,
      required: [true, "studentYearRequired"]
    },
    specialty: {
      name: {
        type: String,
        required: [true, "specialityNameRequired"]
      },
      url: {
        type: String,
        required: [true, "specialityUrlRequired"]
      }
    }
  },
  teacher: {
    disciplines: [
      {
        name: {
          type: String,
          required: [true, "disciplineNameRequired"]
        },
        url: {
          type: String,
          required: [true, "disciplineUrlRequired"]
        }
      }
    ]
  },
  email: {
    type: String,
    trim: true,
    required: [true, "emailRequired"]
  }
});

let User = mongoose.model('User', UserSchema);

module.exports = User;
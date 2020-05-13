const app = require('../../index').app;
const mustAuthenticated = require('../../index').mustAuthenticated;
const mongoose = require("mongoose");

let multer = require('multer')
let path = require('path')
let mkdirp = require('mkdirp');

const CourseModel = require('../models/course-model')
const CategoryModel = require("../models/category-model")
const LevelModel = require("../models/level-model")
const FacultyModel = require("../models/faculty-model")
const InstituteModel = require("../models/institute-model")
const DisciplineModel = require("../models/discipline-model")

let targetStatuses = {
  "sections": 6,
  1: 1,
  2: 5
}

/**
 * Получить список курсов
 */
app.get("/api/courses", (req, res) => {
  CourseModel.aggregate([
    {
      $project: {
        _id: 1,
        name: 1,
        availability: 1,
        description: 1,
        level: 1,
        discipline: 1,
        type: 1
      }
    },
    {
      $lookup: {
        from: 'disciplines',
        localField: 'discipline',
        foreignField: '_id',
        as: 'discipline'
      }
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'level',
        foreignField: '_id',
        as: 'level'
      }
    },
    {
      $unwind: "$level"
    },
    {
      $unwind: "$discipline"
    }
  ]).exec((err, courses) => {
    if (!err) {
      res.send(courses)
    }
    else {
      console.log(err)
      res.status(500).send("Произошла ошибка при получении курсов")
    }
  })
})

/**
 * Проверить требования для получения секции или вложения
 */
function checkElementRequirments(element, parent, user, type) {
  return new Promise((resolve, reject) => {
    // Проверка, есть ли у элемента требования
    if (element.req.target) {
      // Найти цель, на которую ссылается требование 
      let target = parent[type].find(item => item._id.equals(element.req.target))
      // Какой статус должен быть для выполнения требования
      // Тип элемента - статус

      // Найти текущего пользователя в списке пользователей цели
      let targetStudent = target.students.find(item => item._id.equals(user._id))
      // Если пользователь найден в списке
      if (targetStudent !== undefined) {
        // Проверить статус пользователя для элемента-цели
        if (targetStudent.s !== targetStatuses[target.type]) resolve(false)
      }
      // Если пользователь не найден в списке - отклонить элемент
      else resolve(false)
      // Если перебор прошёл успешно - вернуть элемент
      resolve(true);
    }
    // Если у элемента нет требований - вернуть элемент
    else resolve(true);
  })
}

function createPreviewForBlockedElement(element) {
  let preview = {
    _id: element._id,
    name: element.name,
    students: element.students,
    type: element.type,
    blocked: true
  }
  if (element.description) preview.description = element.description;
  return preview;
}

async function checkRequirments(course, user) {
  await Promise.all(course.sections.map(async (section, sectionIndex) => {
    await checkElementRequirments(section, course, user, "sections")
      .then(async (sectionResult) => {
        if (!sectionResult) course.sections[sectionIndex] = createPreviewForBlockedElement(section)
        else {
          await Promise.all(section.content.map(async (content, contentIndex) => {
            await checkElementRequirments(content, section, user, "content")
              .then(contentResult => {
                if (!contentResult) section.content[contentIndex] = createPreviewForBlockedElement(content)
              })
          }))
        }
      });
  }));
}

function addStudent(element, userId, status) {
  // Найти текущего пользователя в элементе
  let student = element.students.find(item => item._id.equals(userId));

  // Если пользователя нет в списке - добавить его и установить статус
  if (student === undefined) {
    element.students.push({ _id: new mongoose.Types.ObjectId(userId), s: status })
  }
  // Если пользователь уже есть в списке - установить статус
  else {
    // Если существующий статус не выше устанавливаемого
    // Или если неверный ответ исправляется на вновь отправленный
    if (student.s < status || (student.s === 4 && status === 3)) {
      student.s = status
    }
  }
}

/**
 * Получение определённого курса.
 * Задача - отправить курс, отфильтровав его секции и вложения 
 * индивидуально для каждого пользователя
 */
app.get("/api/courses/get/:courseId", (req, res) => {
  CourseModel.aggregate([
    {
      // Выбрать только курс с указанным _id
      $match: {
        _id: mongoose.Types.ObjectId(req.params.courseId)
      }
    },
    {
      $lookup: {
        from: 'disciplines',
        localField: 'discipline',
        foreignField: '_id',
        as: 'discipline'
      }
    },
    {
      $lookup: {
        from: 'levels',
        localField: 'level',
        foreignField: '_id',
        as: 'level'
      }
    },
    {
      $unwind: "$level"
    },
    {
      $unwind: "$discipline"
    }
  ]).exec((err, courses) => {
    // Аггрегация возвращает массив с одним элементом.
    // Получить нужный курс, выбрав первый элемент массива
    let course = courses[0];
    if (!err && course) {
      // Отфильтровать секции курса
      if (req.user && req.user.role === 2) {
        res.send(course)
      } else {
        checkRequirments(course, req.user).then(() => {
          res.send(course)
        })
      }
    } else res.status(404).send("Курс не найден")
  })

  // res.send("123")
})

/**
 * Установить статус для вложения
 * @param {Number} status id статуса, который будет установлен
 */
function changeUserStatusInCourseContent(req, res) {
  let status = req.body.status;
  CourseModel.findOne({ "sections.content._id": req.params.contentId }, (err, course) => {
    if (!err && course !== null) {
      // Найти указанное вложение
      let parentSection;
      new Promise(resolve => {
        course.sections.forEach(section => {
          let content = section.content.find(item => item._id.equals(req.params.contentId));
          if (content !== undefined) {
            parentSection = section;
            resolve(content)
          }
        })
      }).then(content => {
        // Проверить требования
        checkElementRequirments(content, parentSection, req.user, "content").then(reqResult => {
          if (reqResult) {
            addStudent(content, req.user._id, status)

            // Сохранить ресурс
            course.save(err => {
              if (!err) res.redirect(`/api/courses/get/${course._id}`)
              else {
                console.log(err)
                res.status(500).send("Ошибка при сохранении");
              }
            })
          } else res.status(500).send("Не выполнены все условия")
        })
      })
    }
    else res.status(404).send("Курс не найден")
  })
}

app.post("/api/courses/contents/:contentId/status", mustAuthenticated, (req, res) => {
  changeUserStatusInCourseContent(req, res)
})

function updateUserStatusInCourseSection(req, res) {
  CourseModel.findOne({ "sections._id": req.params.sectionId }, (err, course) => {
    if (!err && course !== null) {
      let statuses = [];
      let section = course.sections.find(item => item._id.equals(req.params.sectionId))
      if (section !== undefined) {
        section.content.forEach(content => {
          let student = content.students.find(item => item._id.equals(req.user._id))

          if (student !== undefined) {
            if (student.s === targetStatuses[content.type])
              statuses.push({ name: content.name, value: true, status: student.s })
            else
              statuses.push({ name: content.name, value: false, status: student.s })
          } else {
            statuses.push({ name: content.name, value: false, status: 0 })
          }
        })

        let info = "";
        let statusesValues = statuses.map(item => item.value);

        if (statusesValues.indexOf(false) === -1) {
          info = "Секция завершена"
          addStudent(section, req.user._id, targetStatuses["sections"])
        } else {
          info = "Секция не завершена"
          let max = Math.max.apply(Math, statusesValues);
          addStudent(section, req.user._id, max)
        }

        course.save(err => {
          if (!err) {
            console.log("Раздел открыт")
            res.send(course)
          }
          else res.status(500).send("Ошибка при сохранении")
        })

      } else res.status(404).send("Раздел не найден")
    } else res.status(404).send("Курс не найден")
  });
}

app.post("/api/courses/sections/:sectionId/update", mustAuthenticated, (req, res) => {
  console.log("Получен запрос на разблокирование раздела")
  updateUserStatusInCourseSection(req, res)
})

/** /uploads/courses/<ID курса>/answers/<ID вложения>/<ID пользователя><Расширение файла> */
let AnswerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dir = `${path.dirname(require.main.filename)}/uploads/courses/${req.courseId}/answers/${req.params.contentId}`;

    mkdirp(dir).then(made => {
      cb(null, dir)
    })
  },
  filename: function (req, file, cb) {
    let id = `${req.user._id.toString()}${path.extname(file.originalname)}`;
    cb(null, id)
  }
})
let uploadAnswer = multer({ storage: AnswerStorage }).single('answer')
app.post("/api/courses/contents/:contentId/answer", mustAuthenticated, (req, res) => {
  CourseModel.findOne({ "sections.content._id": req.params.contentId }, (err, course) => {
    if (!err && course !== null) {
      req.courseId = course._id
      new Promise((resolve, reject) => {
        course.sections.forEach(section => {
          let content = section.content.find(content_ => { return content_._id.equals(req.params.contentId) })
          if (content !== undefined) {
            return resolve({ section, content })
          }
        });
        return reject("content undefined");
      }).then(({ section, content }) => {
        new Promise((resolve, reject) => {
          let contentStudent = content.students.find(student => student._id.equals(req.user._id))
          let res = { contentStudent, content }
          if (contentStudent !== undefined) {
            if (contentStudent.a.p) {
              if (contentStudent.s === 4) {
                return resolve(res)
              }
              else return reject("Ответ уже отправлен");
            } else {
              return resolve(res);
            }
          }
        }).then(({ contentStudent, content }) => {
          uploadAnswer(req, res, (err) => {
            if (!err) {
              let dir = path.dirname(require.main.filename);
              let filepath = req.file.path;
              filepath = filepath.replace(dir, '')
              contentStudent.a.p = filepath;
              req.body = {
                status: 3
              }
              course.save(err => {
                if (!err) changeUserStatusInCourseContent(req, res)
                else res.status(500).send("Ошибка при сохранении")
              });
              
            } else {
              console.log(err)
              res.status(500).send("Ошибка при загрузке файла")
            }
          })
        }).catch(err => {
          console.log(err)
          res.status(500).send(err)
        })
      }).catch(err => {
        console.log(err)
        res.status(500).send(err)
      })


    } else {
      console.log(err)
    }
  })
})

app.get("/api/uploads/courses/:courseId/answers/:contentId/:filename", mustAuthenticated, (req, res) => {

})
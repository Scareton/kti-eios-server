const app = require('../../index').app;
const mustAuthenticated = require('../../index').mustAuthenticated;
const mongoose = require("mongoose");

let multer = require('multer')
let path = require('path')
let mkdirp = require('mkdirp');

const CourseModel = require('../models/course-model')
const UserModel = require('../models/user-model')
const CategoryModel = require("../models/category-model")
const LevelModel = require("../models/level-model")
const FacultyModel = require("../models/faculty-model")
const InstituteModel = require("../models/institute-model")
const DisciplineModel = require("../models/discipline-model")
const GroupModel = require("../models/group-model")

let targetStatuses = {
  "sections": 6,
  1: 1,
  2: 5
}


/** Получить курсы */
app.get("/api/courses", mustAuthenticated, (req, res) => {
  let match;
  if (req.user.role === 1) {
    match = { groups: req.user.student.group }
  }
  else if (req.user.role === 2) {
    match = { _id: { $in: req.user.teacher.courses } }
  }
  else {
    res.status(500).send("Неопознанная роль")
  }
  CourseModel.aggregate([
    {
      $match: match
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
    if (!err && courses[0]) {
      if (req.user.role === 1) {
        checkCourseArrayRequirments(courses, req.user).then(() => {
          res.send(courses)
        })
      } else if (req.user.role === 2) {
        res.send(courses)
      }

    } else {
      console.log(err)
      res.status(500).send("Ошибка при получении группы")
    }
  })
})

/** Получить данные об академических группах */
app.get("/api/groups", mustAuthenticated, (req, res) => {
  let ids;

  // Получить группу студента
  if (req.user.role === 1) {
    ids = [req.user.student.group]
  }

  // Получить группы для преподавателя
  else if (req.user.role === 2) {
    if (typeof req.query.id == 'string') {
      ids = [req.query.id];
    } else ids = req.query.id;
    ids = ids.map(g => mongoose.Types.ObjectId(g))
  }

  // Если статус неизвестен
  else res.status(500).send("Неверная роль")

  // Запрос в базу
  GroupModel.aggregate([
    {
      $match: {
        _id: { $in: ids }
      }
    }
  ]).exec((err, groups) => {
    if (!err && groups[0]) {
      res.send(groups)
    } else res.status(500).send("Ошибка при получении академических групп")
  })
})

/** Получить студентов группы */
app.get("/api/groups/:groupId/members", mustAuthenticated, (req, res) => {
  let groupId = req.params.groupId;
  UserModel.find({ "student.group": mongoose.Types.ObjectId(groupId) }, { _id: 1, name: 1, surname: 1, patronymic: 1 }, (err, users) => {
    if (!err) res.send(users)
    else res.status(500).send("Ошибка при получении информации о студентах")
  })
})

/** Проверить требования для получения секции или вложения */
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
  if (element.deadline) preview.deadline = element.deadline;
  return preview;
}

async function checkRequirments(course, user) {
  await Promise.all(course.sections.map(async (section, sectionIndex) => {
    await checkElementRequirments(section, course, user, "sections")
      .then(async (sectionResult) => {
        await Promise.all(section.content.map(async (content, contentIndex) => {
          if (!sectionResult) {
            section.content[contentIndex] = createPreviewForBlockedElement(content)
          } else
            await checkElementRequirments(content, section, user, "content")
              .then(contentResult => {
                if (!contentResult) section.content[contentIndex] = createPreviewForBlockedElement(content)
              })
        }))
      });
  }));
}

async function checkCourseArrayRequirments(courses, user) {
  await Promise.all(courses.map(async course => {
    await checkRequirments(course, user).then(async () => { })
  }))
}

function addStudent(element, userId, status, rate) {
  // Найти текущего пользователя в элементе
  let student = element.students.find(item => item._id.equals(userId));

  // Если пользователя нет в списке - добавить его и установить статус
  if (student === undefined) {
    element.students.push({ _id: new mongoose.Types.ObjectId(userId), s: status })
  }
  // Если пользователь уже есть в списке - установить статус
  else {
    // Если указана оценка - значит изменения вносит преподаватель. 
    // Применить изменения в любом случае
    if (rate !== undefined) {
      student.s = status;
      student.a.s = rate;
    } 
    // Если существующий статус не выше устанавливаемого
    // Или если неверный ответ исправляется на вновь отправленный
    else if (student.s < status || (student.s === 4 && status === 3)) {
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
})

/**
 * Установить статус для вложения
 * @param {Number} status id статуса, который будет установлен
 */
function changeUserStatusInCourseContent(req, res) {
  let status = req.body.status;
  let user;
  let rate = req.body.rate;

  new Promise((resolve, reject) => {
    if (req.user.role === 1) resolve(req.user)
    else {
      UserModel.findOne({ _id: req.body.user }, (err, dbuser) => {
        if (!err && dbuser !== null) {
          if (status === 5 && !rate) reject("Работа оценена, но не был указан рейтинг")
          resolve(dbuser)
        }
        else reject("Студент не найден")
      })
    }
  }).then(response => {
    user = response;
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
          checkElementRequirments(content, parentSection, user, "content").then(reqResult => {
            if (reqResult) {
              addStudent(content, user._id, status, rate)

              // Сохранить ресурс
              course.save(err => {
                if (!err) res.redirect(`/api/courses/get/${course._id}`)
                else {
                  console.log(err)
                  res.status(500).send(course);
                }
              })
            } else res.status(500).send("Не выполнены все условия")
          })
        })
      }
      else res.status(404).send("Курс не найден")
    })
  }).catch(err => {
    res.status(404).send(err)
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
          else {
            console.log(err)
            res.status(500).send("Ошибка при сохранении")
          }
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
  res.sendFile(`${path.dirname(require.main.filename)}/uploads/courses/${req.params.courseId}/answers/${req.params.contentId}/${req.params.filename}`)
})
import express from 'express';
const app = express();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const port = 3102;

import cors from 'cors';
app.use(cors());
app.use(express.json());


app.get('/users', async (req, res) => {
  try {
    let db_response = await prisma.user.findMany();
    res.json(db_response);
  } catch (error) {
    res.sendStatus(500);
  }
})

// user object mit vorname, nachname, birth, type
app.post('/user', async (req, res) => {
  let data = req.body;
  try {
    let db_response = await prisma.user.create({
      data: data
    });
    res.json(db_response);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
})

// -> user object mit id und was man updaten möchte
app.put('/user', async (req, res) => {
  let data = req.body;
  try {
    let db_response = await prisma.user.update({
      where: {
        id: data.id
      },
      data: data
    });
    res.json(db_response);
  } catch (error) {
    res.sendStatus(500);
  }
})

// -> nur id
app.delete('/user', async (req, res) => {
  let data = req.body;
  try {
    let db_response = await prisma.user.update({
      where: {
        id: data
      }
    });
    res.json(db_response);
  } catch (error) {
    res.sendStatus(500);
  }
})

app.post('/attendance/:qrcodeid', async (req, res) => {
  const id = req.params.qrcodeid;

  let today = new Date();
  today.setHours(0, 0, 0, 0)
  let tmrw = new Date()
  tmrw.setDate(tmrw.getDate() + 1);
  tmrw.setHours(0, 0, 0, 0)

  let old_attendances = await prisma.attendance.findMany({
    where: {
      AND: [
        {
          time: {
            gte: today
          }
        },
        {
          time: {
            lt: tmrw
          }
        },
        {
          user_id: id
        }
      ]
    }
  })

  if (old_attendances.length != 0) {
    return res.json({"error": "user already has attendance for today"})
  }

  let db_response;
  try {
    db_response = await prisma.attendance.create({
      data: {
        user_id: id
      }
    })
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
  res.json(db_response);
})

app.get('/attendance', async (req, res) => { //dayformat: yyyy-mm-dd
  const day = req.query.day;
  const onlyPresentUsers = req.query.onlyPresentUsers;
  const displayTrainers = req.query.displayTrainers;

  let today = new Date(day);
  today.setHours(0, 0, 0, 0);
  let tmrw = new Date(today);
  tmrw.setDate(tmrw.getDate() + 1);
  tmrw.setHours(0, 0, 0, 0);
  console.log(today, tmrw);
  let all_users = await prisma.user.findMany();

  let attendances;
  try {
    attendances = await prisma.attendance.findMany({
      where: {
        AND: [
          {
            time: {
              gte: today
            }
          },
          {
            time: {
              lt: tmrw
            }
          }
        ]
      }
    })
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }

  let data = [];

  attendances.forEach((attendance) => {
    let user = all_users.find((user) => user.id == attendance.id);
    attendance.time.setSeconds(0, 0);

    let object = {
      "id" : user.id,
      "first_name" : user.first_name,
      "last_name" : user.last_name,
      "age" : ageFromBirth(new Date(user.birth)),
      "present" : true,
      "time" : attendance.time
    }

    if (user.type == "trainer") {
      if (displayTrainers == 1) {
        data.push(object);
      }
    } else {
      data.push(object);
    }

    let index = all_users.indexOf(user);
    if (index > -1) {
      all_users.splice(index, 1);
    }
  })

  if (onlyPresentUsers == 0) {
    all_users.forEach((user) => {
      let object = {
        "id" : user.id,
        "first_name" : user.first_name,
        "last_name" : user.last_name,
        "age" : ageFromBirth(new Date(user.birth)),
        "present" : false
      }
      data.push(object);
    })
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
})

function ageFromBirth(birth) {
  let ageDifMs = Date.now() - birth.getTime();
  let ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getFullYear() - 1970);
}




app.listen(port, () => {
  console.log(`Running on port ${port}`);
})
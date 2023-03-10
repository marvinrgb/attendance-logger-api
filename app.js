import express from 'express';
const app = express();
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import dotenv from 'dotenv';
dotenv.config();
const port = process.env.PORT;
import { logTable } from './logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import xl from 'excel4node';
import fetch from 'node-fetch';
import jwt from 'express-jwt';
import { expressJwtSecret } from 'jwks-rsa';
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

import cors from 'cors';
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// app.use(logTable);


function checkAuth(req) {
  if(!req.user) {
    return false
  }
  return true
}

let jwksUrl = "";

let jwtConfig;

try {
  let oidResponse = await fetch(`https://oauth.id.jumpcloud.com/.well-known/openid-configuration`)
  let oidBody = await oidResponse.json();
      jwksUrl = oidBody.jwks_uri;
      console.log("Received OIDC config");
      jwtConfig = {
          algorithms: ["RS256"],
          secret: expressJwtSecret({
              jwksUri: jwksUrl
          }),
          // issuer: 'http://localhost:8082/auth/realms/OIDC-Demo'
      };
} catch (error) {
  console.error(error);
  process.exit();
}


app.get('/users', async (req, res) => {
  try {
    let db_response = await prisma.user.findMany();
    db_response.sort(compare)
    res.json(db_response);
  } catch (error) {
    res.sendStatus(500);
  }
})

// user object mit vorname, nachname, birth, type
app.post('/user', async (req, res) => {
  let data = req.body;
  console.log(data)
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
app.delete('/user/:id', async (req, res) => {
  let data = req.params.id;
  try {
    let db_response = await prisma.user.delete({
      where: {
        id: data
      }
    });
    res.json(db_response);
  } catch (error) {
    res.status(500).send(error);
  }
})




app.delete('/attendance', async (req, res) => {
  let today = new Date();
  today.setHours(0, 0, 0, 0)
  let tmrw = new Date()
  tmrw.setDate(tmrw.getDate() + 1);
  tmrw.setHours(0, 0, 0, 0)
  await prisma.attendance.deleteMany({
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
})

app.post('/attendance/:qrcodeid', async (req, res) => {
  const id = req.params.qrcodeid;

  let today = new Date();
  today.setHours(0, 0, 0, 0)
  let tmrw = new Date()
  tmrw.setDate(tmrw.getDate() + 1);
  tmrw.setHours(0, 0, 0, 0)
  let old_attendances;
  try {
    old_attendances = await prisma.attendance.findMany({
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
  } catch (error) {
    res.status(500).json({"error": "Database Reading Error"})
  }

  if (old_attendances.length != 0) {
    return res.status(406).json({"error": "user already has attendance for today"})
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
    res.status(500).json({"error" : "Database writing error"});
  }

  let user = await prisma.user.findFirst({
    where: {
      id: id
    }
  })

  let data = {
    'attendance': db_response,
    'user': user
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
})

app.get('/attendance', async (req, res) => { //dayformat: yyyy-mm-dd
  // console.table(req.query)
  const day = req.query.day;
  const onlyPresentUsers = req.query.onlyPresentUsers;
  const displayTrainers = req.query.displayTrainers;

  let today = new Date(Date.parse(day));
  let tmrw = new Date(today);
  tmrw.setDate(tmrw.getDate() + 1);
  // console.log(today, tmrw);
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
    res.status(500).json({"error": "Database reading error"});
  }
  // console.log(attendances)

  let data = [];

  attendances.forEach((attendance) => {
    let user = all_users.find((user) => user.id == attendance.user_id);
    attendance.time.setSeconds(0, 0);
    // console.log(user)
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

      if (user.type == "trainer") {
        if (displayTrainers == 1) {
          data.push(object);
        }
      } else {
        data.push(object);
      }
    })
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data);
})

app.get('/attendance_new', async (req, res) => {
  const day_start = new Date(Date.parse(req.query.day_start));
  const day_end = new Date(Date.parse(req.query.day_end));

  let amount_days = datediff(day_start, day_end) + 1;
  
  let bigdata = [];
  for (let i = 0; i < amount_days; i++) {
    let today = new Date(Date.parse(day_start));
    today.setDate(today.getDate() + i);
    bigdata.push(await attendancesFromDate(today));
  }
  
  let bigdata_sorted = sortBigData(bigdata);

  let data_new = [];
  


  bigdata_sorted.forEach((value) => {

    let columns = {
      "first_name" : value.first_name,
      "last_name" : value.last_name
    }

    for (const dateval in value.dates) {
      columns[dateval] = value.dates[dateval];
    }

    data_new.push({
      "start_date" : value.date,
      "amount_days" : Object.keys(value.dates).length,
      "columns" : columns
    })
  })

  let cols = data_new[0].columns
  let summed_attendance = {};
  for (const key in cols) {
    let amount_at;
    if (key == 'first_name' || key == 'last_name') {
      summed_attendance[key] = ""
    } else {
      amount_at = data_new.filter((val) => val.columns[key] == 'x')
      summed_attendance[key] = amount_at.length
    }
  }
  
  for (let i = 0; i < data_new.length; i++) {
    data_new[i].sum = summed_attendance;
  }
  

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(data_new);
})



function ageFromBirth(birth) {
  let ageDifMs = Date.now() - birth.getTime();
  let ageDate = new Date(ageDifMs);
  return Math.abs(ageDate.getFullYear() - 1970);
}

async function attendancesFromDate(date) { //date as yyyy-mm-dd
  let day = date;
  let today = new Date(Date.parse(day));
  let tmrw = new Date(today);
  tmrw.setDate(tmrw.getDate() + 1);
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
    res.status(500).json({"error": "Database reading error"});
    return;
  }

  let data = [];

  if (!attendances) {
    res.json({"error" : "No attendances"});
    return;
  }

  attendances.forEach((attendance) => {
    try {
      let user = all_users.find((user) => user.id == attendance.user_id);
      attendance.time.setSeconds(0, 0);
      // console.log(user)
      let object = {
        "id" : user.id,
        "first_name" : user.first_name,
        "last_name" : user.last_name,
        "present" : "x",
        "date" : today
      }
  
      data.push(object)
  
      let index = all_users.indexOf(user);
      if (index > -1) {
        all_users.splice(index, 1);
      }
    } catch (error) {
      console.log('[warn] user for attendance deleted')
    }
  })

  all_users.forEach((user) => {
    let object = {
      "id" : user.id,
      "first_name" : user.first_name,
      "last_name" : user.last_name,
      "present" : "-",
      "date" : today
    }

    data.push(object);
  })
  return data;
}

function datediff(first, second) {        
  return Math.round((second - first) / (1000 * 60 * 60 * 24));
}

function sortBigData(bigdata) {
  let neu_data = [];
  for (let i = 0; i < bigdata.length; i++) {
    for (let i2 = 0; i2 < bigdata[i].length; i2++) {
      let element = bigdata[i][i2];
      if (!(neu_data.includes(neu_data.find((value) => value.id == element.id)))) {
        element.dates = {};
        element.dates[element.date.toISOString()] = element.present;
        delete element.present;
        neu_data.push(element);
      } else {
        let index = neu_data.indexOf(neu_data.find((value) => value.id == element.id));
        neu_data[index].dates[element.date.toISOString()] = element.present;
        delete neu_data[index].present;
      }
    }
    // console.log(neu_data)
  }
  neu_data.sort(compare)
  return neu_data;
}

function compare(a, b) {
  if ( a.last_name > b.last_name ) {
    return 1;
  }
  if ( a.last_name < b.last_name ) {
    return -1;
  }
  return 0;
}

app.get('/excel', async (req, res) => {
  const day_start = new Date(Date.parse(req.query.day_start));
  const day_end = new Date(Date.parse(req.query.day_end));

  let amount_days = datediff(day_start, day_end) + 1;
  
  let bigdata = [];
  for (let i = 0; i < amount_days; i++) {
    let today = new Date(Date.parse(day_start));
    today.setDate(today.getDate() + i);
    bigdata.push(await attendancesFromDate(today));
  }
  
  let bigdata_sorted = sortBigData(bigdata);

  let wb = new xl.Workbook;
  let ws = wb.addWorksheet('sheet');
  let style = wb.createStyle({
    font: {
      color: '#222222',
      size: 12
    },
    border: {
      right: {
        style: 'thin',
        color: '#111111'
      },
      left: {
        style: 'thin',
        color: '#111111'
      }
    },
    numberFormat: '$#,##0.00; ($#,##0.00); -',
  })
  let header_style = wb.createStyle({
    font: {
      color: '#222222',
      size: 12,
      bold: true
    },
    border: {
      right: {
        style: 'thin',
        color: '#111111'
      },
      left: {
        style: 'thin',
        color: '#111111'
      },
      bottom: {
        style: 'medium',
        color: '#111111'
      }
    }
  })
  
  ws.column(1).setWidth(18)
  ws.column(2).setWidth(18)
  ws.column(3).setWidth(12)

  //Writing of Excel Header Line
  ws.cell(1, 1)
  .string("Vorname")
  .style(header_style);

  ws.cell(1, 2)
  .string("Nachname")
  .style(header_style);

  let header_iter = 0;
  for (const cur_datestring in bigdata_sorted[0].dates) {
    let cur_date = new Date(Date.parse(cur_datestring));
    ws.cell(1, header_iter + 3)
    .string(`${cur_date.getDate()}.${cur_date.getMonth() + 1}.${cur_date.getFullYear()}`)
    .style(header_style);
    header_iter++;
  }


  
  //Writing of Excel Table
  for (let i = 0; i < bigdata_sorted.length; i++) {
    let i2 = 1;
    for (const prop in bigdata_sorted[i]) {
      if (prop == 'id') continue
      if (prop == 'date') continue
      if (prop != 'dates') {
        ws.cell(i+2, i2)
        .string(String(bigdata_sorted[i][prop]))
        .style(style);
      } else {
        let i3 = 0;
        for (const date in bigdata_sorted[i]['dates']) {
          ws.cell(i+2, i2 + i3)
          .string(String(bigdata_sorted[i]['dates'][date]))
          .style(style);
          i3++;
        }
      }
      i2++;
    }
  }

  wb.write('excel.xlsx', res)
})

function l(x) {
  console.log(x)
}

app.listen(port, () => {
  console.log(`Running on port ${port}`);
})
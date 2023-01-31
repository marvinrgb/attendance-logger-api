import express from 'express'
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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

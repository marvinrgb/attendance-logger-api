import {faker} from '@faker-js/faker';
import fetch from 'node-fetch';
const amount = 5;
for (let i = 0; i < amount; i++) {
  let date = faker.date.past(30);
  let user = {
    "first_name" : faker.name.firstName(),
    "last_name" : faker.name.lastName(),
    "birth" : faker.date.past(30),
    "type" : "trainer"
  }
  await fetch('http://localhost:3102/user', {
    method: 'POST',
    headers: {
      'Content-Type' : 'application/json'
    },
    body: JSON.stringify(user)
  })
}
const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require( "puppeteer");
const express = require('express');
const app = express();
const exphbs = require("express-handlebars");
const path = require('path');
const fs = require('fs');
const config = require('./config.js')
const bot = new TelegramBot(config.TOKEN, {polling: true, cancellation: true});


app.use(express.static(path.join(__dirname, "public")))
app.engine('handlebars', exphbs({defaultLayout: 'main'}))
app.set('view engine', 'handlebars');
app.get('/', (req, res) => { 
  res.render("face")
});
 
const port = process.env.PORT || 5000;
app.listen(port, () => { console.log(`server listening on ${port}`); })


// const User = mongoose.model('badgeUsers');
//logic
// bot.sendPhoto(adminId, fs.readFileSync(`${__dirname}\\public\\img\\readyToSend\\badge_280212307.png`),
//           {caption: `This photo from "msg.from.first_name". Wait the Call`})
// bot.on("message", msg=> {
//   console.log(msg);
// })
bot.onText(/\/start/, (msg) => { 
  const text = `Привет ${msg.from.first_name} 👋! \nЧтобы начать делать Вам бейджик кликните сюда /make`
  msgMaker(msg, text)
});
//help making
bot.onText(/\/help/, (msg) => {
  const helpText = `${msg.from.first_name} ✌️, мы всегда рады помочь или поговорить 😉 \n📱 @AzatBadukshin\n☎️ +998907317034`;
  msgMaker(msg, helpText); 
});


// BADGE MAKING 
bot.onText(/\/make/,async function(msg) {
  
  new Promise((resolve) => {
    const chatId = msg.chat.id;
    const example = fs.readFileSync(path.join(__dirname, "public", "img", "example.png"));
    const captionText = 'Вот как будет выглаядеть итоговый результат.';
    msgMaker(msg, "Секунду...");
    bot.sendPhoto(chatId, example, {caption: captionText});
    setTimeout(() => resolve(), 4500);
  })
  .then(async function (){
    
    const resultText = `Чтобы получить свой бейджик <b>нажмите сюда</b> /ready`;
    let fatal = {}
    let random = Math.floor(Math.random()*1000);
    fatal.readyFaculty = await getFaculty(msg);
    fatal.readyName = await getName(msg);
    fatal.readyGroup = await getGroup(msg);
    fatal.readyPhoto = await getPhoto(msg);
    console.log(fatal, "\n", random);
    app.get(`/${msg.chat.id + random}`, (req, res) => { 
      res.render("index", {
        surname:fatal.readyName[0],
        name:fatal.readyName[1],
        group:fatal.readyGroup,
        faculty: fatal.readyFaculty,
        img: msg.chat.id ,
      })
    });
    await imgRender(msg.chat.id, random);
    msgMaker(msg, resultText);
    
  });
  
});

bot.onText(/\/ready/, ((msg) => {
    const resultCaption = `Ваш бейджик готов!\nХотите чтобы мы распечатали его?`;
    const yesText = `🖨 Да, отправить бейджик на принтер!`;
    const noText = `👋 Нет, спасибо`;
    const chatId = msg.chat.id;
    bot.sendPhoto(chatId, 
      fs.readFileSync(path.join(__dirname, 'public' , 'img', 'readyToSend', `badge_${chatId}.png`)),
      //`${__dirname}\\public\\img\\readyToSend\\badge_${chatId}.png`
    {caption: resultCaption,  reply_markup: {
      keyboard: [[yesText], [noText]],
      resize_keyboard:true, one_time_keyboard: true}});
    sendToPrinter()

}));
const facultyKeyboard = {
  reply_markup:
    {
      keyboard:
        [['🟦 ЭМФ', "🟩 ГД", "⬜️ ХМФ"],['/make', '/help']],
        resize_keyboard: true, one_time_keyboard: true
    }
}
async function getFaculty(msg) {
  let getFacultyPromise = new Promise(resolve => {
    // if (msg.text == '/make') return;
    const getFacultyText = `Выберите на каком факультете Вы обучаетесь`;
    const successText = `ОК! мы записали Ваш Факультет`;
    let isDone = false;
    let faculty = '';
    bot.sendMessage(msg.chat.id, getFacultyText, facultyKeyboard);
    bot.on('message', (msg)=> {
      if (msg.text == '/make') {
        isDone = true; return; 
      } else if (isDone){return}
       else {
        if (msg.text == '🟦 ЭМФ'){ faculty = 'blue';}
        else if (msg.text == '🟩 ГД'){faculty = 'green'}
        else{ faculty = 'white' }
        console.log(faculty);
        msgMaker(msg, successText)
        isDone = true;
        resolve(faculty) ;
      }
    })
  })
  return await getFacultyPromise;
}
//GET NAME AND SURNAME
async function getName(msg) {
  let getNamePromise = new Promise (resolve => {
    // if (msg.text == '/make') return;
    const getNameText = `Введите своё имя и фамилию. \n<b>Masalan:</b> Badukshin Azat`;
    const getNameErr = 'Вы ввели имя и фамилию не правильно.\nПопробуйте еще раз';
    const successText = 'ОК! Мы записали Ваше имя';
    let isDone = false; // to break the loop of bot.on('message')
    msgMaker(msg, getNameText);
    bot.on('message', msg => {
      if (isDone || msg.text == '/make') return;
      let nameArray = msg.text.split(' ')
      if (nameArray.length < 2 || nameArray.includes('') || nameArray[0].length < 2) {
        msgMaker(msg, getNameErr)
      } else {
        msgMaker(msg, successText)
        console.log(nameArray);
        isDone = true;
        resolve(nameArray)
      }
    });
  })
  return await getNamePromise;
}
// GET GROUP
async function getGroup(msg) {
  let getGroupPromise = new Promise(resolve => {
    // if (msg.text == '/make') return;
    let group = ''
    const getgroupText = `Введите называние Вашей группы. \n<b>Masalan:</b> 7a - 20 TMO`;
    const successText = 'ОК! Мы записали Вашу группу';
    // to break the loop of bot.on('message')
    msgMaker(msg, getgroupText);
    bot.on('message', msg => {
      if (group != '' ||msg.text == '/make') return;
      group = msg.text;
      msgMaker(msg, successText)
      console.log(group);
      resolve(group)
    });
  })
  return await getGroupPromise;
}
//GET PHOTO 
async function getPhoto(msg) {
  // if (msg.text == '/make') return;
  chatId = msg.chat.id
  let getPhotoPromise = new Promise(resolve=> {
    const getPhotoText = `Отправьте свою фотографию.\nЖелательно в формате 3х4`
    const successText = `OK! Мы сохранили Вашу фотографию`
    msgMaker(msg, getPhotoText); 
    let isDone = false;
    bot.on('photo', async function (msg) {
      if (isDone) return;
      const photoId = msg.photo[0].file_id;
      await bot.downloadFile(photoId, path.join(__dirname, 'public', 'img'))
      const format = await bot.getFile(photoId)
      fs.rename(
        path.join(__dirname, 'public', 'img', `${format.file_path.split('/')[1]}`),
        path.join(__dirname, 'public', 'img', 'done', `badge_${msg.chat.id}.jpg`),
        function(err) {
          console.log(`badge_${msg.chat.id}.jpg is done`);
          if ( err ) console.log('ERROR: ' + err);
      });
      msgMaker(msg, successText);
      isDone = true;
      resolve(true)
    })
  })
  return await getPhotoPromise;
}
//PRINT QUERY
async function sendToPrinter() {
  const lastPromise = new Promise( resolve => {
    const makeAgainText = `Чтобы сделать еще один бейджик нажмите сюда /make`;
    const contactText = `Позвоните на номер +998907317034 или свяжитесь с @AzatBadukshin. Ваш бейджик скоро будет готов`;
    let isDone = false;
    bot.on('message', msg => {
      if(isDone) return;
      if (msg.text == `🖨 Да, отправить бейджик на принтер!`) {
        postRusult(msg)
        bot.sendMessage(msg.chat.id, contactText, facultyKeyboard )
      } 
      isDone = true;
      bot.sendMessage(msg.chat.id, makeAgainText, facultyKeyboard)
      resolve(true)
    })
  })
  return await lastPromise;
}
//POST A RESULT 
function postRusult(msg) {
  bot.sendPhoto(config.adminId, 
    fs.readFileSync(path.join(__dirname, 'public' , 'img', 'readyToSend', `badge_${chatId}.png`)),
    //`${__dirname}\\public\\img\\readyToSend\\badge_${msg.chat.id}.png`
    {caption: `This photo from ${msg.from.first_name} @${msg.from.username}. Wait the Call`})
}
//MAKE A FINISH RESULT
//msg MAKER
function msgMaker(msg, inputText) {
  let chatId  = msg.chat.id;    
  bot.sendMessage(chatId, inputText, {parse_mode: 'HTML'})
}

// img render function!!!!!!!!!
async function imgRender(id, random) {
  const browser = await puppeteer.launch({defaultViewport:{width:514,height:720}, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`${config.host}${id+random}`);
  await page.screenshot({
    path: path.join(__dirname,  'public' , 'img', 'readyToSend', `badge_${id}.png`),
    fullPage:true,
    omitBackground: true
  });
  
  await browser.close();
  return true;
};

console.log('bot is in order...'); 
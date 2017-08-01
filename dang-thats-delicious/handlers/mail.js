const nodemailer = require('nodemailer');
const pug = require('pug');
const juice = require('juice'); //inline css for email clients
const htmlToText = require('html-to-text'); //convert html to text format
const promisify = require('es6-promisify');

const transport = nodemailer.createTransport({
  host : process.env.MAIL_HOST,
  port : process.env.MAIL_PORT,
  auth : {
    user : process.env.MAIL_USER,
    pass : process.env.MAIL_PASS
  }
});

const generateHTML = (filename, options = {}) => {
  const html = pug.renderFile(`${__dirname}/../views/email/${filename}.pug`, options); //we donot know where renderfile is executed, propably inside node_modules that's is why we use __dirname = current directory this file is running
  const inlined = juice(html); //inline the html
  return inlined;
};

exports.send = async (options) => {
  const html = generateHTML(options.filename, options);
  const text = htmlToText.fromString(html); 
  const mailOptions = {
    from : `Maxi Pao <noreply@maxipao.com>`,
    to : options.user.email,
    subject : options.subject,
    html,
    text
  }

  const sendMail = promisify(transport.sendMail, transport);
  return sendMail(mailOptions);
};
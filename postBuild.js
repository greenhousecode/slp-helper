const pkg = require('./package.json');
const fs = require('fs');

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() > 8 ? now.getMonth() + 1 : `0${now.getMonth() + 1}`;
const day = now.getDate() > 9 ? now.getDate() : `0${now.getDate()}`;
const comment = `/*! ${pkg.name} v${pkg.version} - ${year}/${month}/${day} */\n`;

fs.readFile('dist/slp.min.js', 'utf-8', (err, file) => {
  if (err) console.log(err);
  fs.writeFileSync('dist/slp.min.js', comment + file, 'utf-8');
});

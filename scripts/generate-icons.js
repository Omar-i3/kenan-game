const fs = require('fs');
const path = require('path');

const iconSrc = path.join(__dirname, '..', 'icon.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const mipmapDirs = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

if (fs.existsSync(iconSrc)) {
  mipmapDirs.forEach(dirName => {
    const targetDir = path.join(resDir, dirName);
    if (fs.existsSync(targetDir)) {
      fs.copyFileSync(iconSrc, path.join(targetDir, 'ic_launcher.png'));
      fs.copyFileSync(iconSrc, path.join(targetDir, 'ic_launcher_round.png'));
      fs.copyFileSync(iconSrc, path.join(targetDir, 'ic_launcher_foreground.png'));
    }
  });
  console.log('App icons updated successfully!');
} else {
  console.error('icon.png not found!');
}

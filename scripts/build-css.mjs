// styles.src.css의 /*FONT*/ 자리에 Gaegu 서브셋(woff2)을 base64로 넣어 styles.css를 만든다. (OFL: assets/fonts/OFL-Gaegu.txt)
import { readFileSync, writeFileSync } from 'node:fs';
const b64 = readFileSync('assets/fonts/Gaegu-Regular-subset.woff2').toString('base64');
const face = `@font-face{font-family:"CS Gaegu";font-weight:400 700;font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
const css = readFileSync('styles.src.css', 'utf8').replace('/*FONT*/', '/* Gaegu © 2018 The Gaegu Project Authors, SIL OFL 1.1 — 한글 2350자·영문 서브셋, 무수정 글리프 */\n' + face);
writeFileSync('styles.css', css);
console.log('styles.css', Math.round(css.length / 1024) + 'KB');

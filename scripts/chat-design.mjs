import {themeForActor} from './themes.mjs';
export function registerChatDesign(){
 Hooks.on('preCreateChatMessage',(doc,data)=>{
  const actor=game.actors.get(data.speaker?.actor);
  const theme=themeForActor(actor);
  doc.updateSource({'flags.berserkr-rpg.chatTheme':{bg:theme.bg,panel:theme.panel,accent:theme.accent,ink:theme.ink}});
 });
 Hooks.on('renderChatMessageHTML',(doc,element)=>{
  const theme=doc.getFlag('berserkr-rpg','chatTheme');
  if(!theme)return;
  element.classList.add('berserkr-message');
  for(const key of ['bg','panel','accent','ink'])element.style.setProperty('--theme-'+key,theme[key]);
 });
}

import {BerserkrGenerator,loadCreationCatalog} from './generator.mjs';
let activeGenerator,opening;
export async function openDirectoryGenerator(){
 if(!game.user.can('ACTOR_CREATE'))return ui.notifications.warn('Você não tem permissão para criar personagens.');
 if(activeGenerator?.rendered){activeGenerator.bringToFront();return activeGenerator;}
 if(opening)return opening;
 opening=(async()=>{
  const user=game.user;
  if(user.getFlag('berserkr-rpg','directoryCreationDraft')?.createdUuid)await user.unsetFlag('berserkr-rpg','directoryCreationDraft');
  const source={getFlag:()=>user.getFlag('berserkr-rpg','directoryCreationDraft'),setFlag:(_scope,_key,draft)=>user.setFlag('berserkr-rpg','directoryCreationDraft',draft)};
  const generator=new BerserkrGenerator(source,await loadCreationCatalog());generator.fromDirectory=true;
  activeGenerator=generator;await generator.render({force:true});return generator;
 })();
 try{return await opening;}catch(error){console.error(error);ui.notifications.error(error.message);}finally{opening=null;}
}
export function addDirectoryGeneratorButton(app,html){
 const root=html?.querySelector?html:html?.[0]??app.element;
 if(!root?.querySelector)return;
 const existing=root.querySelector('[data-berserkr-directory-generator]');
 if(!game.user.can('ACTOR_CREATE')){existing?.remove();return;}
 if(existing)return;
 const button=document.createElement('button');button.type='button';button.className='berserkr-directory-generator';button.dataset.berserkrDirectoryGenerator='true';button.textContent='Gerar personagem';button.title='Criação guiada de personagem — Berserkr';
 button.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();button.disabled=true;try{await openDirectoryGenerator();}finally{button.disabled=false;}});
 const header=root.querySelector('.directory-header')??root.querySelector('.header-actions')??root.querySelector('header');
 if(header)header.append(button);else root.prepend(button);
}
export function registerDirectoryGenerator(){Hooks.on('renderActorDirectory',addDirectoryGeneratorButton);}

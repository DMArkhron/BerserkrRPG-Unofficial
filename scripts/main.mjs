import './pause-logo.mjs';
import './cover-scene.mjs';
import './token-art.mjs';
import {registerChatDesign} from './chat-design.mjs';
import {registerRagnarokTracker} from './ragnarok-tracker.mjs';
import {registerDirectoryGenerator} from './actor-directory.mjs';
import {registerAutomationHooks} from './automation.mjs';
import {CONDITIONS} from './rules.mjs';
import {BerserkrActorData,BerserkrItemData} from "./models.mjs";
import {BerserkrActor,BerserkrItem} from "./documents.mjs";
import {BerserkrActorSheet,BerserkrItemSheet} from "./sheets.mjs";
Hooks.once("init",()=>{
  registerRagnarokTracker();
  CONFIG.Actor.documentClass=BerserkrActor;
  CONFIG.Item.documentClass=BerserkrItem;
  CONFIG.Actor.dataModels.character=BerserkrActorData;
  CONFIG.Actor.dataModels.creature=BerserkrActorData;
  for(const type of ["weapon","armor","rune","ability","equipment","class"]) CONFIG.Item.dataModels[type]=BerserkrItemData;
  const sheets=foundry.applications.apps.DocumentSheetConfig;
  sheets.registerSheet(Actor,"berserkr-rpg",BerserkrActorSheet,{types:["character","creature"],makeDefault:true,label:"Berserkr — Ator"});
  sheets.registerSheet(Item,"berserkr-rpg",BerserkrItemSheet,{types:["weapon","armor","rune","ability","equipment","class"],makeDefault:true,label:"Berserkr — Item"});
  for(const [id,name] of Object.entries(CONDITIONS))if(!CONFIG.statusEffects.some(e=>e.id===id))CONFIG.statusEffects.push({id,name,img:'systems/berserkr-rpg/assets/icons-ink/ability.png'});
  CONFIG.Combat.initiative={formula:"1d6 + @attributes.agilidade",decimals:0};
});

registerAutomationHooks();

// Refresh open owned item palettes after the character changes class.
Hooks.on('updateActor',(actor,changes)=>{
 if(!Object.hasOwn(changes.system??{},'className')&&!Object.hasOwn(changes,'system.className'))return;
 for(const item of actor.items)if(item.sheet?.rendered)item.sheet.render({force:true});
});

registerDirectoryGenerator();

registerChatDesign();

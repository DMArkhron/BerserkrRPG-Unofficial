import {ICON_BY_ITEM} from './icon-map.mjs';
import {attack,defense,damageDialog,rest,processTurn,heal} from './automation.mjs';
import {useRune,inscribe,useAbility} from './powers.mjs';
import {CONDITIONS} from './rules.mjs';
import {bindSheetCatalog,filterSheetCatalog} from './sheet-catalog.mjs';
import {SHEET_TABS,normalizeTab,bindSheetTabs} from './sheet-tabs.mjs';
import {CLASS_THEMES,themeForActor,themeForItem,applySheetTheme} from './themes.mjs';
import {ATTRIBUTES, ITEM_TYPES} from "./documents.mjs";
function iconForItem(item){
 const img=item.img??'';
 const generic=img.startsWith('systems/berserkr-rpg/assets/icons-ink/');
 const mapped=ICON_BY_ITEM[item.type+'|'+item.name];
 if(mapped&&(!img||generic||img.startsWith('systems/berserkr-rpg/assets/icons/')))return mapped;
 const legacy=!img||img.startsWith('systems/berserkr-rpg/assets/icons/')||/^systems\/berserkr-rpg\/assets\/art\/[^/]+\.png$/.test(img);
 if(!legacy)return img;
 const theme=themeForItem(item);
 const id=item.type==='class'&&theme.id!=='unbound'?'class-'+theme.id:item.type;
 return `systems/berserkr-rpg/assets/icons-ink/${id}.png`;
}
const {HandlebarsApplicationMixin} = foundry.applications.api;
const {ActorSheetV2,ItemSheetV2} = foundry.applications.sheets;
function shortDescription(text=''){
  text=text.replace(/\s+/g,' ').trim();
  return text.length>180?text.slice(0,180).replace(/\s+\S*$/,'')+'…':text;
}
export class BerserkrActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes:["berserkr","actor-sheet"],tag:"form",window:{resizable:true},position:{width:900,height:740},
    form:{submitOnChange:true,closeOnSubmit:false},
    actions:{automate:this.automate,rollAttribute:this.rollAttribute,createItem:this.createItem,editItem:this.editItem,deleteItem:this.deleteItem,rollDamage:this.rollDamage,spendDestiny:this.spendDestiny,postItem:this.postItem}
  };
  static PARTS = {main:{template:"systems/berserkr-rpg/templates/actor.hbs",scrollable:["",".sb-panels",".sb-overview"]}};
  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    const theme=themeForActor(this.document);
    const inventory=this.document.items.map(i=>({id:i.id,name:i.name,img:iconForItem(i),kind:i.type,canEquip:["weapon","armor"].includes(i.type),typeLabel:ITEM_TYPES[i.type],quantity:i.system.quantity,equipped:i.system.equipped,weapon:i.type==="weapon",armor:i.type==="armor",rune:i.type==="rune",ability:i.type==="ability",isClass:i.type==="class",broken:i.system.broken,uses:i.system.uses,slots:i.system.slots,damage:i.system.damage,description:i.system.description?.slice(0,180),runeMode:i.system.runeMode}));
    const equipment=inventory.filter(i=>!i.rune&&!i.ability&&!i.isClass);
    const abilities=inventory.filter(i=>i.ability||i.isClass);
    const runes=inventory.filter(i=>i.rune);
    for(const item of inventory){const description=this.document.items.find(i=>i.id===item.id)?.system.description??"";item.description=shortDescription(description);item.searchText=item.name+" "+description;}
    for(const item of runes){
      item.modeLabel={both:'Feitiço ou inscrição',spell:'Somente feitiço',inscription:'Somente inscrição',inscribed:'Inscrita em equipamento'}[item.runeMode]??'Feitiço ou inscrição';
      item.canInscribe=!['spell','inscribed'].includes(item.runeMode);
      item.canActivateRune=item.runeMode!=='inscription';
    }
    const activeTab=normalizeTab(this.activeSheetTab);
    const counts={equipment:equipment.length,abilities:abilities.length,runes:runes.length};
    return {...context,actor:this.document,system:this.document.system,
      theme,classChoices:[{name:"Sem classe",value:"",selected:!this.document.system.className},...CLASS_THEMES.map(t=>({name:t.name,value:t.name,selected:t.name===this.document.system.className})),...(!this.document.system.className||CLASS_THEMES.some(t=>t.name===this.document.system.className)?[]:[{name:this.document.system.className,value:this.document.system.className,selected:true}])],
      tabScope:this.id??`berserkr-${this.document.id??'actor'}`,sheetTabs:SHEET_TABS.map(t=>({...t,count:counts[t.id]??null,active:t.id===activeTab})),equipment,abilities,runes,
      weapons:inventory.filter(i=>i.weapon),equippedArmors:inventory.filter(i=>i.armor&&i.equipped),
      portrait:!this.document.img||this.document.img==="icons/svg/mystery-man.svg"?theme.generatorArt:this.document.img,attributes:Object.entries(ATTRIBUTES).map(([key,label])=>({key,label,value:this.document.system.attributes[key]})),
      itemTypes:Object.entries(ITEM_TYPES).map(([key,label])=>({key,label})),
      inventory:this.document.items.map(i=>({id:i.id,name:i.name,img:iconForItem(i),kind:i.type,canEquip:["weapon","armor"].includes(i.type),typeLabel:ITEM_TYPES[i.type],quantity:i.system.quantity,equipped:i.system.equipped,weapon:i.type==="weapon",armor:i.type==="armor",rune:i.type==="rune",ability:i.type==="ability",broken:i.system.broken,uses:i.system.uses})),
      conditions:Object.entries(CONDITIONS).map(([id,label])=>({id,label,active:this.document.statuses.has(id)})),effects:this.document.effects.map(e=>({id:e.id,name:e.name,remaining:e.getFlag('berserkr-rpg','remaining')})),hemorrhage:this.document.getFlag('berserkr-rpg','hemorrhageHours'),isCreature:this.document.type==="creature",capacity:this.document.carryingCapacity,load:this.document.load,overloaded:this.document.load>this.document.carryingCapacity};
  }
  _onRender(context,options){
    super._onRender(context,options);
    applySheetTheme(this.element,context.theme);
    // Local sheet state survives actor updates, without changing the document.
    this.catalogState??={query:"",kind:"all"};
    bindSheetTabs(this.element,{active:this.activeSheetTab,onChange:id=>{this.activeSheetTab=id;filterSheetCatalog(this.element,this.catalogState);}});
    bindSheetCatalog(this.element,{state:this.catalogState});
  }
  static async automate(event,target){
    if(!this.isEditable)return;
    const actor=this.document,item=actor.items.get(target.dataset.itemId),op=target.dataset.operation;
    try{
      if(op==='attack')await attack(actor,item);
      else if(op==='defense')await defense(actor);
      else if(op==='parry')await defense(actor,true);
      else if(op==='damage')await damageDialog(actor);
      else if(op==='short'||op==='long')await rest(actor,op==='long');
      else if(op==='rune')await useRune(actor,item);
      else if(op==='inscribe')await inscribe(actor,item);
      else if(op==='ability')await useAbility(actor,item);
      else if(op==='condition')await actor.toggleStatusEffect(target.dataset.status,{active:!actor.statuses.has(target.dataset.status)});
      else if(op==='effect')await actor.effects.get(target.dataset.effectId)?.delete();
      else if(op==='tick')await processTurn(actor,{manual:true});
      else if(op==='treatment')await actor.unsetFlag('berserkr-rpg','hemorrhageHours');
      else if(op==='equip'){if(item.type==='armor'&&!item.system.equipped)await actor.updateEmbeddedDocuments('Item',actor.items.filter(i=>i.type==='armor'&&i.system.equipped).map(i=>({_id:i.id,'system.equipped':false})));await item.update({'system.equipped':!item.system.equipped});}
      else if(op==='repair')await item.update({'system.broken':false});
      else if(op==='consume'){if(item.system.uses<1)throw new Error('Sem usos disponíveis.');if(item.system.healing){if(!Roll.validate(item.system.healing))throw new Error('Fórmula inválida.');await heal(actor,(await new Roll(item.system.healing).evaluate()).total);}await item.update({'system.uses':item.system.uses-1});}
      else if(op==='combat')await actor.update({'system.combatCounter':actor.system.combatCounter+1,'system.parryUsed':false});
      else if(op==='session')await actor.update({'system.sessionCounter':actor.system.sessionCounter+1});
    }catch(error){console.error(error);ui.notifications.error(error.message);}
  }
  static async rollAttribute(event,target) { await this.document.rollAttribute(target.dataset.attribute); }
  static async createItem(event,target) {
    if (!this.isEditable) return;
    const type=target.dataset.type;
    const [item]=await this.document.createEmbeddedDocuments("Item",[{name:`Nova ${ITEM_TYPES[type]}`,type,img:`systems/berserkr-rpg/assets/icons-ink/${type}.png`}]);
    await item.sheet.render({force:true});
  }
  static async editItem(event,target) { await this.document.items.get(target.dataset.itemId)?.sheet.render({force:true}); }
  static async deleteItem(event,target) {
    if (!this.isEditable) return;
    const item=this.document.items.get(target.dataset.itemId);
    if (!item) return;
    if (await foundry.applications.api.DialogV2.confirm({classes:["berserkr-dialog"],window:{title:"Excluir item"},content:`<p>Excluir ${foundry.utils.escapeHTML(item.name)}?</p>`})) await item.delete();
  }
  static async rollDamage(event,target) { await this.document.items.get(target.dataset.itemId)?.rollDamage(); }
  static async postItem(event,target) {
    const item=this.document.items.get(target.dataset.itemId);
    if(!item) return;
    await postDescription(item);
  }
  static async spendDestiny() {
    if (!this.isEditable) return;
    const current=this.document.system.destinos.value;
    if(current<1) return ui.notifications.warn("Sem Destinos disponíveis.");
    await this.document.update({"system.destinos.value":current-1});
  }
}
export class BerserkrItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {classes:["berserkr","item-sheet"],tag:"form",window:{resizable:true},position:{width:500,height:600},form:{submitOnChange:true,closeOnSubmit:false},actions:{openFeature:this.openFeature,postDescription:this.postDescription}};
  static PARTS = {main:{template:"systems/berserkr-rpg/templates/item.hbs",scrollable:[""]}};
  async _prepareContext(options) {
    const context=await super._prepareContext(options);
    const features=[];
    for(const uuid of this.document.system.featureRefs) {
      const item=await fromUuid(uuid);
      if(item) features.push({uuid,name:item.name});
    }
    return {...context,theme:themeForItem(this.document),item:this.document,system:this.document.system,itemArtwork:iconForItem(this.document),runeModes:{both:"Feitiço ou inscrição",spell:"Somente feitiço",inscription:"Somente inscrição",inscribed:"Inscrita em equipamento"},typeLabel:ITEM_TYPES[this.document.type],weapon:this.document.type==="weapon",armor:this.document.type==="armor",rune:this.document.type==="rune",isClass:this.document.type==="class",attributeOptions:ATTRIBUTES,features,
      classModifiers:Object.entries(ATTRIBUTES).map(([key,label])=>({key,label,value:this.document.system.classModifiers[key]}))};
  }
  _onRender(context,options){
    super._onRender(context,options);
    applySheetTheme(this.element,context.theme);
  }
  static async openFeature(event,target) {
    const item=await fromUuid(target.dataset.uuid);
    if(item) await item.sheet.render({force:true});
  }
  static async postDescription() { await postDescription(this.document); }
}
async function postDescription(item) {
  const esc=foundry.utils.escapeHTML;
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor:item.actor}),content:`<section class="berserkr-chat"><h3>${esc(item.name)}</h3><div style="white-space:pre-wrap">${esc(item.system.description)}</div><p><small>${esc(item.system.source)}</small></p></section>`});
}

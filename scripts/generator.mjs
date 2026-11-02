import {ATTRIBUTES,STARTING,attributeModifier,resourceLimit,validStage} from './rules.mjs';
import {themeForClass} from './themes.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const STEPS=['Classe e habilidade','Atributos','PV e recursos','Equipamentos','Informações pessoais'];
const clone=doc=>{const d=doc.toObject();for(const k of ['_id','folder','_stats','ownership','_key'])delete d[k];return d;};
export async function loadCreationCatalog(){
 const [classes,abilities,equipment,runes,tables]=await Promise.all(['classes','abilities','equipment','runes','tables'].map(async key=>{
  const pack=game.packs.get('berserkr-rpg.'+key);if(!pack)throw new Error(`Compêndio ausente: ${key}`);return pack.getDocuments();
 }));
 const tableItems=name=>tables.find(t=>t.name===name).results.contents.map(r=>{const match=r.text.match(/@UUID\[Compendium\.berserkr-rpg\.equipment\.([\w]+)\]/);return equipment.find(e=>e.id===match?.[1]);}).filter(Boolean);
 return {classes,abilities,equipment,runes,first:tableItems('Primeiro item inicial'),second:tableItems('Segundo item inicial'),weapons:tableItems('Arma inicial')};
}
export class BerserkrGenerator extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={classes:['berserkr','generator'],tag:'form',window:{title:'Criar personagem — Berserkr'},position:{width:900,height:820},form:{closeOnSubmit:false,handler:async()=>{}},actions:{next:this.next,back:this.back,selectClass:this.selectClass,selectSkill:this.selectSkill,randomSkill:this.randomSkill,rollAttribute:this.rollAttribute,rollAll:this.rollAll,rollResources:this.rollResources,rollEquipment:this.rollEquipment,finish:this.finish,openItem:this.openItem}};
 static PARTS={main:{template:'systems/berserkr-rpg/templates/generator.hbs',scrollable:['.wizard-content']}};
 constructor(actor,catalog){super();this.actor=actor;this.catalog=catalog;this.draft=foundry.utils.deepClone(actor.getFlag('berserkr-rpg','creationDraft')??{step:0,rolls:{},equipment:{runes:[]},name:'',biography:''});this.draft.step=Math.max(0,Math.min(4,Number(this.draft.step)||0));for(let n=0;n<this.draft.step;n++)if(!this.isStageComplete(n)){this.draft.step=n;break;}this.busy=false;}
 static async open(actor){if(!actor.isOwner)return ui.notifications.warn('Você precisa ser proprietário do ator.');const catalog=await loadCreationCatalog();return new this(actor,catalog).render({force:true});}
 get selectedClass(){return this.catalog.classes.find(c=>c.id===this.draft.classId);}
 get starter(){return STARTING[this.selectedClass?.name]??{};}
 get availableSkills(){const refs=this.selectedClass?.system.featureRefs.slice(1)??[];return this.catalog.abilities.filter(a=>refs.some(ref=>ref.endsWith('.'+a.id)));}
 isStageComplete(stage){
  if(!this.selectedClass||!this.availableSkills.some(a=>a.id===this.draft.skillId))return false;
  if(!validStage(this.draft,Math.min(stage,3)))return false;
  if(stage>=1&&!Object.keys(ATTRIBUTES).every(k=>this.draft.rolls[k].value===attributeModifier(this.draft.rolls[k].total)))return false;
  if(stage>=2&&!['hp','destinos','runes','food','water','coins'].every(k=>Number.isInteger(this.draft.resources?.[k])&&this.draft.resources[k]>=0))return false;
  if(stage>=3&&!this.validateEquipment())return false;
  if(stage>=4&&!this.draft.name?.trim())return false;
  return true;
 }
 requiredRuneCount(){const e=this.draft.equipment??{};const armor=this.catalog.equipment.find(x=>x.id===e.armor);return (this.starter.runes??0)+(e.transport==='hands'?1:0)+(armor?.system.category===1?1:0);}
 validateEquipment(){const e=this.draft.equipment??{};return e.runes?.length===this.requiredRuneCount()&&e.runes.every(id=>this.catalog.runes.some(r=>r.id===id))&&this.catalog.weapons.some(w=>w.id===e.weapon)&&this.catalog.first.some(w=>w.id===e.first)&&this.catalog.second.some(w=>w.id===e.second)&&['hands','pouch','sack'].includes(e.transport)&&this.catalog.equipment.some(w=>w.type==='armor'&&w.id===e.armor&&(!this.starter.armor||this.starter.items.includes(w.name)));}
 async save(){await this.actor.setFlag('berserkr-rpg','creationDraft',this.draft);}
 async refresh(){await this.save();await this.render({force:true});}
 async _prepareContext(){
  const d=this.draft,c=this.selectedClass,s=this.starter;
  const eq=d.equipment??{},opts=arr=>arr.map(x=>({id:x.id,name:x.name,selected:!!Object.values(eq).includes(x.id)}));
  const selectedSkill=this.availableSkills.find(a=>a.id===d.skillId);
  const armorOptions=s.armor?this.catalog.equipment.filter(x=>s.items.includes(x.name)&&x.type==='armor'):this.catalog.equipment.filter(x=>x.type==='armor'&&x.name!=='Armadura Divina'&&x.name!=='Cota de Malha Resistente');
  const needRunes=(s.runes??0)+(eq.transport==='hands'?1:0)+(armorOptions.find(x=>x.id===eq.armor)?.system.category===1?1:0);
  const selectedEquipment=['weapon','armor','first','second'].map(key=>this.catalog.equipment.find(x=>x.id===eq[key])).filter(Boolean);
  return {theme:themeForClass(c?.name),steps:STEPS.map((label,index)=>({number:index+1,label,current:index===d.step,done:index<d.step})),canAdvance:this.isStageComplete(d.step),hasResources:!!d.resources,stepNumber:d.step+1,stepTitle:STEPS[d.step],stepClass:d.step===0,stepAttributes:d.step===1,stepResources:d.step===2,stepEquipment:d.step===3,stepPersonal:d.step===4,canBack:d.step>0,isLast:d.step===4,progress:((d.step+1)/5)*100,draft:d,selectedEquipment,passive:this.catalog.abilities.find(a=>c?.system.featureRefs[0]?.endsWith('.'+a.id)),
   classes:this.catalog.classes.map(x=>({id:x.id,name:x.name,realm:x.system.realm,theme:themeForClass(x.name),selected:x.id===d.classId})),selectedClass:c,selectedSkill,
   skills:this.availableSkills.map(x=>({id:x.id,name:x.name.split(' — ')[0],description:x.system.description,selected:x.id===d.skillId})),
   attributes:Object.entries(ATTRIBUTES).map(([key,label])=>({key,label,bonus:c?.system.classModifiers[key]??0,bonusLabel:(c?.system.classModifiers[key]??0)>=0?'+'+(c?.system.classModifiers[key]??0):String(c.system.classModifiers[key]),...d.rolls?.[key],rolled:!!d.rolls?.[key]})),
   resourceRows:[['hp','PV',c?.system.hpFormula],['destinos','Destinos',c?.system.destinyFormula],['runes','Usos rúnicos','1d4 + Astúcia'],['food','Comida','1d4'],['water','Água','1d4'],['coins','Bugigangas',s.coins]].map(([key,label,formula])=>({key,label,formula:String(formula??'').replace(/@attributes\.(\w+)/g,(_,attribute)=>ATTRIBUTES[attribute]??attribute),value:d.resources?.[key]})),
   first:opts(this.catalog.first),second:opts(this.catalog.second),weapons:opts(this.catalog.weapons),armors:opts(armorOptions),hasClassArmor:!!s.armor,
   runeChoices:Array.from({length:needRunes},(_,i)=>({index:i,label:i<(s.runes??0)?'Runa da classe':(eq.transport==='hands'&&i===(s.runes??0)?'Runa por mãos vazias':'Runa por começar sem armadura'),choices:this.catalog.runes.map(r=>({id:r.id,name:r.name,selected:r.id===eq.runes?.[i]}))})),
   hands:eq.transport==='hands',pouch:eq.transport==='pouch',sack:eq.transport==='sack',starterNames:s.items?.join(', '),
   summary:Object.entries(ATTRIBUTES).map(([key,label])=>`${label} ${d.rolls?.[key]?.value??'—'}`).join(' · ')};
 }
 async capture(){
  if(!this.element)return;
  const fd=new FormData(this.element);
  if(this.draft.step===3){const e=this.draft.equipment;for(const key of ['weapon','armor','first','second','transport'])if(fd.has(key))e[key]=fd.get(key);e.runes=Array.from(fd.entries()).filter(([k])=>k.startsWith('rune-')).sort((a,b)=>Number(a[0].slice(5))-Number(b[0].slice(5))).map(([,v])=>v);}
  if(this.draft.step===4){this.draft.name=String(fd.get('name')??'').trim();this.draft.biography=String(fd.get('biography')??'');}
 }
 _onRender(context,options){super._onRender(context,options);this.element.querySelectorAll('select[data-equipment]').forEach(el=>el.addEventListener('change',async()=>{await this.capture();const count=this.requiredRuneCount();this.draft.equipment.runes=this.draft.equipment.runes.slice(0,count);while(this.draft.equipment.runes.length<count)this.draft.equipment.runes.push('');await this.refresh();}));}
 async _preClose(options){await this.capture();await this.save();return super._preClose(options);}
 static async selectClass(_event,target){
  if(this.busy)return;this.busy=true;
  try{if(this.draft.createdUuid)return ui.notifications.warn('Este rascunho já foi concluído.');if(this.draft.classId===target.dataset.id)return;if(!this.catalog.classes.some(c=>c.id===target.dataset.id))return;this.draft={step:0,classId:target.dataset.id,skillId:'',rolls:{},equipment:{runes:[]},name:this.draft.name??'',biography:this.draft.biography??''};await this.refresh();}finally{this.busy=false;}
 }
 static async selectSkill(_event,target){if(this.busy||!this.availableSkills.some(s=>s.id===target.dataset.id))return;this.draft.skillId=target.dataset.id;await this.refresh();}
 static async randomSkill(){if(this.busy||!this.selectedClass)return;this.busy=true;try{const n=(await new Roll('1d'+this.availableSkills.length).evaluate()).total;this.draft.skillId=this.availableSkills[n-1].id;await this.refresh();}finally{this.busy=false;}}
 async doRollAttribute(key){const roll=await new Roll('3d6').evaluate();const bonus=this.selectedClass.system.classModifiers[key];this.draft.rolls[key]={dice:roll.dice[0].results.map(r=>r.result).join(' + '),raw:roll.total,total:roll.total+bonus,value:attributeModifier(roll.total+bonus)};}
 static async rollAttribute(_event,target){if(this.busy)return;this.busy=true;try{await this.doRollAttribute(target.dataset.attribute);delete this.draft.resources;await this.refresh();}finally{this.busy=false;}}
 static async rollAll(){if(this.busy)return;this.busy=true;try{for(const key of Object.keys(ATTRIBUTES))await this.doRollAttribute(key);delete this.draft.resources;await this.refresh();}finally{this.busy=false;}}
 static async rollResources(){
  if(this.busy)return;this.busy=true;
   try{if(!this.isStageComplete(1))return ui.notifications.warn('Conclua os atributos.');const roll=async formula=>(await new Roll(formula,{attributes:Object.fromEntries(Object.entries(this.draft.rolls).map(([k,v])=>[k,v.value]))}).evaluate()).total;
   this.draft.resources={hp:Math.max(1,await roll(this.selectedClass.system.hpFormula)),destinos:await roll(this.selectedClass.system.destinyFormula),runes:resourceLimit(await roll('1d4 + @attributes.astucia')),food:await roll('1d4'),water:await roll('1d4'),coins:await roll(this.starter.coins)};
   await this.refresh();
  }finally{this.busy=false;}
 }
 static async rollEquipment(){
  if(this.busy)return;this.busy=true;
  try{const random=async arr=>arr[(await new Roll('1d'+arr.length).evaluate()).total-1];const e=this.draft.equipment;
   e.transport=['hands','pouch','sack'][Math.ceil((await new Roll('1d6').evaluate()).total/2)-1];
   e.weapon=(await random(this.catalog.weapons)).id;e.first=(await random(this.catalog.first)).id;e.second=(await random(this.catalog.second)).id;
   const category=(await new Roll('1d4').evaluate()).total;
   const pool=this.catalog.equipment.filter(x=>x.type==='armor'&&x.system.category===category&&!['Armadura Divina','Cota de Malha Resistente'].includes(x.name));
   const armor=this.starter.armor?this.catalog.equipment.find(x=>x.type==='armor'&&this.starter.items.includes(x.name)):await random(pool);
   // Sorteie a categoria uma única vez; a escolha do modelo dentro da categoria é livre.
   e.armor=armor.id;const count=(this.starter.runes??0)+(e.transport==='hands'?1:0)+(armor.system.category===1?1:0);
   e.runes=[];for(let i=0;i<count;i++)e.runes.push((await random(this.catalog.runes)).id);await this.refresh();
  }finally{this.busy=false;}
 }
 static async next(){if(this.busy)return;this.busy=true;try{await this.capture();if(!this.isStageComplete(this.draft.step))return ui.notifications.warn('Conclua todas as escolhas desta etapa.');this.draft.step=Math.min(4,this.draft.step+1);await this.refresh();}finally{this.busy=false;}}
 static async back(){if(this.busy)return;this.busy=true;try{await this.capture();this.draft.step=Math.max(0,this.draft.step-1);await this.refresh();}finally{this.busy=false;}}
 static async openItem(_event,target){const doc=[...this.catalog.equipment,...this.catalog.abilities,...this.catalog.runes,...this.catalog.classes].find(x=>x.id===target.dataset.id);if(doc)await doc.sheet.render({force:true});}
 async buildCharacterData(){
  const d=this.draft,c=this.selectedClass,e=d.equipment,r=foundry.utils.deepClone(d.resources),s=this.starter;
  if(!this.isStageComplete(4))throw new Error('Personagem incompleto.');
  const byId=id=>this.catalog.equipment.find(x=>x.id===id);const byName=name=>this.catalog.equipment.find(x=>x.name===name);const items=[];
  const push=(doc,overrides={})=>{if(!doc)throw new Error('Item inicial ausente.');const obj=clone(doc);Object.assign(obj.system,overrides);items.push(obj);};
  push(c);const passive=this.catalog.abilities.find(x=>c.system.featureRefs[0].endsWith('.'+x.id));push(passive);push(this.catalog.abilities.find(x=>x.id===d.skillId));
  for(const name of s.items)push(byName(name),{equipped:byName(name).type==='weapon'||byName(name).type==='armor'});
  push(byId(e.weapon),{equipped:true});if(!s.armor)push(byId(e.armor),{equipped:true});push(byId(e.first));push(byId(e.second));
  if(e.transport!=='hands')push(byName(e.transport==='pouch'?'Algibeira de Couro':'Saco de Tecido'));
  push(byName('Comida'),{quantity:r.food,slots:0,consumable:'food',uses:r.food});push(byName('Odre'),{quantity:1,consumable:'water',uses:r.water});
  for(let i=0;i<e.runes.length;i++)push(this.catalog.runes.find(x=>x.id===e.runes[i]),{runeMode:i<(s.runes??0)?s.runeMode:'both'});
  for(const i of items){if(i.name==='Ervas Medicinais do Guardião'){i.system.uses=(await new Roll('1d6').evaluate()).total;i.system.healing='1d4';}if(i.name==='Granadas de Luz')i.system.uses=(await new Roll('1d4').evaluate()).total;if(i.name==='Algibeira de Couro Desgastada')r.coins+=(await new Roll('3d6*10').evaluate()).total;}
  return {name:d.name,type:'character',img:themeForClass(c.name).generatorArt,system:{attributes:Object.fromEntries(Object.entries(d.rolls).map(([k,v])=>[k,v.value])),hp:{value:r.hp,max:r.hp},destinos:{value:r.destinos,max:r.destinos},runes:{value:r.runes,max:r.runes},className:c.name,realm:c.system.realm,biography:d.biography,saga:'',bugigangas:r.coins,source:c.system.source,hpFormula:c.system.hpFormula,destinyFormula:c.system.destinyFormula},items,flags:{'berserkr-rpg':{creationComplete:true,creationRolls:d.rolls,classTheme:themeForClass(c.name).id}}};
 }
 static async finish(){
  if(this.busy)return;this.busy=true;
  try{await this.capture();await this.save();if(this.draft.createdUuid)return ui.notifications.warn('Este rascunho já foi concluído. Abra o personagem criado.');
   if(this.draft.step!==4)throw new Error('Conclua as etapas em sequência.');const data=await this.buildCharacterData();
   if(this.fromDirectory){if(!game.user.can('ACTOR_CREATE'))throw new Error('Você não tem permissão para criar personagens.');data.ownership={default:0,[game.user.id]:CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};}
   // Criação única evita sobrescrever fichas e inventários existentes.
   const created=await Actor.create(data);if(!created)throw new Error("A criação não foi concluída. Confira os erros de validação; seu rascunho permanece salvo.");this.draft.createdUuid=created.uuid;await this.save();await this.close();await created.sheet.render({force:true});ui.notifications.info(this.fromDirectory?'Personagem criado na aba Atores.':'Personagem criado. A ficha de origem foi preservada.');
  }catch(error){console.error(error);ui.notifications.error(error.message);}finally{this.busy=false;}
 }
}
